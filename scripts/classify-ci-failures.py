#!/usr/bin/env python3
"""
classify-ci-failures.py — Classify PR CI failures as flaky or genuine.

Layers four signals to distinguish known-flaky tests from real regressions:
  1. Cross-PR check recurrence — same CI job failed on other recent PRs
  2. Cross-PR test recurrence  — same specific test failed on other PRs (--deep)
  3. Rerun detection            — check failed then passed on same commit SHA
  4. Symptom pattern matching   — error matches known flaky patterns

Usage:
    scripts/classify-ci-failures.py 1234
    scripts/classify-ci-failures.py 1234 --deep
    scripts/classify-ci-failures.py 1234 --since 14d
    scripts/classify-ci-failures.py 1234 --repo owner/repo

Designed for integration with the preflight skill. Output is JSON.
"""

import argparse
import json
import re
import subprocess
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta


DEFAULT_REPO = "opendatahub-io/odh-dashboard"
SCAN_WINDOW_DAYS = 7
SCAN_LIMIT = 30
PARALLEL_WORKERS = 8
LOG_MAX_LINES = 2500
ERROR_CONTEXT_LINES = 15

_TEST_RUNNER_KEYWORDS = (
    "cypress-mock",
    "cypress e2e",
    "unit-test",
    "unit_test",
    "jest",
    "contract-test",
    "e2e test",
    "spec",
)


_BOT_LOGINS = {
    "openshift-cherrypick-robot",
    "renovate",
    "renovate[bot]",
    "dependabot",
    "dependabot[bot]",
    "app/dependabot",
    "github-actions[bot]",
}

_FLAKY_SYMPTOM_PATTERNS = [
    (r"CypressError: Timed out retrying after", "Cypress timeout — DOM timing race"),
    (r"cy\.\w+\(\) failed because it requires a DOM element", "Cypress DOM element missing"),
    (r"AssertionError: Timed out retrying", "Assertion timeout — timing race"),
    (r"socket hang up", "Infrastructure — socket hang up"),
    (r"ECONNRESET", "Infrastructure — connection reset"),
    (r"net::ERR_CONNECTION_REFUSED", "Infrastructure — connection refused"),
    (r"Cannot read properties of null", "Race condition — null reference"),
    (r"Cannot read properties of undefined", "Race condition — undefined reference"),
    (r"ENOMEM", "Infrastructure — out of memory"),
    (r"ESOCKETTIMEDOUT", "Infrastructure — socket timeout"),
    (r"EAI_AGAIN", "Infrastructure — DNS resolution failure"),
]

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


# ── Utilities ──────────────────────────────────────────────────────────────────

def run_gh(*args: str) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(["gh", *args], capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        return e  # type: ignore[return-value]
    except FileNotFoundError:
        print(json.dumps({"error": "gh CLI not found"}))
        sys.exit(1)


def gh_json(*args: str) -> dict | list:
    r = run_gh(*args)
    if isinstance(r, subprocess.CalledProcessError) or r.returncode != 0:
        return {}
    try:
        return json.loads(r.stdout)
    except (json.JSONDecodeError, ValueError):
        return {}


def strip_ansi(s: str) -> str:
    return _ANSI_RE.sub("", s)


def strip_gh_prefix(line: str) -> str:
    stripped = re.sub(r"^.+?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*", "", line)
    return re.sub(r"^\[\d+\]\s*", "", stripped)


def is_test_runner(name: str) -> bool:
    nl = name.lower()
    return any(kw in nl for kw in _TEST_RUNNER_KEYWORDS)



def is_bot(author: dict) -> bool:
    if author.get("__typename") == "Bot":
        return True
    return author.get("login", "").lower() in _BOT_LOGINS


def detect_repo() -> str | None:
    def _parse(remote: str) -> str | None:
        try:
            r = subprocess.run(
                ["git", "remote", "get-url", remote],
                capture_output=True, text=True, check=True,
            )
            m = re.search(r"github\.com[:/](.+?)(?:\.git)?$", r.stdout.strip())
            return m.group(1) if m else None
        except subprocess.CalledProcessError:
            return None
    return _parse("upstream") or _parse("origin")


def extract_run_job_ids(url: str) -> tuple[str | None, str | None]:
    m = re.search(r"/actions/runs/(\d+)/job/(\d+)", url or "")
    if m:
        return m.group(1), m.group(2)
    m2 = re.search(r"/actions/runs/(\d+)", url or "")
    return (m2.group(1) if m2 else None, None)


def match_symptom(error_text: str) -> str | None:
    for pattern, description in _FLAKY_SYMPTOM_PATTERNS:
        if re.search(pattern, error_text, re.IGNORECASE):
            return description
    return None


_SENSITIVE_RE = re.compile(
    r"(?i)\b(token|password|passwd|secret|api[_-]?key|authorization|credential)"
    r"\b\s*[:=]\s*(.+)"
)


def _redact(text: str) -> str:
    return _SENSITIVE_RE.sub(r"\1=<redacted>", text)


def _sanitize_control_chars(text: str) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)


def _truncate_error(error: str, max_lines: int = 3, max_chars: int = 300) -> str:
    if not error:
        return ""
    error = _sanitize_control_chars(_redact(error))
    lines = [line for line in error.splitlines() if line.strip()][:max_lines]
    result = "\n".join(lines)
    if len(result) > max_chars:
        result = result[:max_chars - 3] + "..."
    return result


# ── Test log parsers (ported from gen-ai flake-check) ──────────────────────────

def detect_framework(lines: list[str], check_name: str | None = None) -> str:
    if check_name:
        cn = check_name.lower()
        if "cypress" in cn:
            return "cypress"
        if "unit" in cn or "jest" in cn:
            return "jest"
        if re.search(r"\bgo\b", cn) or "bff" in cn or cn.startswith("test"):
            return "go"
    sample = "\n".join(lines[:500]).lower()
    if "cypress" in sample or "cy." in sample or "timed out retrying" in sample:
        return "cypress"
    if "jest" in sample or "● " in sample:
        return "jest"
    if "--- fail:" in sample or "go test" in sample:
        return "go"
    return "unknown"


def parse_cypress_failures(lines: list[str]) -> list[dict]:
    text = "\n".join(lines)
    failures: list[dict] = []

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

    entry_re = re.compile(r"^\s{1,6}(\d+)\)\s", re.MULTILINE)
    positions = [(m.start(), m.group(1)) for m in entry_re.finditer(text)]

    for i, (start, _num) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        block = text[start:end]
        block_lines = block.splitlines()
        if not block_lines:
            continue

        first = re.sub(r"^\s*\d+\)\s*", "", block_lines[0]).strip().rstrip(":")
        name_parts = [first] if first else []
        error_parts: list[str] = []
        seen_error = False
        guessed_file: str | None = spec_at(start)

        for line in block_lines[1:]:
            stripped = line.strip()
            if not stripped:
                continue
            if re.match(r"at .+\(|at Context\.|at \w+\s*\(", stripped):
                break
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
                name_parts.append(stripped.rstrip(":"))
            elif not seen_error:
                name_parts.append(stripped)

        test_name = " ".join(p.strip() for p in name_parts if p.strip()).rstrip(":")
        if len(test_name) > 150:
            test_name = test_name[:147] + "..."
        if test_name and error_parts:
            failures.append({
                "name": test_name,
                "file": guessed_file,
                "error": "\n".join(error_parts),
            })
    return failures


def parse_jest_failures(lines: list[str]) -> list[dict]:
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
            file_match = re.search(r"([\w/.-]+\.(?:spec|test)\.[jt]sx?)", stripped)
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
    failures: list[dict] = []
    current: str | None = None
    error_parts: list[str] = []

    for line in lines:
        fail_match = re.match(r"--- FAIL: (\S+)\s+\(", line)
        if fail_match:
            if current:
                failures.append({"name": current, "file": None,
                                 "error": "\n".join(error_parts[:ERROR_CONTEXT_LINES])})
            current = fail_match.group(1)
            error_parts = []
        elif current and line.strip() and not line.startswith("---"):
            error_parts.append(line.strip())

    if current:
        failures.append({"name": current, "file": None,
                         "error": "\n".join(error_parts[:ERROR_CONTEXT_LINES])})
    return failures


def extract_tests_from_log(run_id: str, job_id: str | None,
                           check_name: str | None = None) -> list[dict]:
    if job_id:
        r = run_gh("run", "view", run_id, "--job", job_id, "--log")
    else:
        r = run_gh("run", "view", run_id, "--log-failed")

    if isinstance(r, subprocess.CalledProcessError) or r.returncode != 0:
        return []

    raw_lines = r.stdout.splitlines()
    if not job_id and len(raw_lines) > LOG_MAX_LINES:
        raw_lines = raw_lines[-LOG_MAX_LINES:]

    clean_lines = [strip_ansi(strip_gh_prefix(line)) for line in raw_lines]
    clean_lines = [line for line in clean_lines if line.strip()]

    if not check_name:
        for line in raw_lines[:10]:
            if "\t" in line:
                check_name = line.split("\t")[0].strip()
                break

    framework = detect_framework(clean_lines, check_name)
    if framework == "cypress":
        return parse_cypress_failures(clean_lines)
    elif framework == "jest":
        return parse_jest_failures(clean_lines)
    elif framework == "go":
        return parse_go_failures(clean_lines)
    return []


# ── Step 1: Fetch this PR's failing checks ────────────────────────────────────

def fetch_pr_failures(repo: str, pr_number: str) -> tuple[list[dict], list[dict], str]:
    checks_raw = gh_json("pr", "checks", pr_number, "--repo", repo,
                         "--json", "name,bucket,link,description")
    if not checks_raw:
        return [], [], ""

    sha_data = gh_json("pr", "view", pr_number, "--repo", repo, "--json", "headRefOid")
    head_sha = sha_data.get("headRefOid", "") if isinstance(sha_data, dict) else ""

    failing: list[dict] = []
    passing: list[dict] = []

    for check in checks_raw:
        bucket = check.get("bucket", "")
        name = check.get("name", "")
        if not name:
            continue
        link = check.get("link", "")
        run_id, job_id = extract_run_job_ids(link)

        entry = {
            "name": name,
            "bucket": bucket,
            "run_id": run_id,
            "job_id": job_id,
            "link": link,
        }
        if bucket in ("fail", "cancel"):
            failing.append(entry)
        elif bucket == "pass":
            passing.append(entry)

    return failing, passing, head_sha


# ── Step 2: Extract tests from failing checks ─────────────────────────────────

def fetch_tests_for_failures(failures: list[dict]) -> dict[str, list[dict]]:
    results: dict[str, list[dict]] = {}
    for f in failures:
        if not is_test_runner(f["name"]):
            continue
        run_id = f.get("run_id")
        if not run_id:
            continue
        tests = extract_tests_from_log(run_id, f.get("job_id"), f["name"])
        results[f["name"]] = tests
    return results


# ── Step 3: Rerun detection ───────────────────────────────────────────────────

def detect_reruns(repo: str, head_sha: str) -> set[str]:
    if not head_sha:
        return set()

    check_runs: list[dict] = []
    page = 1
    while True:
        data = gh_json("api",
                        f"repos/{repo}/commits/{head_sha}/check-runs"
                        f"?per_page=100&filter=all&page={page}")
        if not isinstance(data, dict):
            break
        runs = data.get("check_runs", [])
        check_runs.extend(runs)
        if len(runs) < 100:
            break
        page += 1

    by_name: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for run in check_runs:
        name = run.get("name", "")
        conclusion = (run.get("conclusion") or "").lower()
        started_at = run.get("started_at") or ""
        if name and conclusion:
            by_name[name].append((started_at, conclusion))

    rerun_checks: set[str] = set()
    for name, attempts in by_name.items():
        attempts.sort(key=lambda x: x[0])
        seen_failure = False
        for _, conclusion in attempts:
            if conclusion in ("failure", "timed_out"):
                seen_failure = True
            elif conclusion == "success" and seen_failure:
                rerun_checks.add(name)
                break

    return rerun_checks


# ── Step 4: Cross-PR scan ─────────────────────────────────────────────────────

def fetch_pr_check_summary(
    repo: str, sha: str
) -> list[dict]:
    failing: list[dict] = []

    # 1. Check Runs API (GitHub Actions checks)
    try:
        check_runs: list[dict] = []
        page = 1
        while True:
            raw = run_gh("api",
                         f"repos/{repo}/commits/{sha}/check-runs"
                         f"?per_page=100&page={page}")
            if isinstance(raw, subprocess.CalledProcessError) or raw.returncode != 0:
                break
            data = json.loads(raw.stdout)
            runs = data.get("check_runs", [])
            check_runs.extend(runs)
            if len(runs) < 100:
                break
            page += 1

        by_name: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
        for run in check_runs:
            name = run.get("name", "")
            conclusion = (run.get("conclusion") or "").lower()
            started_at = run.get("started_at") or ""
            html_url = run.get("html_url") or ""
            if name and conclusion:
                by_name[name].append((started_at, conclusion, html_url))

        seen_names: set[str] = set()
        for name, attempts in by_name.items():
            seen_names.add(name)
            attempts.sort(key=lambda x: x[0])
            _, latest_conclusion, latest_url = attempts[-1]
            if latest_conclusion in ("failure", "timed_out"):
                run_id, job_id = extract_run_job_ids(latest_url)
                failing.append({"name": name, "run_id": run_id, "job_id": job_id})
    except (json.JSONDecodeError, ValueError):
        seen_names = set()

    # 2. Commit Statuses API (status-based checks like Cypress E2E Tests)
    status_data = gh_json("api", f"repos/{repo}/commits/{sha}/status")
    if isinstance(status_data, dict):
        for s in status_data.get("statuses", []):
            name = s.get("context", "")
            state = (s.get("state") or "").lower()
            url = s.get("target_url") or ""
            if name and name not in seen_names and state in ("failure", "error"):
                run_id, job_id = extract_run_job_ids(url)
                failing.append({"name": name, "run_id": run_id, "job_id": job_id})

    return failing


def scan_recent_prs(
    repo: str,
    since_days: int,
    this_pr_number: str,
    deep: bool = False,
) -> tuple[dict[str, list[int]], dict[str, list[int]], int]:
    since_date = (date.today() - timedelta(days=since_days)).isoformat()

    prs_raw = gh_json(
        "pr", "list", "--repo", repo,
        "--state", "all", "--limit", str(SCAN_LIMIT * 3),
        "--json", "number,author,createdAt,headRefOid",
        "--search", f"created:>={since_date}",
    )
    if not isinstance(prs_raw, list):
        return {}, {}, 0

    prs = [
        p for p in prs_raw
        if not is_bot(p.get("author", {}))
        and str(p["number"]) != str(this_pr_number)
    ][:SCAN_LIMIT]

    check_results: dict[int, list[dict]] = {}

    def _fetch(pr: dict) -> tuple[int, list[dict]]:
        sha = pr.get("headRefOid", "")
        return pr["number"], fetch_pr_check_summary(repo, sha) if sha else []

    with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as ex:
        futures = {ex.submit(_fetch, pr): pr["number"] for pr in prs}
        for future in as_completed(futures):
            try:
                pr_num, failing = future.result()
                check_results[pr_num] = failing
            except Exception:
                pass

    check_index: dict[str, list[int]] = defaultdict(list)
    for pr_num, checks in check_results.items():
        for check in checks:
            check_index[check["name"]].append(pr_num)

    test_index: dict[str, list[int]] = defaultdict(list)
    if deep:
        fetch_tasks = []
        for pr_num, checks in check_results.items():
            for check in checks:
                if is_test_runner(check["name"]) and check.get("run_id"):
                    fetch_tasks.append(
                        (pr_num, check["run_id"], check.get("job_id"), check["name"])
                    )

        def _fetch_tests(task: tuple) -> tuple[int, list[dict]]:
            pr_num, run_id, job_id, check_name = task
            try:
                return pr_num, extract_tests_from_log(run_id, job_id, check_name)
            except Exception:
                return pr_num, []

        with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as ex:
            for pr_num, tests in ex.map(_fetch_tests, fetch_tasks):
                for t in tests:
                    name = t.get("name", "")
                    if name:
                        if pr_num not in test_index.get(name, []):
                            test_index[name].append(pr_num)

    return dict(check_index), dict(test_index), len(prs)


# ── Step 5: Classify ──────────────────────────────────────────────────────────

def classify_failure(
    check_name: str,
    failing_tests: list[dict],
    rerun_checks: set[str],
    check_recurrence: dict[str, list[int]],
    test_recurrence: dict[str, list[int]],
    has_run_id: bool = True,
) -> tuple[str, str, list[dict]]:
    if has_run_id and not is_test_runner(check_name):
        return "deterministic", "certain", []

    signals: list[dict] = []

    check_prs = check_recurrence.get(check_name, [])
    if len(check_prs) >= 2:
        pr_list = ", ".join(f"#{n}" for n in sorted(check_prs, reverse=True)[:5])
        signals.append({
            "type": "check_recurrence",
            "strength": "high",
            "detail": f"Same check failed on {len(check_prs)} other PRs: {pr_list}",
        })

    for test in failing_tests:
        test_name = test.get("name", "")
        test_prs = test_recurrence.get(test_name, [])
        if len(test_prs) >= 2:
            pr_list = ", ".join(f"#{n}" for n in sorted(test_prs, reverse=True)[:5])
            signals.append({
                "type": "test_recurrence",
                "strength": "very_high",
                "detail": (
                    f"Test \"{test_name}\" failed on "
                    f"{len(test_prs)} other PRs: {pr_list}"
                ),
            })

    if check_name in rerun_checks:
        signals.append({
            "type": "rerun_detected",
            "strength": "high",
            "detail": "Check failed then passed on the same commit SHA (rerun)",
        })

    seen_symptoms: set[str] = set()
    for test in failing_tests:
        error = test.get("error", "")
        symptom = match_symptom(error)
        if symptom and symptom not in seen_symptoms:
            seen_symptoms.add(symptom)
            signals.append({
                "type": "symptom",
                "strength": "moderate",
                "detail": symptom,
            })

    has_strong = any(s["strength"] in ("very_high", "high") for s in signals)
    has_moderate = any(s["strength"] == "moderate" for s in signals)

    if has_strong:
        return "flaky", "high", signals
    elif has_moderate:
        return "suspected_flaky", "moderate", signals
    elif not failing_tests:
        if not has_run_id:
            signals.append({
                "type": "external_ci",
                "strength": "none",
                "detail": "External CI (not GitHub Actions) — logs not accessible for analysis",
            })
            return "external_unknown", "low", signals
        else:
            signals.append({
                "type": "no_tests_extracted",
                "strength": "none",
                "detail": "Could not extract test details from CI logs",
            })
            return "unknown", "low", signals
    else:
        return "genuine", "high", signals


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Classify PR CI failures as flaky or genuine.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  %(prog)s 1234\n"
            "  %(prog)s 1234 --deep\n"
            "  %(prog)s 1234 --since 14d\n"
        ),
    )
    parser.add_argument("pr_number", help="PR number to classify")
    parser.add_argument("--deep", action="store_true",
                        help="Fetch logs from other PRs for test-level matching (slower)")
    parser.add_argument("--since", default=None, metavar="Nd",
                        help=f"Scan window (default: {SCAN_WINDOW_DAYS}d)")
    parser.add_argument("--repo", default=None, metavar="OWNER/REPO",
                        help=f"GitHub repository (default: auto-detect or {DEFAULT_REPO})")
    args = parser.parse_args()

    repo = args.repo or detect_repo() or DEFAULT_REPO

    since_days = SCAN_WINDOW_DAYS
    if args.since:
        m = re.fullmatch(r"(\d+)d", args.since.strip())
        if m:
            since_days = int(m.group(1))
        else:
            print(json.dumps({"error": f"Invalid --since: {args.since}. Use Nd (e.g. 7d)"}))
            sys.exit(1)

    # Step 1
    print(f"Fetching CI status for PR #{args.pr_number}...", file=sys.stderr)
    failing, passing, head_sha = fetch_pr_failures(repo, args.pr_number)

    if not failing:
        print(json.dumps({
            "pr_number": int(args.pr_number),
            "head_sha": head_sha,
            "classifications": [],
            "summary": {
                "total_failures": 0, "flaky": 0, "suspected_flaky": 0,
                "genuine": 0, "deterministic": 0, "unknown": 0, "external_unknown": 0,
            },
            "scan": {"prs_scanned": 0, "window_days": since_days},
        }, indent=2))
        return

    # Step 2
    non_deterministic = [f for f in failing if is_test_runner(f["name"])]
    print(
        f"Extracting test failures from {len(non_deterministic)} "
        f"non-deterministic checks...",
        file=sys.stderr,
    )
    tests_by_check = fetch_tests_for_failures(failing)

    # Step 3
    print("Checking for reruns on this PR...", file=sys.stderr)
    rerun_checks = detect_reruns(repo, head_sha)

    # Step 4
    print(f"Scanning recent PRs ({since_days}d window)...", file=sys.stderr)
    check_recurrence, test_recurrence, prs_scanned = scan_recent_prs(
        repo, since_days, args.pr_number, deep=args.deep
    )

    # Step 5 — classify, deduplicating checks with the same name
    classifications: list[dict] = []
    seen_checks: dict[str, int] = {}
    summary: dict[str, int] = {
        "total_failures": len(failing),
        "flaky": 0,
        "suspected_flaky": 0,
        "genuine": 0,
        "deterministic": 0,
        "unknown": 0,
        "external_unknown": 0,
    }

    for f in failing:
        check_name = f["name"]
        if check_name in seen_checks:
            idx = seen_checks[check_name]
            classifications[idx]["occurrences"] += 1
            summary[classifications[idx]["classification"]] += 1
            continue

        tests = tests_by_check.get(check_name, [])
        classification, confidence, signals = classify_failure(
            check_name, tests, rerun_checks, check_recurrence, test_recurrence,
            has_run_id=bool(f.get("run_id")),
        )
        summary[classification] = summary.get(classification, 0) + 1

        seen_checks[check_name] = len(classifications)
        classifications.append({
            "check_name": check_name,
            "classification": classification,
            "confidence": confidence,
            "signals": signals,
            "occurrences": 1,
            "failing_tests": [
                {
                    "name": t["name"],
                    "file": t.get("file"),
                    "error": _truncate_error(t.get("error", "")),
                }
                for t in tests
            ],
        })

    print(json.dumps({
        "pr_number": int(args.pr_number),
        "head_sha": head_sha,
        "classifications": classifications,
        "summary": summary,
        "scan": {
            "prs_scanned": prs_scanned,
            "window_days": since_days,
        },
    }, indent=2))


if __name__ == "__main__":
    main()
