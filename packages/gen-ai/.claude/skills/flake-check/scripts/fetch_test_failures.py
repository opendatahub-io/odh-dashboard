#!/usr/bin/env -S uv run --script
# /// script
# dependencies = []
# ///
"""
fetch_test_failures.py <run_id> [--job <job_id>]

Fetches CI run logs and extracts individual test failure details.
Strips GitHub Actions log line prefixes, detects the test framework,
and parses out test names with their error snippets.

Outputs structured JSON for Claude to classify suspected flaky tests.

Usage:
    python3 fetch_test_failures.py 24269798994
    python3 fetch_test_failures.py 24269798994 --job 70874043977

Output JSON shape:
    {
        "run_id": "...",
        "job_id": "..." | null,
        "framework": "cypress" | "jest" | "go" | "unknown",
        "check_name": "...",
        "failing_tests": [
            { "name": "test name", "file": "path/to/file.cy.ts" | null, "error": "..." }
        ],
        "raw_summary": "...",   # passing/failing counts line from runner output
        "parse_warnings": [...]  # non-empty if parsing was uncertain
    }
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone


MAX_LINES = 2500
ERROR_CONTEXT_LINES = 15
QUEUE_TIME_WARNING_MINUTES = 5


def run_gh(*args: str) -> str:
    cmd = ["gh", *args]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(json.dumps({"error": e.stderr.strip() or f"gh command failed: {' '.join(args)}"}))
        sys.exit(1)
    except FileNotFoundError:
        print(json.dumps({"error": "gh CLI not found. Install from https://cli.github.com/"}))
        sys.exit(1)


_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def strip_ansi(s: str) -> str:
    return _ANSI_RE.sub("", s)


def strip_gh_prefix(line: str) -> str:
    """
    Remove the GitHub Actions log timestamp prefix from a line.
    Current format (tab-separated): "{job_name}\t{step_name}\t{ISO-timestamp} {content}"
    Also strips concurrent-runner prefixes like "[1] ".
    """
    stripped = re.sub(r"^.+?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*", "", line)
    stripped = re.sub(r"^\[\d+\]\s*", "", stripped)
    return stripped


def extract_check_name(raw_lines: list[str]) -> str | None:
    """Extract the job/check name from the GH Actions log prefix of the first non-empty line."""
    for line in raw_lines[:10]:
        if not line.strip():
            continue
        # Current GH format: tab-separated "{job_name}\t{step_name}\t{timestamp} {content}"
        if "\t" in line:
            return line.split("\t")[0].strip()
        # Fallback: older space-separated format
        match = re.match(r"^(.+?)\s{2,}\d{4}-\d{2}-\d{2}T", line)
        if match:
            prefix = match.group(1).strip()
            prefix = re.sub(r"\s+(UNKNOWN STEP|Set up job|Post job|Complete job|Run .+)$", "", prefix)
            return prefix.strip()
    return None


def detect_framework(lines: list[str], check_name: str | None = None) -> str:
    # Fast path: infer from the job name (reliable and avoids scanning the log)
    if check_name:
        cn = check_name.lower()
        if "cypress" in cn:
            return "cypress"
        if "unit" in cn or "jest" in cn:
            return "jest"
        if re.search(r"\bgo\b", cn) or "bff" in cn:
            return "go"
    # Fall back: scan full cleaned log (not just first 200 — failures can appear anywhere)
    sample = "\n".join(lines).lower()
    if "cypress" in sample or "cy." in sample or "timed out retrying" in sample:
        return "cypress"
    if "jest" in sample or "● " in sample or ".spec." in sample:
        return "jest"
    if "--- fail:" in sample or "go test" in sample:
        return "go"
    return "unknown"


def parse_cypress_failures(lines: list[str]) -> list[dict]:
    """
    Parse Cypress/Mocha numbered test failures.
    Format:
        N failing
        1) Suite name
             Test name:
           AssertionError: message
           ...
        2) ...
    """
    text = "\n".join(lines)
    failures: list[dict] = []

    # Build ordered list of (text_position, full_spec_path) for every "Running:" line.
    # Failure summary blocks appear after the spec that produced them, so the last
    # Running: position before a failure block identifies the originating spec file.
    running_positions: list[tuple[int, str]] = []
    for m in re.finditer(r"Running:\s+(.+?\.cy\.[jt]sx?)", text):
        running_positions.append((m.start(), m.group(1).strip()))

    def spec_at(pos: int) -> str | None:
        result = None
        for rpos, rpath in running_positions:
            if rpos < pos:
                result = rpath
            else:
                break
        return result

    # Find each numbered failure block: "  N) " at start of line
    entry_re = re.compile(r"^\s{1,6}(\d+)\)\s", re.MULTILINE)
    positions = [(m.start(), m.group(1)) for m in entry_re.finditer(text)]

    for i, (start, _num) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        block = text[start:end]
        block_lines = block.splitlines()

        if not block_lines:
            continue

        # First line: strip the "N) " prefix to get the beginning of the test name
        first = re.sub(r"^\s*\d+\)\s*", "", block_lines[0]).strip().rstrip(":")
        name_parts = [first] if first else []
        error_parts: list[str] = []
        seen_error = False
        guessed_file: str | None = spec_at(start)

        for line in block_lines[1:]:
            stripped = line.strip()
            if not stripped:
                continue

            # Stack trace lines — stop collecting error here
            if re.match(r"at .+\(|at Context\.|at \w+\s*\(", stripped):
                break

            # Explicit file path in error output overrides the Running: attribution
            if not guessed_file:
                file_match = re.search(r"([\w/.-]+\.cy\.[jt]sx?)", stripped)
                if file_match:
                    guessed_file = file_match.group(1)

            if re.match(
                r"(AssertionError|CypressError|Error|TypeError|ReferenceError|Cannot read|Unable to find)",
                stripped,
            ):
                seen_error = True
                error_parts.append(stripped)
            elif seen_error:
                error_parts.append(stripped)
                if len(error_parts) >= ERROR_CONTEXT_LINES:
                    break
            elif not seen_error and stripped.endswith(":"):
                # Multi-line test name continuation
                name_parts.append(stripped.rstrip(":"))
            elif not seen_error:
                name_parts.append(stripped)

        test_name = " ".join(p.strip() for p in name_parts if p.strip()).rstrip(":")
        # Only emit if we found actual error content — blocks without errors are
        # inline run-time markers, not the final failure summary
        if test_name and error_parts:
            failures.append({
                "name": test_name,
                "file": guessed_file,
                "error": "\n".join(error_parts),
            })

    return failures


def parse_jest_failures(lines: list[str]) -> list[dict]:
    """
    Parse Jest test failures.
    Format:
        ● Suite › Test name
          Expected: value
          Received: other
    """
    text = "\n".join(lines)
    failures: list[dict] = []

    pattern = re.compile(r"^\s*●\s+(.+?)$", re.MULTILINE)
    positions = [(m.start(), m.group(1)) for m in pattern.finditer(text)]

    for i, (start, test_name) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        block = text[start:end]

        error_parts: list[str] = []
        guessed_file: str | None = None

        for line in block.splitlines()[1:]:
            stripped = line.strip()
            if not stripped:
                continue
            if re.match(r"at .+\(|at \w+\.", stripped):
                break
            file_match = re.search(r"([\w/.-]+\.spec\.[jt]sx?)", stripped)
            if file_match and not guessed_file:
                guessed_file = file_match.group(1)
            error_parts.append(stripped)
            if len(error_parts) >= ERROR_CONTEXT_LINES:
                break

        if error_parts:
            failures.append({
                "name": test_name.strip(),
                "file": guessed_file,
                "error": "\n".join(error_parts),
            })

    return failures


def parse_go_failures(lines: list[str]) -> list[dict]:
    """Parse Go test failures: --- FAIL: TestName (0.00s)"""
    failures: list[dict] = []
    current: str | None = None
    error_parts: list[str] = []

    for line in lines:
        fail_match = re.match(r"--- FAIL: (\S+)\s+\(", line)
        if fail_match:
            if current:
                failures.append({"name": current, "file": None, "error": "\n".join(error_parts[:ERROR_CONTEXT_LINES])})
            current = fail_match.group(1)
            error_parts = []
        elif current and line.strip() and not line.startswith("---"):
            error_parts.append(line.strip())

    if current:
        failures.append({"name": current, "file": None, "error": "\n".join(error_parts[:ERROR_CONTEXT_LINES])})

    return failures


def extract_summary_line(lines: list[str]) -> str | None:
    """Find the runner's pass/fail summary line (e.g. '3 passing (16s), 2 failing')."""
    for line in reversed(lines):
        clean = strip_ansi(line)
        if re.search(r"\d+ (passing|failing|passed|failed)", clean, re.IGNORECASE):
            return clean.strip()
    return None


def fetch_queue_time_minutes(run_id: str, job_id: str) -> float | None:
    """
    Return the time in minutes between job creation (queued) and job start for the given job.
    A long queue time suggests runner congestion rather than a test problem.
    Returns None if timing data is unavailable.
    """
    try:
        raw = run_gh("run", "view", run_id, "--json", "jobs")
        jobs = json.loads(raw).get("jobs", [])
    except (SystemExit, json.JSONDecodeError):
        return None

    for job in jobs:
        if str(job.get("databaseId", "")) != job_id:
            continue
        created_at = job.get("createdAt")
        started_at = job.get("startedAt")
        if not created_at or not started_at:
            return None
        try:
            # GitHub timestamps end in Z; replace for broad Python compatibility
            t_created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            t_started = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            return (t_started - t_created).total_seconds() / 60
        except ValueError:
            return None

    return None


def fetch_log(run_id: str, job_id: str | None) -> tuple[list[str], bool]:
    """Fetch CI log lines.

    With a job_id: fetches only that job's log (scoped, complete, no truncation needed).
    Without a job_id: fetches all failed jobs concatenated — can be very large, so we
    keep only the tail where failures typically appear.

    Returns (lines, truncated).
    """
    if job_id:
        raw = run_gh("run", "view", run_id, "--job", job_id, "--log")
        return raw.splitlines(), False
    else:
        raw = run_gh("run", "view", run_id, "--log-failed")
        all_lines = raw.splitlines()
        if len(all_lines) > MAX_LINES:
            return all_lines[-MAX_LINES:], True
        return all_lines, False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("run_id", help="GitHub Actions run ID")
    parser.add_argument("--job", help="Job ID (optional; scopes to a single job)", default=None)
    args = parser.parse_args()

    raw_lines, log_truncated = fetch_log(args.run_id, args.job)
    check_name = extract_check_name(raw_lines)

    # Strip GH Actions prefixes and ANSI codes to get clean test output
    stripped_lines = [strip_ansi(strip_gh_prefix(line)) for line in raw_lines]
    clean_lines = [line for line in stripped_lines if line.strip()]

    warnings: list[str] = []

    if log_truncated:
        warnings.append(
            f"Log truncated to last {MAX_LINES} lines — early failures may be missing. "
            "Pass --job <job_id> to fetch a single job's complete log."
        )

    # Warn if prefix stripping appears to have silently failed (GH Actions format may have changed).
    # Sample lines that look like they have the expected tab-separated prefix; if most still contain
    # a timestamp after stripping, the regex didn't match and test parsing will likely be broken.
    _timestamp_re = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")
    prefixed_pairs = [
        (r, s) for r, s in zip(raw_lines, stripped_lines)
        if "\t" in r and _timestamp_re.search(r)
    ][:20]
    if prefixed_pairs:
        still_prefixed = sum(1 for _, s in prefixed_pairs if _timestamp_re.search(s))
        if still_prefixed > len(prefixed_pairs) * 0.5:
            warnings.append(
                "Log prefix stripping may have failed — GitHub Actions log format may have changed. "
                "Test parsing results may be incomplete or incorrect."
            )

    framework = detect_framework(clean_lines, check_name)

    if framework == "cypress":
        failures = parse_cypress_failures(clean_lines)
    elif framework == "jest":
        failures = parse_jest_failures(clean_lines)
    elif framework == "go":
        failures = parse_go_failures(clean_lines)
    else:
        failures = []
        warnings.append(
            "Could not detect test framework. Provide raw log lines to Claude for manual analysis."
        )

    if not failures and framework != "unknown":
        warnings.append(
            f"Framework detected as '{framework}' but no individual test failures were parsed. "
            "The test runner may have failed before running tests (build error, setup failure). "
            "Claude should inspect the raw_summary for more context."
        )

    summary_line = extract_summary_line(clean_lines)

    # Queue time — only available when job_id is provided
    queue_time_minutes: float | None = None
    if args.job:
        queue_time_minutes = fetch_queue_time_minutes(args.run_id, args.job)
        if queue_time_minutes is not None and queue_time_minutes >= QUEUE_TIME_WARNING_MINUTES:
            warnings.append(
                f"Runner was queued for {queue_time_minutes:.1f} min before starting — "
                "infrastructure congestion may have contributed to timeouts."
            )

    print(json.dumps({
        "run_id": args.run_id,
        "job_id": args.job,
        "framework": framework,
        "check_name": check_name,
        "queue_time_minutes": round(queue_time_minutes, 1) if queue_time_minutes is not None else None,
        "failing_tests": failures,
        "raw_summary": summary_line,
        "parse_warnings": warnings,
    }, indent=2))


if __name__ == "__main__":
    main()
