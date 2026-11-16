"""Unit tests for .fullsend/scripts/fetch_pr_images.py.

No network calls, no tokens. Run:
  python3 .fullsend/scripts/tests/test_fetch_pr_images.py -v
"""

import contextlib
import email.message
import importlib.util
import io
import json
import struct
import sys
import tarfile
import tempfile
import unittest
import unittest.mock
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SPEC = importlib.util.spec_from_file_location(
    "fetch_pr_images", ROOT / ".fullsend/scripts/fetch_pr_images.py"
)
images = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = images
SPEC.loader.exec_module(images)

ATTACHMENT = "https://github.com/user-attachments/assets/"


def png_bytes(width=10, height=20, payload=b""):
    return (
        b"\x89PNG\r\n\x1a\n"
        + struct.pack(">I", 13)
        + b"IHDR"
        + struct.pack(">II", width, height)
        + b"\x08\x06\x00\x00\x00"
        + b"\x00" * 4
        + payload
    )


def gif_bytes(width=10, height=20, frames=1):
    body = b"GIF89a" + struct.pack("<HH", width, height) + b"\x00\x00\x00"
    body += b"\x00\x21\xf9\x04" * frames
    return body + b";"


def jpeg_bytes(width=10, height=20):
    return (
        b"\xff\xd8"
        + b"\xff\xc0"
        + struct.pack(">H", 17)
        + b"\x08"
        + struct.pack(">HH", height, width)
        + b"\x03\x01\x11\x00\x02\x11\x01\x03\x11\x01"
    )


def webp_bytes(width=10, height=20):
    payload = b"VP8X" + struct.pack("<I", 10) + b"\x00\x00\x00\x00"
    payload += (width - 1).to_bytes(3, "little") + (height - 1).to_bytes(3, "little")
    return b"RIFF" + struct.pack("<I", 4 + len(payload)) + b"WEBP" + payload


class ExtractTests(unittest.TestCase):
    def test_markdown_image_keeps_alt_caption(self):
        media = images.extract_media("![dark glass](%saaa)" % ATTACHMENT)
        self.assertEqual([item.url for item in media], [ATTACHMENT + "aaa"])
        self.assertEqual(media[0].caption, "dark glass")

    def test_html_image_with_reordered_attributes(self):
        body = '<img width="10" src="%sbbb" alt="panel" />' % ATTACHMENT
        media = images.extract_media(body)
        self.assertEqual(media[0].url, ATTACHMENT + "bbb")
        self.assertEqual(media[0].caption, "panel")

    def test_bare_attachment_url_is_extracted(self):
        media = images.extract_media("see %sccc for detail" % ATTACHMENT)
        self.assertEqual([item.url for item in media], [ATTACHMENT + "ccc"])

    def test_bare_raw_image_url_is_extracted(self):
        url = "https://raw.githubusercontent.com/o/r/branch/docs/before-model-access.png"
        media = images.extract_media("see %s for detail" % url)
        self.assertEqual([item.url for item in media], [url])

    def test_bare_raw_non_image_url_is_not_media(self):
        body = "https://raw.githubusercontent.com/o/r/branch/src/app.ts"
        self.assertEqual(images.extract_media(body), [])

    def test_other_github_links_are_not_media(self):
        body = (
            "https://github.com/o/r/blob/abc/src/a.ts#L1 "
            "https://github.com/o/r/commit/abc"
        )
        self.assertEqual(images.extract_media(body), [])

    def test_document_order_and_deduplication(self):
        body = "![a](%s1)\n![b](%s2)\n![again](%s1)" % (ATTACHMENT, ATTACHMENT, ATTACHMENT)
        media = images.extract_media(body)
        self.assertEqual([item.url for item in media], [ATTACHMENT + "1", ATTACHMENT + "2"])
        self.assertEqual(media[0].caption, "a")

    def test_reference_style_image(self):
        body = "![panel][shot]\n\n[shot]: %sb\n" % ATTACHMENT
        media = images.extract_media(body)
        self.assertEqual([item.url for item in media], [ATTACHMENT + "b"])
        self.assertEqual(media[0].caption, "panel")

    def test_reference_style_with_shortcut_label(self):
        body = "![dark glass][]\n\n[dark glass]: %sc\n" % ATTACHMENT
        self.assertEqual(images.extract_media(body)[0].url, ATTACHMENT + "c")

    def test_html_entities_are_unescaped(self):
        body = '<img src="https://github.com/user-attachments/assets/x?a=1&amp;b=2">'
        self.assertIn("?a=1&b=2", images.extract_media(body)[0].url)

    def test_captions_drop_control_characters(self):
        media = images.extract_media("![bad\x00\x1b caption](%sx)" % ATTACHMENT)
        self.assertEqual(media[0].caption, "bad caption")


class AllowlistTests(unittest.TestCase):
    def test_allowed_hosts(self):
        for url in (
            "https://github.com/user-attachments/assets/x",
            "https://github.com/o/r/assets/x",
            "https://user-images.githubusercontent.com/1/x.png",
            "https://private-user-images.githubusercontent.com/1/x.png",
            "https://objects.githubusercontent.com/x",
            "https://raw.githubusercontent.com/o/r/branch/docs/shot.png",
            "https://github-production-user-asset-1a2b.s3.amazonaws.com/1/x.png?sig=1",
        ):
            self.assertTrue(images.url_allowed(url), url)

    def test_raw_host_requires_image_suffix(self):
        base = "https://raw.githubusercontent.com/o/r/branch/docs/"
        for name in ("shot.png", "shot.PNG", "shot.jpg", "shot.jpeg", "shot.gif", "shot.webp"):
            self.assertTrue(images.url_allowed(base + name), name)
        self.assertTrue(images.url_allowed(base + "shot.png?raw=true"), "query tolerated")
        for name in ("index.html", "app.ts", "archive.tar.gz", "no-suffix"):
            self.assertFalse(images.url_allowed(base + name), name)

    def test_loggable_url_drops_signed_query(self):
        self.assertEqual(
            images._loggable("https://private-user-images.githubusercontent.com/1/x.png?jwt=abc#f"),
            "https://private-user-images.githubusercontent.com/1/x.png",
        )

    def test_rejected_urls(self):
        for url in (
            "http://github.com/user-attachments/assets/x",
            "https://github.com.evil.example/user-attachments/assets/x",
            "https://github.com/o/r/pulls/1",
            "https://user-images.githubusercontent.com.evil.example/x",
            "https://raw.githubusercontent.com.evil.example/o/r/branch/shot.png",
            "http://raw.githubusercontent.com/o/r/branch/shot.png",
            "https://raw.githubusercontent.com/o/r/branch/docs/index.html",
            "https://evil.example/x.png",
            "https://github-production-user-asset-1a2b.s3.amazonaws.com.evil/x",
            "ftp://github.com/user-attachments/assets/x",
        ):
            self.assertFalse(images.url_allowed(url), url)

    def test_media_requests_carry_no_credentials(self):
        # The review token must never ride along on an image fetch, whatever
        # host serves it, so it cannot leak via a redirect or a media host.
        for url in (
            "https://github.com/user-attachments/assets/x",
            "https://raw.githubusercontent.com/o/r/branch/docs/shot.png",
            "https://github-production-user-asset-1a2b.s3.amazonaws.com/1/x.png?sig=1",
        ):
            self.assertNotIn("Authorization", images._request_for(url).headers, url)

    def test_redirect_stays_credential_free(self):
        handler = images._ValidatingRedirect()
        request = images._request_for("https://github.com/user-attachments/assets/x")
        redirected = handler.redirect_request(
            request,
            io.BytesIO(),
            302,
            "Found",
            email.message.Message(),
            "https://github-production-user-asset-1a2b.s3.amazonaws.com/1/x.png?sig=1",
        )
        self.assertNotIn("Authorization", redirected.headers)

    def test_redirect_off_allowlist_is_refused(self):
        handler = images._ValidatingRedirect()
        request = urllib.request.Request(ATTACHMENT + "x")
        with self.assertRaisesRegex(RuntimeError, "redirect-host-not-allowlisted"):
            handler.redirect_request(
                request, io.BytesIO(), 302, "Found", email.message.Message(), "https://evil.example/x"
            )


class SniffTests(unittest.TestCase):
    def test_png(self):
        self.assertEqual(images.sniff_image(png_bytes()), ("png", 10, 20, False))

    def test_jpeg(self):
        self.assertEqual(images.sniff_image(jpeg_bytes()), ("jpg", 10, 20, False))

    def test_gif(self):
        self.assertEqual(images.sniff_image(gif_bytes()), ("gif", 10, 20, False))

    def test_animated_gif(self):
        self.assertTrue(images.sniff_image(gif_bytes(frames=2))[3])

    def test_webp(self):
        self.assertEqual(images.sniff_image(webp_bytes()), ("webp", 10, 20, False))

    def test_rejects_non_image(self):
        self.assertIsNone(images.sniff_image(b"<html>not an image</html>"))
        self.assertIsNone(images.sniff_image(b""))


class CaptureTests(unittest.TestCase):
    def setUp(self):
        self._temp = tempfile.TemporaryDirectory()
        self.out = Path(self._temp.name)

    def tearDown(self):
        self._temp.cleanup()

    def capture(self, body, mapping=None, fails=(), limits=None, comments=()):
        mapping = mapping or {}
        failures = set(fails)

        def fetch(url):
            if url in failures:
                raise RuntimeError("http-404")
            return mapping.get(url, png_bytes())

        return images.capture(
            body,
            list(comments),
            fetch,
            self.out,
            limits or images.Limits(),
            repo="o/r",
            pr_number=7,
            head_sha="a" * 40,
        )

    def test_success_writes_files_manifest_and_tarball(self):
        result = self.capture("![shot](%sone)" % ATTACHMENT)
        manifest = result.manifest
        self.assertEqual(manifest["status"], "ok")
        self.assertEqual(len(manifest["images"]), 1)
        entry = manifest["images"][0]
        self.assertEqual(entry["path"], "pr-image-1.png")
        self.assertEqual((entry["width"], entry["height"]), (10, 20))
        self.assertEqual(entry["caption"], "shot")
        self.assertTrue((self.out / "pr-images" / "pr-image-1.png").exists())
        self.assertTrue((self.out / "pr-images.json").exists())
        with tarfile.open(self.out / "pr-images.tar.gz") as archive:
            names = sorted(archive.getnames())
        self.assertEqual(names, ["manifest.json", "pr-image-1.png"])

    def test_comment_origin_is_recorded(self):
        comment = images.Media(ATTACHMENT + "c", "from thread", "comment:1")
        manifest = self.capture("", comments=[comment]).manifest
        self.assertEqual(manifest["images"][0]["origin"], "comment:1")

    def test_disallowed_host_is_skipped_not_fetched(self):
        result = self.capture("![x](https://example.com/x.png)")
        self.assertEqual(result.manifest["images"], [])
        self.assertEqual(result.manifest["skipped"][0]["reason"], "host-not-allowlisted")

    def test_fetch_failure_is_recorded_and_fails_open(self):
        result = self.capture("![x](%sx)" % ATTACHMENT, fails=[ATTACHMENT + "x"])
        self.assertEqual(result.manifest["status"], "error")
        self.assertEqual(result.manifest["skipped"][0]["reason"], "http-404")

    def test_non_image_payload_is_skipped(self):
        result = self.capture(
            "![x](%sx)" % ATTACHMENT, mapping={ATTACHMENT + "x": b"plain text"}
        )
        self.assertEqual(result.manifest["skipped"][0]["reason"], "not-a-supported-image")

    def test_oversized_image_is_skipped(self):
        result = self.capture(
            "![x](%sx)" % ATTACHMENT,
            mapping={ATTACHMENT + "x": png_bytes(payload=b"0" * 64)},
            limits=images.Limits(max_image_bytes=16),
        )
        self.assertEqual(result.manifest["skipped"][0]["reason"], "image-too-large")

    def test_total_byte_limit(self):
        body = "![a](%sa)![b](%sb)" % (ATTACHMENT, ATTACHMENT)
        result = self.capture(
            body,
            mapping={ATTACHMENT + "a": png_bytes(), ATTACHMENT + "b": png_bytes()},
            limits=images.Limits(max_total_bytes=len(png_bytes())),
        )
        self.assertEqual([e["reason"] for e in result.manifest["skipped"]], ["total-bytes-limit"])

    def test_image_count_limit(self):
        body = "![a](%sa)![b](%sb)" % (ATTACHMENT, ATTACHMENT)
        result = self.capture(body, limits=images.Limits(max_images=1))
        self.assertEqual(len(result.manifest["images"]), 1)
        self.assertEqual(result.manifest["skipped"][0]["reason"], "image-limit")

    def test_dimension_and_pixel_limits(self):
        result = self.capture(
            "![x](%sx)" % ATTACHMENT,
            mapping={ATTACHMENT + "x": png_bytes(9000, 10)},
            limits=images.Limits(max_dimension=8192),
        )
        self.assertEqual(result.manifest["skipped"][0]["reason"], "dimension-limit")
        result = self.capture(
            "![x](%sx)" % ATTACHMENT,
            mapping={ATTACHMENT + "x": png_bytes(100, 100)},
            limits=images.Limits(max_pixels=1000),
        )
        self.assertEqual(result.manifest["skipped"][0]["reason"], "pixel-limit")

    def test_animated_gif_is_skipped(self):
        result = self.capture(
            "![x](%sx)" % ATTACHMENT, mapping={ATTACHMENT + "x": gif_bytes(frames=2)}
        )
        self.assertEqual(result.manifest["skipped"][0]["reason"], "animated-gif-unsupported")

    def test_default_image_limit_is_twelve(self):
        self.assertEqual(images.Limits().max_images, 12)
        body = "".join("![s%d](%si%d)" % (i, ATTACHMENT, i) for i in range(14))
        result = self.capture(body)
        self.assertEqual(len(result.manifest["images"]), 12)
        self.assertEqual([e["reason"] for e in result.manifest["skipped"]], ["image-limit"] * 2)

    def test_empty_pr_writes_empty_manifest(self):
        result = self.capture("no images here")
        self.assertEqual(result.manifest["status"], "empty")
        manifest = json.loads((self.out / "pr-images" / "manifest.json").read_text())
        self.assertEqual(manifest["images"], [])


class MainLoggingTests(unittest.TestCase):
    def test_skipped_notice_redacts_signed_query(self):
        signed = (
            "https://private-user-images.githubusercontent.com/1/x.png"
            "?jwt=SECRETSIGNEDTOKEN"
        )
        with tempfile.TemporaryDirectory() as out:
            buffer = io.StringIO()
            with unittest.mock.patch.object(
                images, "fetch_media", side_effect=RuntimeError("http-404")
            ), contextlib.redirect_stdout(buffer):
                rc = images.main(
                    ["--body", "![x](%s)" % signed, "--out-dir", out, "--no-comments"]
                )
            logged = buffer.getvalue()
            self.assertEqual(rc, 0)
            self.assertIn("private-user-images.githubusercontent.com/1/x.png", logged)
            self.assertNotIn("SECRETSIGNEDTOKEN", logged)
            manifest = json.loads((Path(out) / "pr-images.json").read_text())
            self.assertEqual(manifest["skipped"][0]["url"], signed)


if __name__ == "__main__":
    unittest.main()
