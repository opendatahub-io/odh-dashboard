#!/usr/bin/env python3
"""Capture images attached to a GitHub PR description or issue comments.

Runs on the review host, before the sandbox starts. It writes a sanitized
manifest, the image files, and a tarball for the sandbox. The review fails
open: every capture problem becomes a manifest entry or a `::warning::`, and
the review continues without images.

Only GitHub media hosts are fetched. URLs are validated before the request
and again on every redirect.

Image bytes are always fetched WITHOUT credentials: no Authorization header
is ever attached to a media request, so the review token cannot leak to a
redirect target or a media host. Private-repo attachments are embedded in the
body as signed `private-user-images.githubusercontent.com` URLs, which need no
token. The token from the environment is used only to list issue comments on
the GitHub API; a media URL that requires auth simply lands in `skipped`.

Usage (normally through fetch-pr-images.sh):
  fetch_pr_images.py --body-file body.md --repo owner/repo --pr-number 42
  fetch_pr_images.py --self-test
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import shutil
import struct
import sys
import tarfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable, Optional

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUT_DIR = SCRIPT_DIR.parent / ".run"
MANIFEST_NAME = "pr-images.json"
TARBALL_NAME = "pr-images.tar.gz"
IMAGE_DIR_NAME = "pr-images"
IMAGE_PREFIX = "pr-image-"
USER_AGENT = "odh-dashboard-fullsend-review/1"

# Hosts GitHub serves PR media from, plus the hosts it redirects attachments
# to. Keep this narrow: every redirect hop is checked here, and media requests
# carry no credentials at all.
_EXACT_HOSTS = {
    "github.com",
    "user-images.githubusercontent.com",
    "private-user-images.githubusercontent.com",
    "objects.githubusercontent.com",
    "media.githubusercontent.com",
    # Repo-hosted media pasted from a fork branch, e.g. raw.githubusercontent
    # .com/<owner>/<repo>/<branch>/docs/screenshot.png. Common in PR bodies
    # that carry before/after screenshots from a UX branch.
    "raw.githubusercontent.com",
}
_S3_ASSET_HOST = re.compile(r"^github-production-user-asset-[0-9a-f]+\.s3\.amazonaws\.com$")
_IMAGE_SUFFIX = re.compile(r"\.(?:png|jpe?g|gif|webp)$", re.IGNORECASE)
_GITHUB_ASSET_PATH = re.compile(r"^/user-attachments/assets/[^/]+$")
_GITHUB_REPO_ASSET_PATH = re.compile(r"^/[^/]+/[^/]+/assets/[^/]+$")

_MD_IMAGE = re.compile(
    r"!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+(?:\"([^\"]*)\"|'([^']*)'))?\s*\)"
)
_HTML_IMG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
_HTML_ATTR = re.compile(
    r"([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))"
)
_REF_DEFINITION = re.compile(
    r"^\[([^\]]+)\]:\s*<?(https://[^\s>]+?)>?(?:\s+(?:\"[^\"]*\"|'[^']*'))?\s*$",
    re.MULTILINE,
)
_REF_IMAGE = re.compile(r"!\[([^\]]*)\]\[([^\]]*)\]")
_BARE_URL = re.compile(
    r"https://(?:"
    r"github\.com/(?:user-attachments/assets/|[^/\s]+/[^/\s]+/assets/)[^\s<>\"')\]]+"
    r"|(?:private-)?user-images\.githubusercontent\.com/[^\s<>\"')\]]+"
    r"|objects\.githubusercontent\.com/[^\s<>\"')\]]+"
    r"|media\.githubusercontent\.com/[^\s<>\"')\]]+"
    r"|raw\.githubusercontent\.com/[^\s<>\"')\]]+\.(?:png|jpe?g|gif|webp)"
    r")"
)
_TRAILING_PUNCTUATION = ".,;:!?"

_CONTROL = re.compile(r"[\x00-\x1f\x7f]")


@dataclass
class Limits:
    # 12 covers the before/after tables seen in real PRs (largest legitimate
    # sets were 14, 12, 10); the total-byte cap is the real bound.
    max_images: int = 12
    max_image_bytes: int = 8 * 1024 * 1024
    max_total_bytes: int = 24 * 1024 * 1024
    max_dimension: int = 8192
    max_pixels: int = 40_000_000
    timeout: float = 20.0

    @classmethod
    def from_env(cls) -> "Limits":
        def number(name: str, default):
            raw = os.environ.get(name, "").strip()
            if not raw:
                return default
            try:
                return type(default)(raw)
            except ValueError:
                return default

        return cls(
            max_images=number("REVIEW_PR_IMAGES_MAX", cls.max_images),
            max_image_bytes=number("REVIEW_PR_IMAGE_MAX_BYTES", cls.max_image_bytes),
            max_total_bytes=number("REVIEW_PR_IMAGES_MAX_BYTES", cls.max_total_bytes),
            max_dimension=number("REVIEW_PR_IMAGE_MAX_DIMENSION", cls.max_dimension),
            max_pixels=number("REVIEW_PR_IMAGE_MAX_PIXELS", cls.max_pixels),
            timeout=number("REVIEW_PR_IMAGE_TIMEOUT", cls.timeout),
        )


@dataclass
class Media:
    url: str
    caption: str = ""
    origin: str = "body"


@dataclass
class CaptureResult:
    manifest: dict
    warnings: list = field(default_factory=list)


# ---------------------------------------------------------------------------
# URL extraction and validation
# ---------------------------------------------------------------------------
def _clean_url(raw: str) -> str:
    return html.unescape(raw.strip()).rstrip(_TRAILING_PUNCTUATION)


def _caption(raw: str) -> str:
    text = html.unescape(raw or "")
    text = _CONTROL.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()[:200]


def extract_media(text: str, origin: str = "body") -> list:
    """Return attached images in document order, deduplicated by URL."""
    if not text:
        return []

    found = []
    references = {
        name.strip().lower(): _clean_url(url)
        for name, url in _REF_DEFINITION.findall(text)
    }
    for match in _MD_IMAGE.finditer(text):
        caption = match.group(1) or match.group(3) or match.group(4) or ""
        found.append((match.start(), _clean_url(match.group(2)), _caption(caption)))

    for match in _HTML_IMG.finditer(text):
        attrs = {}
        for attr in _HTML_ATTR.finditer(match.group(0)):
            name = attr.group(1).lower()
            value = attr.group(2) or attr.group(3) or attr.group(4) or ""
            attrs[name] = value
        src = attrs.get("src")
        if src:
            found.append((match.start(), _clean_url(src), _caption(attrs.get("alt", ""))))

    for match in _REF_IMAGE.finditer(text):
        label = (match.group(2) or match.group(1)).strip().lower()
        url = references.get(label)
        if url:
            found.append((match.start(), url, _caption(match.group(1))))

    for match in _BARE_URL.finditer(text):
        found.append((match.start(), _clean_url(match.group(0)), ""))

    found.sort(key=lambda item: item[0])
    media = []
    seen = set()
    for _, url, caption in found:
        if not url or url in seen:
            continue
        seen.add(url)
        media.append(Media(url=url, caption=caption, origin=origin))
    return media


def url_allowed(url: str) -> bool:
    try:
        parts = urllib.parse.urlsplit(url)
    except ValueError:
        return False
    if parts.scheme != "https" or not parts.hostname:
        return False
    host = parts.hostname.lower()
    if host == "github.com":
        path = parts.path or ""
        return bool(_GITHUB_ASSET_PATH.match(path) or _GITHUB_REPO_ASSET_PATH.match(path))
    if host == "raw.githubusercontent.com":
        # raw serves any file from any repo, so require an image suffix here
        # rather than spending a fetch to discover it is not an image.
        return bool(_IMAGE_SUFFIX.search(parts.path or ""))
    if host in _EXACT_HOSTS:
        return True
    return bool(_S3_ASSET_HOST.match(host))


# ---------------------------------------------------------------------------
# Image sniffing
# ---------------------------------------------------------------------------
def _png(data: bytes):
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    width, height = struct.unpack(">II", data[16:24])
    return width, height, False


def _gif(data: bytes):
    if len(data) < 10 or data[:6] not in (b"GIF87a", b"GIF89a"):
        return None
    width, height = struct.unpack("<HH", data[6:10])
    animated = data.count(b"\x00\x21\xf9\x04") > 1
    return width, height, animated


def _jpeg(data: bytes):
    if len(data) < 4 or data[:3] != b"\xff\xd8\xff":
        return None
    index = 2
    while index + 9 < len(data):
        if data[index] != 0xFF:
            index += 1
            continue
        marker = data[index + 1]
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            index += 2
            continue
        length = struct.unpack(">H", data[index + 2:index + 4])[0]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            if index + 9 > len(data):
                return None
            height, width = struct.unpack(">HH", data[index + 5:index + 9])
            return width, height, False
        if length < 2:
            return None
        index += 2 + length
    return None


def _webp(data: bytes):
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    chunk = data[12:16]
    if chunk == b"VP8X":
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
        return width, height, False
    if chunk == b"VP8L" and len(data) >= 25 and data[20] == 0x2F:
        bits = int.from_bytes(data[21:25], "little")
        width = (bits & 0x3FFF) + 1
        height = ((bits >> 14) & 0x3FFF) + 1
        return width, height, False
    if chunk == b"VP8 " and len(data) >= 30:
        width = struct.unpack("<H", data[26:28])[0] & 0x3FFF
        height = struct.unpack("<H", data[28:30])[0] & 0x3FFF
        return width, height, False
    return None


def sniff_image(data: bytes):
    """Return (extension, width, height, animated) or None when not an image."""
    for extension, parser in (("png", _png), ("gif", _gif), ("jpg", _jpeg), ("webp", _webp)):
        parsed = parser(data)
        if parsed:
            width, height, animated = parsed
            return extension, width, height, animated
    return None


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------
class _ValidatingRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not url_allowed(newurl):
            raise RuntimeError("redirect-host-not-allowlisted")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _loggable(url: str) -> str:
    """URL for logs. Drops query/fragment, which can carry signed tokens
    (`private-user-images` URLs embed `?jwt=`). The manifest keeps the full
    URL because it is the join key back to the PR body."""
    parts = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def _request_for(url: str) -> urllib.request.Request:
    """Media request. Deliberately credential-free: no Authorization header."""
    headers = {"User-Agent": USER_AGENT, "Accept": "image/*,*/*;q=0.8"}
    return urllib.request.Request(url, headers=headers)


def fetch_media(url: str, timeout: float, max_bytes: int):
    """Return image bytes, or raise RuntimeError with a skip reason.

    Never receives a token, so private media that needs auth is skipped
    rather than fetched with credentials.
    """
    if not url_allowed(url):
        raise RuntimeError("host-not-allowlisted")
    opener = urllib.request.build_opener(_ValidatingRedirect())
    try:
        with opener.open(_request_for(url), timeout=timeout) as response:
            final_url = response.geturl()
            if not url_allowed(final_url):
                raise RuntimeError("redirect-host-not-allowlisted")
            data = response.read(max_bytes + 1)
    except urllib.error.HTTPError as error:
        raise RuntimeError("http-{}".format(error.code)) from error
    except urllib.error.URLError as error:
        reason = getattr(error, "reason", error)
        raise RuntimeError("fetch-failed: {}".format(reason)) from error
    except TimeoutError as error:
        raise RuntimeError("timeout") from error
    if len(data) > max_bytes:
        raise RuntimeError("image-too-large")
    return data


# ---------------------------------------------------------------------------
# Sandbox ingress: manifest + tarball
# ---------------------------------------------------------------------------
def write_ingress(out_dir: Path, manifest: dict, files: list) -> None:
    image_dir = out_dir / IMAGE_DIR_NAME
    image_dir.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(manifest, indent=2) + "\n"
    (image_dir / "manifest.json").write_text(serialized, encoding="utf-8")
    (out_dir / MANIFEST_NAME).write_text(serialized, encoding="utf-8")

    tarball = out_dir / TARBALL_NAME
    with tarfile.open(tarball, "w:gz") as archive:
        archive.add(image_dir / "manifest.json", arcname="manifest.json")
        for path in files:
            archive.add(path, arcname=path.name)


def capture(
    body: str,
    comments: Iterable[Media],
    fetch: Callable[[str], bytes],
    out_dir: Path,
    limits: Limits,
    repo: str = "",
    pr_number: Optional[int] = None,
    head_sha: str = "",
) -> CaptureResult:
    """Capture every allowed attachment. Never raises for a media failure."""
    media = extract_media(body) + list(comments)
    seen = set()
    ordered = []
    for item in media:
        if item.url in seen:
            continue
        seen.add(item.url)
        ordered.append(item)

    warning_lines = []
    manifest = {
        "schema": 1,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pr": {"repo": repo, "number": pr_number, "head_sha": head_sha},
        "status": "empty",
        "images": [],
        "skipped": [],
    }

    image_dir = out_dir / IMAGE_DIR_NAME
    image_dir.mkdir(parents=True, exist_ok=True)
    files = []
    total_bytes = 0
    index = 0

    def skip(item: Media, reason: str) -> None:
        manifest["skipped"].append({"url": item.url, "reason": reason})

    for item in ordered:
        if index >= limits.max_images:
            skip(item, "image-limit")
            continue
        if not url_allowed(item.url):
            skip(item, "host-not-allowlisted")
            continue
        try:
            data = fetch(item.url)
        except Exception as error:  # noqa: BLE001 - fail open on any fetch problem
            skip(item, str(error))
            continue

        if len(data) > limits.max_image_bytes:
            skip(item, "image-too-large")
            continue
        if total_bytes + len(data) > limits.max_total_bytes:
            skip(item, "total-bytes-limit")
            continue
        sniffed = sniff_image(data)
        if not sniffed:
            skip(item, "not-a-supported-image")
            continue
        extension, width, height, animated = sniffed
        if animated:
            skip(item, "animated-gif-unsupported")
            continue
        if width > limits.max_dimension or height > limits.max_dimension:
            skip(item, "dimension-limit")
            continue
        if width * height > limits.max_pixels:
            skip(item, "pixel-limit")
            continue

        index += 1
        name = "{}{}.{}".format(IMAGE_PREFIX, index, extension)
        path = image_dir / name
        path.write_bytes(data)
        files.append(path)
        total_bytes += len(data)
        manifest["images"].append(
            {
                "index": index,
                "path": name,
                "source_url": item.url,
                "caption": item.caption,
                "origin": item.origin,
                "bytes": len(data),
                "width": width,
                "height": height,
                "sha256": hashlib.sha256(data).hexdigest(),
            }
        )

    if manifest["images"]:
        manifest["status"] = "partial" if manifest["skipped"] else "ok"
    elif ordered:
        manifest["status"] = "error"
    if manifest["status"] == "error":
        warning_lines.append("no PR images could be captured (see skipped reasons)")
    write_ingress(out_dir, manifest, files)
    return CaptureResult(manifest=manifest, warnings=warning_lines)


# ---------------------------------------------------------------------------
# GitHub comments
# ---------------------------------------------------------------------------
def fetch_comments(repo: str, pr_number: Optional[int], token: str, timeout: float) -> list:
    if not repo or not pr_number:
        return []
    comments = []
    url = "https://api.github.com/repos/{}/issues/{}/comments?per_page=100".format(repo, pr_number)
    opener = urllib.request.build_opener()
    pages = 0
    while url and pages < 5:
        pages += 1
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/vnd.github+json",
                **({"Authorization": "Bearer {}".format(token)} if token else {}),
            },
        )
        try:
            with opener.open(request, timeout=timeout) as response:
                payload = json.loads(response.read().decode("utf-8") or "[]")
                link = response.headers.get("Link", "")
        except (urllib.error.URLError, TimeoutError, ValueError):
            break
        if not isinstance(payload, list):
            break
        for comment in payload:
            if not isinstance(comment, dict):
                continue
            user = comment.get("user") or {}
            if user.get("type") == "Bot":
                continue
            body = comment.get("body") or ""
            identifier = comment.get("id", "unknown")
            comments.extend(extract_media(body, "comment:{}".format(identifier)))
        next_url = ""
        for part in link.split(","):
            if 'rel="next"' in part:
                next_url = part.split(";")[0].strip().strip("<>")
        url = next_url
    return comments


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def _read_body(args) -> str:
    if args.body_file:
        return Path(args.body_file).read_text(encoding="utf-8", errors="replace")
    if args.body is not None:
        return args.body
    return os.environ.get("REVIEW_PR_BODY", "")


def _self_test() -> int:
    failures = []

    def check(name, condition):
        if condition:
            print("PASS {}".format(name))
        else:
            print("FAIL {}".format(name), file=sys.stderr)
            failures.append(name)

    text = (
        '![dark glass](https://github.com/user-attachments/assets/aaa) '
        "<img alt='panel' src=\"https://github.com/user-attachments/assets/bbb\"> "
        "https://github.com/user-attachments/assets/ccc"
    )
    media = extract_media(text)
    check("extract: three attachments", len(media) == 3)
    check("extract: markdown caption", media[0].caption == "dark glass")
    check("extract: html caption", media[1].caption == "panel")
    check("allowlist: user attachment", url_allowed("https://github.com/user-attachments/assets/x"))
    check("allowlist: repo asset", url_allowed("https://github.com/o/r/assets/x"))
    check("allowlist: s3 redirect", url_allowed(
        "https://github-production-user-asset-1a2b.s3.amazonaws.com/1/x.png?sig=1"
    ))
    check("allowlist: raw repo image", url_allowed(
        "https://raw.githubusercontent.com/o/r/branch/docs/shot.png"
    ))
    check("allowlist: raw non-image rejected", not url_allowed(
        "https://raw.githubusercontent.com/o/r/branch/docs/index.html"
    ))
    check("log line drops signed query", "jwt=" not in _loggable(
        "https://private-user-images.githubusercontent.com/1/x.png?jwt=abc"
    ))
    check("media request carries no credentials", all(
        "Authorization" not in _request_for(url).headers
        for url in (
            "https://raw.githubusercontent.com/o/r/branch/docs/shot.png",
            "https://github.com/user-attachments/assets/x",
        )
    ))
    check("allowlist: rejects http", not url_allowed("http://github.com/user-attachments/assets/x"))
    check("allowlist: rejects lookalike", not url_allowed("https://github.com.evil/x"))
    check("sniff: png", sniff_image(
        b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\x0dIHDR" + struct.pack(">II", 10, 20) + b"\x00" * 5
    )[:3] == ("png", 10, 20))
    check("sniff: rejects text", sniff_image(b"not an image") is None)

    print("{} failure(s)".format(len(failures)))
    return 1 if failures else 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--body")
    parser.add_argument("--body-file")
    parser.add_argument("--repo", default=os.environ.get("REPO", ""))
    parser.add_argument("--pr-number", type=int, default=os.environ.get("PR_NUMBER") or None)
    parser.add_argument("--head-sha", default=os.environ.get("PR_HEAD_SHA", ""))
    parser.add_argument("--out-dir", default=os.environ.get("REVIEW_PR_IMAGES_OUT", str(DEFAULT_OUT_DIR)))
    parser.add_argument("--no-comments", action="store_true")
    parser.add_argument("--strict", action="store_true", help="exit non-zero when capture fails")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)

    if args.self_test:
        return _self_test()

    out_dir = Path(args.out_dir)
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        image_dir = out_dir / IMAGE_DIR_NAME
        if image_dir.exists():
            shutil.rmtree(image_dir)
        for stale in (out_dir / MANIFEST_NAME, out_dir / TARBALL_NAME):
            if stale.exists():
                stale.unlink()

        # The token is used only to list issue comments on the GitHub API.
        # Media is fetched without credentials (see fetch_media).
        comments_token = os.environ.get("REVIEW_TOKEN") or os.environ.get("GH_TOKEN") or ""
        limits = Limits.from_env()
        comments = []
        if not args.no_comments:
            comments = fetch_comments(args.repo, args.pr_number, comments_token, limits.timeout)
        result = capture(
            _read_body(args),
            comments,
            lambda url: fetch_media(url, limits.timeout, limits.max_image_bytes),
            out_dir,
            limits,
            repo=args.repo,
            pr_number=args.pr_number,
            head_sha=args.head_sha,
        )
    except Exception as error:  # noqa: BLE001 - the review must not fail here
        print("::warning::PR image capture failed: {}".format(error))
        if args.strict:
            return 1
        return 0

    manifest = result.manifest
    print(
        "PR images: status={} captured={} skipped={}".format(
            manifest["status"], len(manifest["images"]), len(manifest["skipped"])
        )
    )
    for entry in manifest["skipped"]:
        print("::notice::PR image skipped: {} ({})".format(_loggable(entry["url"]), entry["reason"]))
    for warning in result.warnings:
        print("::warning::{}".format(warning))
    if args.strict and manifest["status"] == "error":
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
