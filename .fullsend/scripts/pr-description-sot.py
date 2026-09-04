#!/usr/bin/env python3
"""Check required PR headings have real content.

Reads the PR body on stdin. Heading names are remaining argv, or
REVIEW_REQUIRED_HEADINGS (newline-separated) if argv is empty.

Prints each missing/empty required heading on its own stdout line.
HTML comments, whitespace, and placeholders (N/A, none, TBD, TODO, ...)
do not count as content.

Callers pass the heading list (see pr-description-sot.sh).
"""
from __future__ import annotations

import os
import re
import sys

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.M)
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
PLACEHOLDER_RE = re.compile(
    r"^(n/?a|na|none|tbd|todo|\.{3}|replace this.*)$",
    re.I,
)


def norm_heading(text: str) -> str:
    text = (text or "").strip().rstrip(":").strip()
    return re.sub(r"\s+", " ", text).lower()


def section_bodies(body: str) -> dict[str, str]:
    matches = list(HEADING_RE.finditer(body or ""))
    out: dict[str, str] = {}
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        out[norm_heading(m.group(2))] = body[start:end]
    return out


def is_filled(text: str) -> bool:
    text = COMMENT_RE.sub("", text or "")
    text = text.strip()
    if not text:
        return False
    compact = re.sub(r"\s+", " ", text).strip().strip("*_`")
    return PLACEHOLDER_RE.fullmatch(compact) is None


def missing_headings(body: str, required: list[str]) -> list[str]:
    sections = section_bodies(body)
    missing: list[str] = []
    for heading in required:
        content = sections.get(norm_heading(heading))
        if content is None or not is_filled(content):
            missing.append(heading)
    return missing


def _required_from_argv_or_env() -> list[str]:
    if len(sys.argv) > 1:
        return [a for a in sys.argv[1:] if a.strip()]
    return [
        h.strip()
        for h in os.environ.get("REVIEW_REQUIRED_HEADINGS", "").splitlines()
        if h.strip()
    ]


def main() -> None:
    required = _required_from_argv_or_env()
    body = sys.stdin.read()
    for heading in missing_headings(body, required):
        print(heading)


if __name__ == "__main__":
    main()
