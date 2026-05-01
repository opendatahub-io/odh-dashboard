#!/usr/bin/env -S uv run --script
# /// script
# dependencies = []
# ///
"""
fetch_pr_failures.py <pr_number> [--deep]

Fetches PR metadata and identifies failing/pending CI checks.
Extracts run IDs and job IDs from GitHub Actions detail URLs.
Outputs structured JSON for Claude to analyze.

--deep additionally detects checks that previously failed then passed on the
same commit SHA (i.e. were rerun). These are not currently blocking but may
indicate a flaky test that the dev silently worked around.

Usage:
    python3 fetch_pr_failures.py 7191
    python3 fetch_pr_failures.py 7191 --deep

Output JSON shape:
    {
        "pr": { number, title, author, head_ref, base_ref, state, mergeable, review_decision },
        "summary": { total, failing, pending, passing },
        "failing_checks": [ { name, conclusion, run_id, job_id, details_url } ],
        "pending_checks": [ { name, status, run_id, job_id, details_url } ],
        "rerun_detected": [ "check name", ... ]   # only present with --deep
    }
"""

import argparse
import json
import re
import subprocess
import sys
from collections import defaultdict


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


def extract_ids(details_url: str) -> tuple[str | None, str | None]:
    """Extract (run_id, job_id) from a GitHub Actions details URL."""
    run_match = re.search(r"/runs/(\d+)", details_url or "")
    job_match = re.search(r"/job/(\d+)", details_url or "")
    return (
        run_match.group(1) if run_match else None,
        job_match.group(1) if job_match else None,
    )


def fetch_job_ids_for_run(run_id: str) -> dict[str, str]:
    """Return {job_name: databaseId} for all jobs in a run (fallback when detailsUrl lacks /job/)."""
    try:
        raw = run_gh("run", "view", run_id, "--json", "jobs")
        jobs = json.loads(raw).get("jobs", [])
        return {job["name"]: str(job["databaseId"]) for job in jobs if job.get("databaseId")}
    except SystemExit:
        return {}


def resolve_job_ids(checks: list[dict]) -> None:
    """Fill in missing job_ids by querying the run's job list. Mutates checks in place."""
    missing = [c for c in checks if c["job_id"] is None and c["run_id"] is not None]
    if not missing:
        return
    run_ids = {c["run_id"] for c in missing}
    job_map: dict[str, dict[str, str]] = {}
    for run_id in run_ids:
        job_map[run_id] = fetch_job_ids_for_run(run_id)
    for check in missing:
        jobs = job_map.get(check["run_id"], {})
        check["job_id"] = jobs.get(check["name"])


def detect_rerun_checks(repo: str, sha: str) -> list[str]:
    """
    Return sorted list of check names that failed then succeeded on this SHA.
    These were rerun — not currently blocking but may indicate a flaky test.
    Silently returns empty list on API error.
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
        return []

    by_name: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for run in check_runs:
        name = run.get("name", "")
        conclusion = (run.get("conclusion") or "").lower()
        started_at = run.get("started_at") or ""
        if name and conclusion:
            by_name[name].append((started_at, conclusion))

    rerun_checks: list[str] = []
    for name, attempts in by_name.items():
        attempts.sort(key=lambda x: x[0])
        seen_failure = False
        for _, conclusion in attempts:
            if conclusion in ("failure", "timed_out"):
                seen_failure = True
            elif conclusion == "success" and seen_failure:
                rerun_checks.append(name)
                break

    return sorted(rerun_checks)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pr_number", help="PR number to investigate")
    parser.add_argument(
        "--deep", action="store_true",
        help="Also detect checks that previously failed then passed on the same commit SHA",
    )
    args = parser.parse_args()

    fields = "number,title,author,baseRefName,headRefName,state,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup"
    if args.deep:
        fields += ",headRefOid"

    raw = run_gh("pr", "view", args.pr_number, "--json", fields)
    data = json.loads(raw)

    failing: list[dict] = []
    pending: list[dict] = []
    passing_count = 0

    for check in data.get("statusCheckRollup", []):
        conclusion = (check.get("conclusion") or "").upper()
        status = (check.get("status") or "").upper()
        details_url = check.get("detailsUrl", "")
        run_id, job_id = extract_ids(details_url)

        entry = {
            "name": check.get("name", ""),
            "conclusion": check.get("conclusion"),
            "status": check.get("status"),
            "run_id": run_id,
            "job_id": job_id,
            "details_url": details_url,
        }

        if conclusion in ("FAILURE", "TIMED_OUT"):
            failing.append(entry)
        elif conclusion == "SUCCESS":
            passing_count += 1
        elif status in ("IN_PROGRESS", "QUEUED", "WAITING", "REQUESTED", "PENDING"):
            pending.append(entry)

    resolve_job_ids(failing)
    resolve_job_ids(pending)

    state = data["state"]
    merge_state_status = data.get("mergeStateStatus")

    output: dict = {
        "pr": {
            "number": data["number"],
            "title": data["title"],
            "author": data["author"]["login"],
            "head_ref": data["headRefName"],
            "base_ref": data["baseRefName"],
            "state": state,
            "merge_state_status": merge_state_status,
            # True when the PR merged with at least one failing check still recorded.
            # Indicates the failing check(s) were not required for merge (or an admin bypassed them).
            "merged_despite_failures": state == "MERGED" and len(failing) > 0,
            # For open PRs: UNSTABLE = failing checks are non-required (merge still possible);
            # BLOCKED = failing checks are required (merge is gated).
            "mergeable": data.get("mergeable"),
            "review_decision": data.get("reviewDecision"),
        },
        "summary": {
            "total": len(data.get("statusCheckRollup", [])),
            "failing": len(failing),
            "pending": len(pending),
            "passing": passing_count,
        },
        "failing_checks": failing,
        "pending_checks": pending,
    }

    if args.deep:
        head_sha = data.get("headRefOid", "")
        repo_raw = run_gh("repo", "view", "--json", "nameWithOwner")
        repo = json.loads(repo_raw).get("nameWithOwner", "")
        output["rerun_detected"] = detect_rerun_checks(repo, head_sha) if repo and head_sha else []

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
