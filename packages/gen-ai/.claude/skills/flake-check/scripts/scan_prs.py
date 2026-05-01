#!/usr/bin/env -S uv run --script
# /// script
# dependencies = []
# ///
"""
scan_prs.py [--since DATE|Nd] [--until DATE|Nd] [--limit N] [--deep] [--include-bots] [--repo owner/name]

Surveys recent PRs for CI failures without fetching any CI logs (lightweight).
Groups failures by check name across PRs to surface recurring patterns.

Date arguments accept either an ISO date (2026-04-01) or a relative expression
like "7d" (7 days ago) or "2w" (2 weeks ago).

Check status is fetched per PR via the REST check-runs API (one call per PR).
This avoids GraphQL timeout issues caused by statusCheckRollup on repos with
large matrix job suites.

--deep additionally detects rerun patterns: checks that failed then passed on
the same commit SHA (without new code being pushed). It also fetches CI logs
for all failing checks not excluded by _DETERMINISTIC_PREFIXES to surface
test-level recurrence (test_patterns). Both analyses run on already-fetched
data or share the same log-fetching pass, so the extra cost is only the log
fetches themselves.

--file implies --deep: it runs the same rerun detection, log fetching (for
checks not excluded by _DETERMINISTIC_PREFIXES), and test-level pattern
analysis, then applies the filename as a post-step filter so only PRs where
that file appeared in failures are returned.

Usage:
    python3 scan_prs.py                          # last 7 days (default)
    python3 scan_prs.py --since 7d               # PRs created in the last 7 days
    python3 scan_prs.py --since 14d --until 7d   # PRs from 7-14 days ago
    python3 scan_prs.py --since 2026-04-01 --until 2026-04-15
    python3 scan_prs.py --limit 30
    python3 scan_prs.py --since 7d --deep        # rerun detection + test-level patterns
    python3 scan_prs.py --file pipelineRuns.cy.ts  # same as --deep, filtered by file

Output JSON shape:
    {
        "repo": "owner/name",
        "scanned": N,
        "bots_excluded": N,
        "with_failures": N,
        "all_passing_count": N,
        "filters": { "since": "2026-04-10", "until": null, "limit": null, "bots_excluded": true, "deep": false },
        "prs": [
            {
                "number": 7191,
                "title": "...",
                "author": "...",
                "state": "OPEN",
                "created_at": "...",
                "head_sha": "abc123",
                "failing_checks": [ { "name": "...", "conclusion": "..." } ],
                "passing_count": N,
                "pending_count": N
            }
        ],
        "patterns": [
            {
                "check_name": "Cypress-Mock-Tests (mcpCatalog, ...)",
                "failure_count": 3,
                "pr_numbers": [7190, 7191, 7194]
            }
        ],
        "rerun_patterns": [   # present with --deep or --file (--file implies --deep)
            {
                "check_name": "Cypress-Mock-Tests (mcpCatalog, ...)",
                "rerun_count": 4,
                "pr_numbers": [7190, 7191, 7194, 7200]
            }
        ],
        "test_patterns": [   # present with --deep or --file; tests that failed on 2+ PRs
            {
                "test_name": "User can create a pipeline run",
                "file": "packages/cypress/cypress/tests/mocked/pipelines/pipelineCreateRuns.cy.ts",
                "failure_count": 3,
                "pr_numbers": [7200, 7300, 7350],
                "errors": ["Timed out retrying after 4000ms"]
            }
        ]
    }
"""

import argparse
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta


# Absolute path to the skill root (parent of scripts/)
_SKILL_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Check name prefixes that are deterministic and never need log analysis
_DETERMINISTIC_PREFIXES = (
    "Lint",
    "Type-Check",
    "Build ",
    "Application Quality Gate",
    "kustomize",
    "Changelog",
    "DCO",
)


def _extract_run_job_ids(html_url: str) -> tuple[str | None, str | None]:
    """Extract (run_id, job_id) from a GitHub Actions check run URL."""
    m = re.search(r"/actions/runs/(\d+)/job/(\d+)", html_url or "")
    return (m.group(1), m.group(2)) if m else (None, None)


def _is_test_runner(name: str) -> bool:
    """Return True if the check name suggests a non-deterministic test runner."""
    return not any(name.startswith(p) for p in _DETERMINISTIC_PREFIXES)


def _fetch_tests_for_check(run_id: str, job_id: str | None) -> list[dict]:
    """Call fetch_test_failures.py and return its failing_tests list."""
    script = os.path.join(_SKILL_ROOT, "scripts", "fetch_test_failures.py")
    cmd = ["python3", script, run_id]
    if job_id:
        cmd += ["--job", job_id]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return json.loads(r.stdout).get("failing_tests", [])
    except Exception:
        return []


# Login-based bot list for accounts whose __typename is not "Bot" (e.g. service accounts)
_BOT_LOGINS = {
    "openshift-cherrypick-robot",
    "renovate",
    "renovate[bot]",
    "dependabot",
    "dependabot[bot]",
    "app/dependabot",       # GitHub App format seen in some gh CLI versions
    "github-actions[bot]",
}


def _is_bot(author: dict) -> bool:
    """Return True if the PR author is a bot or automation account."""
    # __typename == "Bot" covers all GitHub Apps (dependabot, renovate, etc.)
    if author.get("__typename") == "Bot":
        return True
    return author.get("login", "").lower() in _BOT_LOGINS


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


def detect_repo() -> str | None:
    """Detect GitHub repo from git remotes.

    Tries 'upstream' first (standard fork convention), then falls back to
    'origin'. This ensures PRs are scanned against the canonical repo, not
    a personal fork.
    """
    def _parse(remote: str) -> str | None:
        try:
            result = subprocess.run(
                ["git", "remote", "get-url", remote],
                capture_output=True, text=True, check=True,
            )
            url = result.stdout.strip()
            match = re.search(r"github\.com[:/](.+?)(?:\.git)?$", url)
            return match.group(1) if match else None
        except subprocess.CalledProcessError:
            return None

    return _parse("upstream") or _parse("origin")


def parse_date_arg(value: str) -> date:
    """Parse a date argument: ISO date string or relative expression (7d, 2w)."""
    relative = re.fullmatch(r"(\d+)([dw])", value.strip().lower())
    if relative:
        n, unit = int(relative.group(1)), relative.group(2)
        delta = timedelta(days=n if unit == "d" else n * 7)
        return date.today() - delta
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid date '{value}'. Use ISO format (2026-04-01) or relative (7d, 2w)."
        )


def fetch_pr_check_summary(
    repo: str, sha: str, detect_reruns: bool = False
) -> tuple[list[dict], int, int, set[str]]:
    """
    Fetch check run status for a commit SHA via the REST check-runs API.

    Returns: (failing_checks, passing_count, pending_count, rerun_checks)
    - failing_checks: list of {name, conclusion} for checks whose latest attempt failed/timed_out
    - passing_count: number of checks whose latest attempt succeeded
    - pending_count: number of checks whose latest attempt is still in progress / queued
    - rerun_checks: check names that failed then succeeded (only populated when detect_reruns=True)

    Silently returns empty results on API error so one bad PR doesn't abort the scan.
    """
    try:
        check_runs: list[dict] = []
        page = 1
        while True:
            raw = run_gh("api", f"repos/{repo}/commits/{sha}/check-runs?per_page=100&filter=all&page={page}")
            data = json.loads(raw)
            runs = data.get("check_runs", [])
            check_runs.extend(runs)
            if len(runs) < 100:
                break
            page += 1
    except (SystemExit, json.JSONDecodeError):
        return [], 0, 0, set()

    # Group all attempts by check name in chronological order; include pending runs using
    # status as state so an in-progress rerun is not double-counted as both failing and pending.
    by_name: dict[str, list[tuple[str, str, str]]] = defaultdict(list)

    _pending_statuses = frozenset(("in_progress", "queued", "waiting", "requested", "pending"))

    for run in check_runs:
        name = run.get("name", "")
        conclusion = (run.get("conclusion") or "").lower()
        status = (run.get("status") or "").lower()
        started_at = run.get("started_at") or ""
        html_url = run.get("html_url") or ""

        if not name:
            continue

        state = conclusion if conclusion else status
        if state:
            by_name[name].append((started_at, state, html_url))

    failing: list[dict] = []
    passing_count = 0
    pending_count = 0
    rerun_checks: set[str] = set()

    for name, attempts in by_name.items():
        attempts.sort(key=lambda x: x[0])  # chronological order

        if detect_reruns:
            seen_failure = False
            for _, state, _ in attempts:
                if state in ("failure", "timed_out"):
                    seen_failure = True
                elif state == "success" and seen_failure:
                    rerun_checks.add(name)
                    break

        _, latest, latest_url = attempts[-1]
        run_id, job_id = _extract_run_job_ids(latest_url)
        if latest in ("failure", "timed_out"):
            failing.append({"name": name, "conclusion": latest, "run_id": run_id, "job_id": job_id})
        elif latest == "success":
            passing_count += 1
        elif latest in _pending_statuses:
            pending_count += 1

    return failing, passing_count, pending_count, rerun_checks


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since", type=parse_date_arg, default=None, metavar="DATE|Nd",
                        help="Only include PRs created on or after this date (e.g. 7d, 2026-04-01)")
    parser.add_argument("--until", type=parse_date_arg, default=None, metavar="DATE|Nd",
                        help="Only include PRs created before this date (e.g. 7d, 2026-04-15)")
    parser.add_argument("--limit", type=int, default=None,
                        help="Hard cap on number of PRs after filtering (default: 50 with --since, 20 otherwise)")
    parser.add_argument("--deep", action="store_true",
                        help="Detect rerun patterns: checks that failed then passed on the same SHA")
    parser.add_argument("--include-bots", action="store_true",
                        help="Include bot/automation PRs (excluded by default)")
    parser.add_argument("--repo", default=None, help="GitHub repo in owner/name format")
    parser.add_argument("--file", default=None, metavar="FILENAME",
                        help="Filter to PRs where this filename appeared in failing test logs (fetches CI logs — slower)")
    args = parser.parse_args()
    run_deep = args.deep or bool(args.file)

    repo = args.repo or detect_repo()
    if not repo:
        print(json.dumps({"error": "Could not detect GitHub repo. Pass --repo owner/name explicitly."}))
        sys.exit(1)

    if args.since is None and args.until is None:
        args.since = parse_date_arg("7d")

    effective_limit = args.limit or (50 if args.since else 20)

    # Fetch PR metadata only — check status is fetched per PR below via REST.
    # Omitting statusCheckRollup avoids GraphQL timeouts on repos with large matrix suites.
    gh_args = [
        "pr", "list",
        "--repo", repo,
        # Fetch one extra PR so we can detect whether the limit was hit
        "--limit", str(effective_limit + 1),
        "--state", "all",
        "--json", "number,title,author,createdAt,state,headRefOid",
    ]

    search_parts = []
    if args.since:
        search_parts.append(f"created:>={args.since.isoformat()}")
    if args.until:
        # Include in the search query so the API scopes results to the window,
        # preventing newer PRs from consuming the result budget before we reach
        # the target window (the search API sorts by recency of update by default).
        search_parts.append(f"created:<{args.until.isoformat()}")
    if search_parts:
        gh_args += ["--search", " ".join(search_parts)]

    raw = run_gh(*gh_args)
    prs_raw: list[dict] = json.loads(raw)

    # limit_hit must be checked on the raw pre-filter list; filtering below reduces
    # the count so checking after would produce a false negative.
    limit_hit = len(prs_raw) > effective_limit
    prs_raw = prs_raw[:effective_limit]

    # Client-side --until filter as a safety net (search query already scopes this,
    # but keep the guard in case gh CLI doesn't forward the query correctly).
    if args.until:
        until_iso = args.until.isoformat()
        prs_raw = [p for p in prs_raw if p["createdAt"][:10] < until_iso]

    # Client-side bot filter
    bots_excluded = 0
    if not args.include_bots:
        filtered = []
        for pr in prs_raw:
            if _is_bot(pr["author"]):
                bots_excluded += 1
            else:
                filtered.append(pr)
        prs_raw = filtered

    pr_results: list[dict] = []
    all_passing_count = 0
    # check_name -> PR numbers where it was the latest failing conclusion
    failure_index: dict[str, list[int]] = defaultdict(list)
    # check_name -> PR numbers where it failed then succeeded on the same SHA (--deep only)
    rerun_index: dict[str, list[int]] = defaultdict(list)

    # Fetch check run status for all PRs in parallel (one REST call per PR).
    check_results: dict[int, tuple[list[dict], int, int, set[str]]] = {}
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(
                fetch_pr_check_summary, repo, pr["headRefOid"], run_deep
            ): pr["number"]
            for pr in prs_raw
            if pr.get("headRefOid")
        }
        for future in as_completed(futures):
            check_results[futures[future]] = future.result()

    for pr in prs_raw:
        failing, passing_count, pending_count, rerun_checks = check_results.get(
            pr["number"], ([], 0, 0, set())
        )

        for check in failing:
            failure_index[check["name"]].append(pr["number"])

        if not failing:
            all_passing_count += 1

        for check_name in rerun_checks:
            rerun_index[check_name].append(pr["number"])

        pr_results.append({
            "number": pr["number"],
            "title": pr["title"],
            "author": pr["author"]["login"],
            "state": pr["state"],
            "created_at": pr["createdAt"],
            "head_sha": pr.get("headRefOid", ""),
            "failing_checks": failing,
            "passing_count": passing_count,
            "pending_count": pending_count,
        })

    # Preserve original scan count before any file-level filtering
    scanned_count = len(pr_results)

    # Fetch test-level logs for all failing checks not excluded by _DETERMINISTIC_PREFIXES
    # when --deep or --file is set. A single shared fetch covers both flags.
    all_pr_tests: dict[int, list[dict]] = defaultdict(list)
    if run_deep:
        fetch_tasks = [
            (pr["number"], check["run_id"], check.get("job_id"))
            for pr in pr_results
            for check in pr["failing_checks"]
            if _is_test_runner(check["name"]) and check.get("run_id")
        ]
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures_map = {
                executor.submit(_fetch_tests_for_check, run_id, job_id): pr_number
                for pr_number, run_id, job_id in fetch_tasks
            }
            for future in as_completed(futures_map):
                all_pr_tests[futures_map[future]].extend(future.result())

    # --file: filter pr_results to only PRs where the target file appeared in failures;
    # annotate each with matched_tests and rebuild failure_index over the reduced set.
    if args.file:
        filtered: list[dict] = []
        for pr in pr_results:
            matched = [
                t for t in all_pr_tests.get(pr["number"], [])
                if args.file.lower() in (t.get("file") or "").lower()
            ]
            if matched:
                pr["matched_tests"] = matched
                filtered.append(pr)
        pr_results = filtered
        remaining_pr_numbers = {pr["number"] for pr in pr_results}
        failure_index = defaultdict(list)
        for pr in pr_results:
            for check in pr["failing_checks"]:
                failure_index[check["name"]].append(pr["number"])
        rerun_index = defaultdict(
            list,
            {
                name: [n for n in pr_nums if n in remaining_pr_numbers]
                for name, pr_nums in rerun_index.items()
            },
        )

    patterns = [
        {
            "check_name": name,
            "failure_count": len(pr_nums),
            "pr_numbers": sorted(pr_nums, reverse=True),
        }
        for name, pr_nums in sorted(failure_index.items(), key=lambda kv: -len(kv[1]))
        if len(pr_nums) > 1
    ]

    with_failures = len(pr_results) if args.file else sum(1 for p in pr_results if p["failing_checks"])

    output: dict = {
        "repo": repo,
        "scanned": scanned_count,
        "bots_excluded": bots_excluded,
        "with_failures": with_failures,
        "all_passing_count": all_passing_count,
        "filters": {
            "since": args.since.isoformat() if args.since else None,
            "until": args.until.isoformat() if args.until else None,
            "limit": effective_limit,
            "limit_hit": limit_hit,
            "bots_excluded": not args.include_bots,
            "deep": run_deep,
            "file_filter": args.file,
        },
        "prs": pr_results,
        "patterns": patterns,
    }

    if run_deep:
        output["rerun_patterns"] = [
            {
                "check_name": name,
                "rerun_count": len(pr_nums),
                "pr_numbers": sorted(pr_nums, reverse=True),
            }
            for name, pr_nums in sorted(rerun_index.items(), key=lambda kv: -len(kv[1]))
            if len(pr_nums) >= 2
        ]

        # Build test-level patterns from the shared log fetch.
        # --file mode: use only the file-matched tests stored in pr["matched_tests"].
        # --deep mode: use all fetched tests across all PRs.
        test_index: dict[tuple[str, str], dict] = {}
        for pr in pr_results:
            tests = pr.get("matched_tests", []) if args.file else all_pr_tests.get(pr["number"], [])
            for t in tests:
                name = t.get("name", "")
                if not name:
                    continue
                file = t.get("file") or ""
                key = (file, name)
                if key not in test_index:
                    test_index[key] = {"file": file, "name": name, "pr_numbers": [], "errors": []}
                entry = test_index[key]
                if pr["number"] not in entry["pr_numbers"]:
                    entry["pr_numbers"].append(pr["number"])
                err = t.get("error", "")
                if err and err not in entry["errors"]:
                    entry["errors"].append(err)

        output["test_patterns"] = [
            {
                "test_name": data["name"],
                "file": data["file"],
                "failure_count": len(data["pr_numbers"]),
                "pr_numbers": sorted(data["pr_numbers"], reverse=True),
                "errors": data["errors"],
            }
            for (_file, _name), data in sorted(test_index.items(), key=lambda kv: -len(kv[1]["pr_numbers"]))
            if len(data["pr_numbers"]) >= 2
        ]

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
