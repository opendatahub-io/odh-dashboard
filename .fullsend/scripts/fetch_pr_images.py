#!/usr/bin/env python3
"""Capture images attached to a GitHub PR description.

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
token. A media URL that requires auth simply lands in `skipped`.

The PR description is the only media source for a review. Images attached to
issue comments are NOT captured: review evidence must come from the PR body
the author wrote, not from later discussion. `--comments` exists for local
debugging only and must not be used by the review pipeline.

Recordings (mp4, mov, webm, mkv, avi, mpeg, ogv) are catalogued in the
manifest's `videos` list with their container and declared size. Their body is
not read: the container comes from the redirect's `Content-Type` before the
first byte, and only a response that declares no media type falls back to a
4 KB container-magic probe. Their bytes are never stored either, because the
review cannot inspect frames and a recording must not consume the image budget
or the capture window.

Usage (normally through fetch-pr-images.sh):
  fetch_pr_images.py --body-file body.md
  fetch_pr_images.py --self-test
"""

from __future__ import annotations

import argparse
import bisect
import contextlib
import hashlib
import html
import json
import os
import re
import shutil
import signal
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
_IMAGE_SUFFIX = re.compile(r"\.(?:png|jpe?g|gif)$", re.IGNORECASE)
_GITHUB_ASSET_PATH = re.compile(r"^/user-attachments/assets/[^/]+$")
# Repository asset URLs: modern paste form `/<owner>/<repo>/assets/<uuid>`
# and the historical attachment form that adds an uploader id between
# `assets/` and the asset uuid.
_GITHUB_REPO_ASSET_PATH = re.compile(r"^/[^/]+/[^/]+/assets/[^/]+(?:/[^/]+)?$")

# Every quantifier that can start at many offsets in an untrusted body is
# bounded, so extraction stays linear in the body length. `![` repeated with no
# closing bracket used to re-scan the whole suffix from each opening marker,
# which let a PR body or comment burn host CPU before any capture budget
# applied. 512 characters is far past the 200-character caption truncation, so
# the bound costs no realistic caption; 4096 covers signed `private-user-images`
# URLs without truncating a token into a bogus candidate. 8192 bounds an HTML
# tag, and 64 an attribute name.
_MD_IMAGE = re.compile(
    r"!\[([^\]]{0,512})\]\(\s*<?([^)\s>]{1,4096})(?![^)\s>])>?"
    r"(?:\s+(?:\"([^\"]{0,512})\"|'([^']{0,512})'))?\s*\)"
)
_HTML_IMG = re.compile(r"<img\b[^>]{0,8192}>", re.IGNORECASE)
_HTML_ATTR = re.compile(
    r"([A-Za-z_:][-A-Za-z0-9_:.]{0,64})\s*=\s*"
    r"(?:\"([^\"]{0,8192})\"|'([^']{0,8192})'|([^\s>]{1,4096}))"
)
_REF_DEFINITION = re.compile(
    r"^\[([^\]]{1,512})\]:\s*<?(https://[^\s>]+?)>?(?:\s+(?:\"[^\"]*\"|'[^']*'))?\s*$",
    re.MULTILINE,
)
_REF_IMAGE = re.compile(r"!\[([^\]]{0,512})\]\[([^\]]{0,512})\]")
# Shortcut reference (`![shot]`), which CommonMark resolves against a link
# definition. The lookahead keeps inline images (`![a](url)`) and full /
# collapsed references (`![a][ref]`, `![a][]`) out, so each form is matched by
# exactly one pattern.
_REF_SHORTCUT = re.compile(r"!\[([^\]]{0,512})\](?!\(|\[)")
# Path portions are capped (4096 characters, 1024 for `raw`): generous for
# signed `private-user-images` URLs, and enough to keep the greedy scan, which
# backtracks looking for an image suffix, bounded per match.
_BARE_URL = re.compile(
    r"https://(?:"
    r"github\.com/(?:user-attachments/assets/|[^/\s]+/[^/\s]+/assets/)[^\s<>\"')\]]{1,4096}"
    r"|(?:private-)?user-images\.githubusercontent\.com/[^\s<>\"')\]]{1,4096}"
    r"|objects\.githubusercontent\.com/[^\s<>\"')\]]{1,4096}"
    r"|media\.githubusercontent\.com/[^\s<>\"')\]]{1,4096}"
    r"|raw\.githubusercontent\.com/[^\s<>\"')\]]{1,1024}\.(?:png|jpe?g|gif)"
    r")"
)
_TRAILING_PUNCTUATION = ".,;:!?"

# C0/C1 controls plus the Unicode line and paragraph separators. Every
# single-line guarantee here depends on this set: `\s` already covers them for
# the whitespace-collapsing sanitizers, but URL cleaning truncates on a match,
# and a raw U+2028 inside a JSON string still renders as a line break in a
# consumer that splits on Unicode line terminators.
_CONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f\u2028\u2029]")


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
    # Independent fetch-attempt budget. Rejected, failed, or unsupported
    # images still cost a request, so cap attempts separately from the
    # accepted-image count; this bounds work when a PR carries many stale or
    # unusable links.
    max_attempts: int = 24
    # Wall-clock ceiling for the whole capture. pre-review.sh waits on this
    # step, so it must fail open promptly instead of serializing timeouts.
    capture_timeout: float = 120.0

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
            max_attempts=number("REVIEW_PR_IMAGES_MAX_ATTEMPTS", cls.max_attempts),
            capture_timeout=number("REVIEW_PR_IMAGES_MAX_SECONDS", cls.capture_timeout),
        )


@dataclass
class Media:
    url: str
    caption: str = ""
    origin: str = "body"
    # Sanitized text of the originating issue comment, when the image came
    # from the thread rather than the PR body. Staged as untrusted context so
    # a comment-only image keeps the author's framing.
    context: str = ""


@dataclass
class CaptureResult:
    manifest: dict
    warnings: list = field(default_factory=list)


# ---------------------------------------------------------------------------
# URL extraction and validation
# ---------------------------------------------------------------------------
def _clean_url(raw: str) -> str:
    """Normalized URL, cut at the first control character.

    HTML entities are decoded first, so `&#10;` becomes a newline and `&#8232;`
    a line separator; raw control and line-break characters cannot appear in a
    URL, and keeping them would put author text into manifest fields that other
    layers render. Truncating leaves a clean join key for everything the author
    actually wrote as a URL.
    """
    text = html.unescape(raw or "").strip()
    control = _CONTROL.search(text)
    if control:
        text = text[: control.start()]
    return text.rstrip(_TRAILING_PUNCTUATION)


def _single_line(raw, limit: int = 200) -> str:
    """Collapse a value to one line of bounded length.

    Used for every field that leaves this script for a line-oriented consumer:
    captions, comment context, and skip reasons.
    """
    text = _CONTROL.sub(" ", str(raw or ""))
    return re.sub(r"\s+", " ", text).strip()[:limit]


def _caption(raw: str) -> str:
    return _single_line(html.unescape(raw or ""))


def _comment_context(raw: str) -> str:
    """Sanitized comment text used to frame a comment-origin image."""
    return _single_line(raw, limit=2000)


def extract_media(text: str, origin: str = "body") -> list:
    """Return attached images in document order, deduplicated by URL."""
    if not text:
        return []

    found = []
    # Spans that already own their URL. The bare-URL sweep must not re-add a
    # URL from inside them: its ``raw.githubusercontent.com`` branch stops at
    # the image extension, so ``...shot.png?raw=true`` would come back as a
    # second, query-stripped candidate that exact-string dedupe cannot collapse
    # and that burns a second image slot.
    spans = []

    # CommonMark resolves a duplicate label to its first definition, so keep
    # the first URL for a label instead of letting a later definition win.
    references = {}
    for match in _REF_DEFINITION.finditer(text):
        references.setdefault(match.group(1).strip().lower(), _clean_url(match.group(2)))
        spans.append((match.start(), match.end()))

    for match in _MD_IMAGE.finditer(text):
        caption = match.group(1) or match.group(3) or match.group(4) or ""
        found.append((match.start(), _clean_url(match.group(2)), _caption(caption)))
        spans.append((match.start(), match.end()))

    for match in _HTML_IMG.finditer(text):
        attrs = {}
        for attr in _HTML_ATTR.finditer(match.group(0)):
            name = attr.group(1).lower()
            value = attr.group(2) or attr.group(3) or attr.group(4) or ""
            attrs[name] = value
        src = attrs.get("src")
        if src:
            found.append((match.start(), _clean_url(src), _caption(attrs.get("alt", ""))))
            spans.append((match.start(), match.end()))

    # Full and collapsed references name their label in group 2; a shortcut
    # reference uses group 1, which is also the collapsed fallback.
    for pattern, label_group in ((_REF_IMAGE, 2), (_REF_SHORTCUT, 1)):
        for match in pattern.finditer(text):
            label = (match.group(label_group) or match.group(1)).strip().lower()
            url = references.get(label)
            if url:
                found.append((match.start(), url, _caption(match.group(1))))
                spans.append((match.start(), match.end()))

    spans.sort()
    span_starts = [start for start, _ in spans]
    # Spans may overlap (a structured image can sit inside another match), so
    # track the furthest end reached so far rather than each span's own end.
    span_reach = []
    reach = 0
    for _, end in spans:
        reach = max(reach, end)
        span_reach.append(reach)

    def covered(position: int) -> bool:
        """True when ``position`` sits inside a structured image span."""
        index = bisect.bisect_right(span_starts, position) - 1
        return index >= 0 and position < span_reach[index]

    for match in _BARE_URL.finditer(text):
        if covered(match.start()):
            continue
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


def _skip_gif_sub_blocks(data: bytes, pos: int) -> int:
    """Advance past a run of GIF sub-blocks ending in a zero-length terminator."""
    while pos < len(data):
        size = data[pos]
        pos += 1
        if size == 0:
            break
        pos += size
    return pos


def _gif_descriptors(data: bytes):
    """Walk GIF blocks and describe the frames.

    Returns ``(frame_count, max_width, max_height)``, where the sizes are the
    largest right and bottom extents of any image descriptor (``left + width``,
    ``top + height``), or ``None`` when the stream is malformed. The logical
    screen alone is not a bound: a descriptor can declare frame dimensions and
    offsets far beyond it.
    """
    if len(data) < 13:
        return None
    packed = data[10]
    pos = 13
    if packed & 0x80:  # global color table present
        pos += 3 * (1 << ((packed & 0x07) + 1))
    frames = 0
    max_width = 0
    max_height = 0
    while pos < len(data):
        block = data[pos]
        if block == 0x3B:  # trailer
            break
        if block == 0x21:  # extension: skip introducer, label, and sub-blocks
            pos = _skip_gif_sub_blocks(data, pos + 2)
        elif block == 0x2C:  # image descriptor
            if pos + 10 > len(data):
                return None
            left, top, width, height = struct.unpack("<HHHH", data[pos + 1:pos + 9])
            ipacked = data[pos + 9]
            pos += 10
            if ipacked & 0x80:  # local color table present
                pos += 3 * (1 << ((ipacked & 0x07) + 1))
            if pos >= len(data):
                return None
            pos = _skip_gif_sub_blocks(data, pos + 1)  # skip LZW min code size
            frames += 1
            max_width = max(max_width, left + width)
            max_height = max(max_height, top + height)
        else:
            return None
    return frames, max_width, max_height


def _gif_frame_count(data: bytes) -> int:
    """Count image frames by walking GIF blocks. Returns -1 when malformed."""
    descriptors = _gif_descriptors(data)
    return -1 if descriptors is None else descriptors[0]


def _gif(data: bytes):
    if len(data) < 13 or data[:6] not in (b"GIF87a", b"GIF89a"):
        return None
    width, height = struct.unpack("<HH", data[6:10])
    descriptors = _gif_descriptors(data)
    if descriptors is None:
        return None
    frames, frame_right, frame_bottom = descriptors
    if frames < 1:
        return None
    # Report the union of the logical screen and every descriptor extent so the
    # ingress dimension and pixel limits also cover frames a small logical
    # screen would hide.
    return max(width, frame_right), max(height, frame_bottom), frames > 1


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


# Supported formats are deliberately limited to what PR evidence actually
# uses: GitHub turns a pasted screenshot into PNG, and exported before/after
# captures are PNG, JPEG, or GIF. Anything else (WebP, AVIF, BMP, SVG) is
# skipped as unsupported rather than half-supported.
def sniff_image(data: bytes):
    """Return (extension, width, height, animated) or None when not an image."""
    for extension, parser in (("png", _png), ("gif", _gif), ("jpg", _jpeg)):
        parsed = parser(data)
        if parsed:
            width, height, animated = parsed
            return extension, width, height, animated
    return None


# ISO-BMFF major/compatible brands that denote video. HEIF/AVIF still images
# share the same `ftyp` box, so they are listed separately and never promoted
# to video.
_ISO_VIDEO_BRANDS = {
    b"isom", b"iso2", b"iso4", b"iso5", b"iso6",
    b"mp41", b"mp42", b"avc1", b"dash",
    b"M4V ", b"M4VH", b"M4VP", b"mmp4", b"MSNV",
    b"F4V ", b"F4P ",
    b"3gp4", b"3gp5", b"3gp6", b"3gs6", b"3ge6", b"3gg6", b"3gp7", b"3g2a",
}
_STILL_IMAGE_BRANDS = {
    b"heic", b"heix", b"heim", b"heis", b"hevc", b"hevx",
    b"mif1", b"msf1", b"avif", b"avis",
}


def sniff_video(data: bytes):
    """Return a video container name when *data* starts with a known one.

    Container-only detection: no frame is decoded, so it is safe to run on a
    bounded prefix of an arbitrarily large download. Anything unrecognised
    returns ``None`` and stays a generic unsupported attachment.
    """
    if len(data) >= 12 and data[4:8] == b"ftyp":
        # Major brand at 8, then the compatible-brand list from 16. Cap the
        # scan so the check stays bounded on a hostile header.
        brands = {data[8:12]}
        compatible = data[16:16 + 4 * 32]
        brands.update(compatible[i:i + 4] for i in range(0, len(compatible), 4))
        if b"qt  " in brands:
            return "mov"
        if brands & _STILL_IMAGE_BRANDS:
            return None
        if brands & _ISO_VIDEO_BRANDS:
            return "mp4"
        return None
    if data[:4] == b"\x1a\x45\xdf\xa3":  # EBML: webm or matroska
        head = data[:256]
        if b"webm" in head:
            return "webm"
        if b"matroska" in head:
            return "mkv"
        return None
    if data[:4] == b"RIFF" and data[8:12] == b"AVI ":
        return "avi"
    if data[:4] == b"\x00\x00\x01\xba":
        return "mpeg"
    if data[:4] == b"OggS" and b"theora" in data[:512]:
        return "ogv"
    return None


# Bytes read when no declared type settles the question. Every container magic
# is in the first 16 bytes; the slack covers the EBML DocType string used to
# tell webm from matroska. This is a fallback only: a ``video/*`` Content-Type
# is resolved before any body byte is read, and a recording larger than the
# image cap is catalogued here instead of being downloaded in full.
VIDEO_PROBE_BYTES = 4 * 1024


class _VideoDetected(Exception):
    """Internal signal: stop the download, the attachment is a video.

    Raised either from the declared ``Content-Type`` (before any body byte is
    read) or from the bounded container probe. ``total_bytes`` comes from
    Content-Length and is ``None`` when the server did not send one; the bytes
    were never hashed because they were not kept.
    """

    def __init__(self, container: str, total_bytes=None):
        super().__init__(container)
        self.container = container
        self.total_bytes = total_bytes


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
    URL because it is the join key back to the PR body.

    Malformed URLs (`https://[`) raise from ``urlsplit``; logging runs outside
    the capture fail-open handler, so fall back to a constant rather than let a
    bad link abort the remaining notices.
    """
    try:
        parts = urllib.parse.urlsplit(url)
    except ValueError:
        return "<malformed-url>"
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def _workflow_safe(text) -> str:
    """Escape a value for an Actions workflow command (`::notice::`,
    `::warning::`).

    GitHub unescapes `%25`, `%0D`, and `%0A`, so escape the percent first and
    then the line breaks. Strip any remaining control characters (including the
    ESC of ANSI escapes) so a crafted URL or exception message cannot inject a
    workflow-command marker or terminal control sequence.
    """
    text = str(text)
    text = text.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    return _CONTROL.sub("", text)


def _request_for(url: str) -> urllib.request.Request:
    """Media request. Deliberately credential-free: no Authorization header."""
    headers = {"User-Agent": USER_AGENT, "Accept": "image/*,*/*;q=0.8"}
    return urllib.request.Request(url, headers=headers)


# Body reads are chunked so the capture deadline can interrupt a transfer
# that is still making progress. The socket timeout alone only bounds how long
# a single read may block, not how long a slow server may keep trickling.
_READ_CHUNK = 64 * 1024
_VIDEO_PROBE_READ_SIZE = min(_READ_CHUNK, VIDEO_PROBE_BYTES)


def _header(response, name: str):
    """Header value, or None when the response has no header mapping."""
    try:
        return response.headers.get(name)
    except (AttributeError, TypeError):
        return None


def _content_length(response):
    """Declared body size, or None. Used for a video we never fully read."""
    raw = _header(response, "Content-Length")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


# A declared video type is decisive for this capture: the bytes are never
# inspected anyway, so the server's media type is enough to catalogue the
# attachment without reading any of its body. Only subtypes that GitHub names
# differently from their container need an alias (``video/quicktime`` is a mov).
_VIDEO_SUBTYPE_ALIASES = {
    "quicktime": "mov",
    "x-msvideo": "avi",
    "x-matroska": "mkv",
    "ogg": "ogv",
}


def _declared_video_container(response):
    """Container name from ``Content-Type: video/*``, or None.

    Resolves before the first body read, so a recording costs one request and
    zero payload bytes.
    """
    raw = _header(response, "Content-Type")
    if not isinstance(raw, str):
        return None
    media_type = raw.split(";", 1)[0].strip().lower()
    if not media_type.startswith("video/"):
        return None
    subtype = media_type.split("/", 1)[1] or "video"
    return _VIDEO_SUBTYPE_ALIASES.get(subtype, subtype)


def fetch_media(
    url: str,
    timeout: float,
    max_bytes: int,
    deadline: Optional[float] = None,
    probe_video: bool = False,
):
    """Return image bytes, or raise RuntimeError with a skip reason.

    With ``probe_video`` the first ``VIDEO_PROBE_BYTES`` are sniffed for a
    video container; a match raises ``_VideoDetected`` instead of reading the
    rest of the file. That keeps a 100 MB screen recording from consuming the
    image byte budget or the capture window.

    Never receives a token, so private media that needs auth is skipped
    rather than fetched with credentials.

    ``deadline`` is a ``time.monotonic()`` value bounding this request: it
    shortens the socket timeout to the remaining budget and is re-checked
    between body chunks, so an in-flight download cannot outlive the capture
    window.
    """
    if not url_allowed(url):
        raise RuntimeError("host-not-allowlisted")
    if deadline is not None:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise RuntimeError("capture-deadline")
        timeout = min(timeout, remaining)
    opener = urllib.request.build_opener(_ValidatingRedirect())
    try:
        with opener.open(_request_for(url), timeout=timeout) as response:
            final_url = response.geturl()
            if not url_allowed(final_url):
                raise RuntimeError("redirect-host-not-allowlisted")
            declared_video = (
                _declared_video_container(response) if probe_video else None
            )
            if declared_video:
                raise _VideoDetected(declared_video, _content_length(response))
            chunks = []
            size = 0
            probed = False
            while True:
                if deadline is not None and time.monotonic() >= deadline:
                    raise RuntimeError("capture-deadline")
                probing = probe_video and not probed
                chunk = response.read(
                    _VIDEO_PROBE_READ_SIZE if probing else _READ_CHUNK
                )
                if not chunk:
                    break
                size += len(chunk)
                chunks.append(chunk)
                if probing and size >= VIDEO_PROBE_BYTES:
                    probed = True
                    container = sniff_video(b"".join(chunks))
                    if container:
                        raise _VideoDetected(container, _content_length(response))
                # Checked after the probe so a recording past the image cap is
                # catalogued as video instead of skipped as image-too-large.
                if size > max_bytes:
                    raise RuntimeError("image-too-large")
            data = b"".join(chunks)
    except urllib.error.HTTPError as error:
        raise RuntimeError("http-{}".format(error.code)) from error
    except urllib.error.URLError as error:
        reason = getattr(error, "reason", error)
        raise RuntimeError("fetch-failed: {}".format(reason)) from error
    except TimeoutError as error:
        raise RuntimeError("timeout") from error
    return data


# ---------------------------------------------------------------------------
# Sandbox ingress: manifest + tarball
# ---------------------------------------------------------------------------
def new_manifest(repo: str, pr_number: Optional[int], head_sha: str) -> dict:
    return {
        "schema": 1,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pr": {"repo": repo, "number": pr_number, "head_sha": head_sha},
        "status": "empty",
        "images": [],
        "videos": [],
        "skipped": [],
        "limitations": [],
    }


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
    comment_error: Optional[str] = None,
    deadline: Optional[float] = None,
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
    manifest = new_manifest(repo, pr_number, head_sha)

    image_dir = out_dir / IMAGE_DIR_NAME
    image_dir.mkdir(parents=True, exist_ok=True)
    files = []
    total_bytes = 0
    index = 0
    # Order in the PR body across every catalogued artifact. A reviewer can
    # point at "the second attachment" without decoding a UUID, and the label
    # is stable because it follows the author's own ordering.
    position = 0
    attempts = 0
    if deadline is None:
        deadline = time.monotonic() + limits.capture_timeout

    def skip(item: Media, reason: str) -> None:
        # Reasons can carry exception text; keep the manifest single-line.
        manifest["skipped"].append({"url": item.url, "reason": _single_line(reason)})

    def record_video(item: Media, container: str, total_bytes=None, sha256=None) -> None:
        # A video is catalogued for the reviewer, never stored: its frames are
        # not inspectable here, but "the author attached a recording" is a fact
        # the review must be able to state instead of implying nothing arrived.
        nonlocal position
        index = len(manifest["videos"]) + 1
        position += 1
        entry = {
            "label": "Video {}".format(index),
            "position": position,
            "index": index,
            "source_url": item.url,
            "caption": item.caption,
            "origin": item.origin,
            "kind": "video",
            "container": container,
            "reason": "video-not-inspectable",
        }
        if total_bytes is not None:
            entry["bytes"] = total_bytes
        if sha256:
            entry["sha256"] = sha256
        if item.context:
            entry["source_context"] = item.context
        manifest["videos"].append(entry)

    current = None
    try:
        for item in ordered:
            current = item
            if index >= limits.max_images:
                skip(item, "image-limit")
                continue
            if time.monotonic() >= deadline:
                # Global capture deadline: stop starting fetches so a slow or
                # hostile PR cannot hold pre-review.sh open past its budget.
                skip(item, "capture-deadline")
                continue
            if attempts >= limits.max_attempts:
                # Attempt budget counts every request, including ones that fail or
                # are rejected after download, so a PR full of dead links cannot
                # trigger unbounded sequential fetches.
                skip(item, "attempt-limit")
                continue
            if total_bytes >= limits.max_total_bytes:
                # Accepted bytes already fill the budget; do not download more.
                skip(item, "total-bytes-limit")
                continue
            if not url_allowed(item.url):
                skip(item, "host-not-allowlisted")
                continue
            attempts += 1
            try:
                data = fetch(item.url)
            except _VideoDetected as video:
                # The probe stopped the download early; no bytes are kept.
                record_video(item, video.container, video.total_bytes)
                current = None
                continue
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
                container = sniff_video(data)
                if container:
                    record_video(
                        item,
                        container,
                        total_bytes=len(data),
                        sha256=hashlib.sha256(data).hexdigest(),
                    )
                    current = None
                    continue
                skip(item, "not-a-supported-image")
                continue
            extension, width, height, animated = sniffed
            if width > limits.max_dimension or height > limits.max_dimension:
                skip(item, "dimension-limit")
                continue
            if width * height > limits.max_pixels:
                skip(item, "pixel-limit")
                continue

            index += 1
            position += 1
            name = "{}{}.{}".format(IMAGE_PREFIX, index, extension)
            path = image_dir / name
            path.write_bytes(data)
            files.append(path)
            total_bytes += len(data)
            entry = {
                # Stable, human-readable handle for the reviewer. The UUID in
                # the URL is not something a person can say aloud or search.
                "label": "Image {}".format(index),
                "position": position,
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
            if animated:
                # Animated GIFs are captured as-is: the triage table accepts a
                # short GIF of an interaction, and the frame count tells a
                # reader whether the file can carry motion at all.
                entry["animated"] = True
                entry["frames"] = _gif_frame_count(data)
            if item.context:
                entry["source_context"] = item.context
            manifest["images"].append(entry)
            current = None
    except _DeadlineExceeded:
        # The hard stop fires mid-download. Keep everything captured so far and
        # record why the set is incomplete instead of discarding the capture.
        if current is not None:
            skip(current, "capture-hard-timeout")
        manifest["limitations"].append("capture-hard-timeout")
        warning_lines.append(
            "PR image capture hit its hard timeout; images may be missing"
        )

    if any(entry["reason"] == "capture-deadline" for entry in manifest["skipped"]):
        # A deadline stop means the manifest is not a complete picture of the
        # PR's images. Record it so the shared context and the evidence record
        # can say so instead of implying the author supplied nothing more.
        manifest["limitations"].append("capture-deadline-reached")
        warning_lines.append(
            "PR image capture stopped at the capture deadline; images may be missing"
        )

    if comment_error:
        manifest["limitations"].append(comment_error)
        warning_lines.append("PR image capture incomplete: {}".format(comment_error))

    if manifest["images"] or manifest["videos"]:
        manifest["status"] = (
            "partial" if (manifest["skipped"] or manifest["limitations"]) else "ok"
        )
    elif ordered:
        manifest["status"] = "error"
    if manifest["status"] == "error":
        warning_lines.append("no PR images could be captured (see skipped reasons)")
    write_ingress(out_dir, manifest, files)
    return CaptureResult(manifest=manifest, warnings=warning_lines)


# ---------------------------------------------------------------------------
# GitHub comments
# ---------------------------------------------------------------------------
def fetch_comments(
    repo: str,
    pr_number: Optional[int],
    token: str,
    timeout: float,
    deadline: Optional[float] = None,
) -> "tuple[list, Optional[str]]":
    """Return ``(comments, error)``.

    ``comments`` are the successfully collected comment images. ``error`` is a
    short limitation token when pagination stopped early (HTTP error, timeout,
    decode failure, the capture deadline, or the page cap), so the caller can
    record that thread images may be missing instead of reporting an
    unqualified success.

    ``deadline`` is the same ``time.monotonic()`` budget the media fetches use,
    so comment listing cannot consume the window the downloads need.
    """
    if not repo or not pr_number:
        return [], None
    comments = []
    error = None
    url = "https://api.github.com/repos/{}/issues/{}/comments?per_page=100".format(repo, pr_number)
    opener = urllib.request.build_opener()
    pages = 0
    while url and pages < 5:
        pages += 1
        page_timeout = timeout
        if deadline is not None:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                error = "capture-deadline"
                break
            page_timeout = min(timeout, remaining)
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/vnd.github+json",
                **({"Authorization": "Bearer {}".format(token)} if token else {}),
            },
        )
        try:
            with opener.open(request, timeout=page_timeout) as response:
                payload = json.loads(response.read().decode("utf-8") or "[]")
                link = response.headers.get("Link", "")
        except (urllib.error.URLError, TimeoutError, ValueError):
            error = "comment-fetch-failed"
            break
        if not isinstance(payload, list):
            error = "comment-payload-invalid"
            break
        deadline_hit = False
        for comment in payload:
            if not isinstance(comment, dict):
                continue
            user = comment.get("user") or {}
            if user.get("type") == "Bot":
                continue
            if deadline is not None and time.monotonic() >= deadline:
                # Extraction is linear per body, but a thread can still carry
                # hundreds of bodies; stop parsing rather than spend the whole
                # budget here and record that thread images may be missing.
                error = "capture-deadline"
                deadline_hit = True
                break
            body = comment.get("body") or ""
            identifier = comment.get("id", "unknown")
            found = extract_media(body, "comment:{}".format(identifier))
            context = _comment_context(body)
            if context:
                for media in found:
                    media.context = context
            comments.extend(found)
        if deadline_hit:
            break
        next_url = ""
        for part in link.split(","):
            if 'rel="next"' in part:
                next_url = part.split(";")[0].strip().strip("<>")
        url = next_url
    if url and pages >= 5 and error is None:
        error = "comment-pagination-truncated"
    return comments, error


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def _read_body(args) -> str:
    if args.body_file:
        return Path(args.body_file).read_text(encoding="utf-8", errors="replace")
    if args.body is not None:
        return args.body
    return os.environ.get("REVIEW_PR_BODY", "")


# Extra wall-clock room granted past the cooperative deadline before the
# SIGALRM backstop fires. The cooperative checks cannot interrupt regex work
# that has already started or a single blocking syscall, so this is the last
# resort that keeps pre-review.sh from waiting on capture indefinitely.
HARD_TIMEOUT_GRACE = 15.0


class _DeadlineExceeded(BaseException):
    """Raised by the SIGALRM backstop when capture outlives its hard timeout.

    Subclasses ``BaseException`` so the per-item ``except Exception`` fail-open
    handlers cannot convert the hard stop into an ordinary skip; that would
    hide the timeout from the manifest. It is caught explicitly in
    ``capture`` and ``main``, which record the incompleteness and carry on.
    """


def _raise_deadline_exceeded(signum, frame):
    raise _DeadlineExceeded()


@contextlib.contextmanager
def hard_timeout(seconds: float):
    """Hard backstop for work the cooperative deadline cannot interrupt.

    No-op where ``SIGALRM`` is unavailable; the cooperative deadline still
    applies. On expiry the caller records capture incompleteness and fails
    open, because the review must proceed without images.
    """
    if seconds <= 0 or not hasattr(signal, "SIGALRM"):
        yield
        return
    previous = signal.signal(signal.SIGALRM, _raise_deadline_exceeded)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try:
        yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)


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
    check("allowlist: historical repo asset path", url_allowed(
        "https://github.com/o/r/assets/123456/6f1c2d3e-0000-4000-8000-000000000000"
    ))
    check("allowlist: repo asset rejects extra segments", not url_allowed(
        "https://github.com/o/r/assets/1/2/3"
    ))
    check("allowlist: s3 redirect", url_allowed(
        "https://github-production-user-asset-1a2b.s3.amazonaws.com/1/x.png?sig=1"
    ))
    check("allowlist: raw repo image", url_allowed(
        "https://raw.githubusercontent.com/o/r/branch/docs/shot.png"
    ))
    check("allowlist: raw non-image rejected", not url_allowed(
        "https://raw.githubusercontent.com/o/r/branch/docs/index.html"
    ))
    query_image = extract_media(
        "![shot](https://raw.githubusercontent.com/o/r/main/shot.png?raw=true)"
    )
    check("extract: query-bearing image yields one candidate",
          [item.url for item in query_image]
          == ["https://raw.githubusercontent.com/o/r/main/shot.png?raw=true"])
    check("extract: unterminated bracket run stays bounded",
          extract_media("![" * 5000) == [])
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
    check("workflow-safe escapes percent", _workflow_safe("a%b") == "a%25b")
    check("workflow-safe escapes newline", _workflow_safe("a\nb") == "a%0Ab")
    check(
        "workflow-safe strips ansi control",
        _workflow_safe("a\x1b[31mb") == "a[31mb",
    )

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
    parser.add_argument(
        "--comments",
        action="store_true",
        help=(
            "also capture images from PR issue comments (local debugging only; "
            "the review pipeline captures the PR body alone)"
        ),
    )
    parser.add_argument("--strict", action="store_true", help="exit non-zero when capture fails")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)

    if args.self_test:
        return _self_test()

    out_dir = Path(args.out_dir)
    limits = Limits.from_env()
    # One deadline for the whole capture: optional comment listing, body
    # parsing, and every media download draw from the same window, so the step
    # cannot outlive the budget pre-review.sh is waiting on.
    deadline = time.monotonic() + limits.capture_timeout
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        image_dir = out_dir / IMAGE_DIR_NAME
        if image_dir.exists():
            shutil.rmtree(image_dir)
        for stale in (out_dir / MANIFEST_NAME, out_dir / TARBALL_NAME):
            if stale.exists():
                stale.unlink()

        # Comment capture is off for reviews: the PR body is the only evidence
        # source. The token is read only for the opt-in local debugging path.
        comments_token = os.environ.get("REVIEW_TOKEN") or os.environ.get("GH_TOKEN") or ""
        with hard_timeout(limits.capture_timeout + HARD_TIMEOUT_GRACE):
            comments = []
            comment_error = None
            if args.comments:
                comments, comment_error = fetch_comments(
                    args.repo, args.pr_number, comments_token, limits.timeout, deadline
                )
            result = capture(
                _read_body(args),
                comments,
                lambda url: fetch_media(
                    url,
                    limits.timeout,
                    limits.max_image_bytes,
                    deadline,
                    probe_video=True,
                ),
                out_dir,
                limits,
                repo=args.repo,
                pr_number=args.pr_number,
                head_sha=args.head_sha,
                comment_error=comment_error,
                deadline=deadline,
            )
    except _DeadlineExceeded:
        # Reached when the stop lands outside the capture loop (comment
        # listing, body parsing). The loop keeps its own partial result.
        manifest = new_manifest(args.repo, args.pr_number, args.head_sha)
        manifest["status"] = "error"
        manifest["limitations"].append("capture-hard-timeout")
        try:
            write_ingress(out_dir, manifest, [])
        except Exception:  # noqa: BLE001 - fail open, the warning stands alone
            pass
        print(
            "::warning::PR image capture exceeded its hard timeout; "
            "continuing without images"
        )
        if args.strict:
            return 1
        return 0
    except Exception as error:  # noqa: BLE001 - the review must not fail here
        print("::warning::PR image capture failed: {}".format(_workflow_safe(error)))
        if args.strict:
            return 1
        return 0

    manifest = result.manifest
    print(
        "PR images: status={} captured={} videos={} skipped={}".format(
            manifest["status"],
            len(manifest["images"]),
            len(manifest["videos"]),
            len(manifest["skipped"]),
        )
    )
    for entry in manifest["skipped"]:
        print(
            "::notice::PR image skipped: {} ({})".format(
                _workflow_safe(_loggable(entry["url"])),
                _workflow_safe(entry["reason"]),
            )
        )
    for warning in result.warnings:
        print("::warning::{}".format(_workflow_safe(warning)))
    if args.strict and manifest["status"] == "error":
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
