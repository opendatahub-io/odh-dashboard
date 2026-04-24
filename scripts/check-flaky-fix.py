#!/usr/bin/env python3
"""
check-flaky-fix.py — Verify whether a flaky test fix is actually working on main.

Usage:
    scripts/check-flaky-fix.py RHOAIENG-58263
    scripts/check-flaky-fix.py 7252
    scripts/check-flaky-fix.py 7252 --job "Cypress-Mock-Tests (pipelines"
    scripts/check-flaky-fix.py 7252 --test "uploads fails with argo workflow"
    scripts/check-flaky-fix.py 7252 --repo owner/other-repo

How it works:
  1. Resolves a Jira key or PR number to the fix PR
  2. Auto-detects which CI job was failing on the fix PR
  3. Extracts the failing test name(s) from the CI logs
     — if the fix PR's CI passed (flaky test didn't fire), falls back to
       scanning pre-fix failures for the test name automatically
  4. Computes a PRE-FIX baseline: failure rate in the 50 most recent runs
     before the fix, for comparison
  5. Checks the POST-FIX: 50 most recent CI runs that include the fix commit
     (verified via git ancestry on the check run's head_sha)
  6. Reports before/after comparison and a FIXED / STILL FLAKY verdict

All check-run fetching is parallelised for speed.
"""

import argparse
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

DEFAULT_REPO = "opendatahub-io/odh-dashboard"
SAMPLE_SIZE = 50          # runs to check on each side of the fix
PARALLEL_WORKERS = 8      # concurrent GitHub API requests

# Set by main() after argument parsing — used by all helpers below
REPO = DEFAULT_REPO

SKIP_JOB_KEYWORDS = {
    "lint", "build", "setup", "combine", "upload", "image", "mirror",
    "konflux", "prow", "tide", "codecov", "coderabbit", "contract",
    "get-test", "maas", "bff",
}
TEST_JOB_KEYWORDS = {"cypress", "unit-test", "unit_test", "jest", "spec"}


# ── Utilities ──────────────────────────────────────────────────────────────────

def run_cmd(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True)


def gh_json(*args) -> dict | list:
    r = run_cmd(["gh"] + list(args))
    if r.returncode != 0:
        return {}
    try:
        return json.loads(r.stdout)
    except (json.JSONDecodeError, ValueError):
        return {}


def strip_ansi(text: str) -> str:
    return re.sub(r"\x1b\[[0-9;]*[mGKHF]", "", text)


def run_id_from_url(url: str) -> Optional[str]:
    m = re.search(r"/runs/(\d+)", url or "")
    return m.group(1) if m else None


# ── Preflight checks ──────────────────────────────────────────────────────────

def preflight_checks() -> None:
    """Fail fast with a clear message if prerequisites aren't met."""
    errors: list[str] = []

    # gh CLI installed?
    if run_cmd(["gh", "--version"]).returncode != 0:
        errors.append("  • 'gh' CLI not found. Install from https://cli.github.com/")
    else:
        # gh authenticated?
        r = run_cmd(["gh", "auth", "status"])
        if r.returncode != 0:
            errors.append("  • 'gh' CLI is not authenticated. Run: gh auth login")

    # Inside a git repo?
    if run_cmd(["git", "rev-parse", "--git-dir"]).returncode != 0:
        errors.append("  • Not inside a git repository. Run from the odh-dashboard repo root.")
    else:
        # Remote points to the right repo?
        r = run_cmd(["git", "remote", "-v"])
        if REPO not in r.stdout:
            errors.append(
                f"  • No remote pointing to {REPO} found.\n"
                f"    Add one with: git remote add upstream git@github.com:{REPO}.git"
            )

    if errors:
        print("❌ Preflight checks failed:\n" + "\n".join(errors))
        sys.exit(1)


# ── Git helpers ────────────────────────────────────────────────────────────────

def find_upstream_remote() -> str:
    r = run_cmd(["git", "remote", "-v"])
    for line in r.stdout.splitlines():
        if REPO in line and "(fetch)" in line:
            return line.split()[0]
    return "upstream"


def fetch_main(remote: str) -> None:
    print(f"Fetching {remote}/main to ensure local git history is current...")
    run_cmd(["git", "fetch", remote, "main"])


def fix_is_ancestor(fix_sha: str, target_sha: str) -> bool:
    r = run_cmd(["git", "merge-base", "--is-ancestor", fix_sha, target_sha])
    return r.returncode == 0


# ── GitHub API helpers ─────────────────────────────────────────────────────────

def get_check_runs(commit_sha: str) -> list[dict]:
    data = gh_json("api", f"repos/{REPO}/commits/{commit_sha}/check-runs?per_page=100")
    return data.get("check_runs", []) if isinstance(data, dict) else []


def find_job_in_check_runs(check_runs: list[dict], job_pattern: str) -> Optional[dict]:
    pattern = job_pattern.lower()
    for cr in check_runs:
        if pattern in cr["name"].lower():
            return cr
    return None


def fetch_check_runs_parallel(prs: list[dict]) -> dict[int, list[dict]]:
    """Fetch check runs for all PRs in parallel. Returns {pr_number: [check_runs]}."""
    results: dict[int, list[dict]] = {}

    def _fetch(pr: dict) -> tuple[int, list[dict]]:
        sha = pr.get("mergeCommit", {}).get("oid", "")
        return pr["number"], get_check_runs(sha) if sha else []

    with ThreadPoolExecutor(max_workers=PARALLEL_WORKERS) as ex:
        for pr_num, runs in ex.map(_fetch, prs):
            results[pr_num] = runs

    return results


# ── Fix PR resolution ──────────────────────────────────────────────────────────

def resolve_fix_pr(input_str: str) -> tuple[int, str]:
    if re.fullmatch(r"\d+", input_str):
        data = gh_json("pr", "view", input_str, "--repo", REPO,
                       "--json", "number,title,state")
        if not data:
            sys.exit(f"PR #{input_str} not found.")
        if data.get("state") != "MERGED":
            sys.exit(f"PR #{input_str} is not merged (state: {data.get('state')}).")
        return data["number"], data["title"]

    print(f"Searching GitHub for merged PR with key {input_str}...")
    results = gh_json("search", "prs", input_str, "--repo", REPO,
                      "--json", "number,title,state", "--limit", "10")
    merged = [p for p in (results or []) if p.get("state") == "MERGED"]
    if not merged:
        sys.exit(f"No merged PR found for Jira key {input_str}.")
    if len(merged) > 1:
        print("Multiple merged PRs found:")
        for p in merged:
            print(f"  #{p['number']}: {p['title']}")
        sys.exit("Pass a PR number directly to disambiguate.")
    return merged[0]["number"], merged[0]["title"]


# ── CI job auto-detection ──────────────────────────────────────────────────────

def detect_failing_test_job(fix_commit: str) -> Optional[dict]:
    """Find the CI test job that failed on the fix PR's own CI run."""
    check_runs = get_check_runs(fix_commit)
    candidates = []
    for cr in check_runs:
        name_lower = cr["name"].lower()
        if cr.get("conclusion") != "failure":
            continue
        if any(kw in name_lower for kw in SKIP_JOB_KEYWORDS):
            continue
        if any(kw in name_lower for kw in TEST_JOB_KEYWORDS):
            candidates.append(cr)
    return candidates[0] if candidates else None


def infer_job_from_changed_files(pr_number: int, fix_commit: str) -> Optional[dict]:
    """
    Fallback: derive the CI job from .cy.ts files changed in the fix PR.
    The CI workflow maps test directory → job name 1:1, e.g.:
      cypress/tests/mocked/projects/tabs/ → Cypress-Mock-Tests (projects/tabs, ...)
    """
    files_data = gh_json("pr", "view", str(pr_number), "--repo", REPO, "--json", "files")
    changed_files = [f["path"] for f in (files_data.get("files") or [])]

    dir_segments: list[str] = []
    for path in changed_files:
        m = re.search(r"cypress/tests/(?:mocked|e2e)/(.+)/[^/]+\.cy\.ts$", path)
        if m:
            segment = m.group(1)
            if segment not in dir_segments:
                dir_segments.append(segment)

    if not dir_segments:
        return None

    check_runs = get_check_runs(fix_commit)
    for segment in dir_segments:
        for cr in check_runs:
            if segment.lower() in cr["name"].lower():
                return cr
    return None


# ── Test name extraction ───────────────────────────────────────────────────────

def extract_failing_tests(run_id: str) -> list[str]:
    """
    Parse Cypress or Jest failure summaries from a GitHub Actions run log.
    Returns a list of "Describe > test name" strings.
    """
    r = run_cmd(["gh", "run", "view", run_id, "--repo", REPO, "--log-failed"])
    if r.returncode != 0 or not r.stdout.strip():
        return []

    # GitHub Actions log format: "job\tSTEP\ttimestamp [N] log" (3 parts)
    # or occasionally "job\tSTEP\ttimestamp\tlog" (4 parts).
    clean_lines = []
    for line in r.stdout.splitlines():
        parts = line.split("\t", 3)
        if len(parts) == 4:
            content = parts[3]
        elif len(parts) == 3:
            content = re.sub(r"^\S+Z\s*", "", parts[2])
        else:
            content = line
        content = strip_ansi(content)
        # Strip "[N] " runner prefix but preserve Cypress indentation
        content = re.sub(r"^\[\d+\] ", "", content)
        clean_lines.append(content)

    tests: list[str] = []

    # Cypress: "  1) Describe\n       test name:"
    in_failing = False
    describe = None
    for line in clean_lines:
        stripped = line.strip()
        if re.match(r"\d+ failing", stripped):
            in_failing = True
            describe = None
            continue
        if not in_failing:
            continue
        m = re.match(r"\s*\d+\)\s+(.+)", line)
        if m:
            describe = m.group(1).strip()
            continue
        if describe and re.match(r"\s{5,}\S", line):
            m = re.match(r"\s+(.+):\s*$", line)
            if m:
                candidate = m.group(1).strip()
                if not re.match(r"(AssertionError|Error|TypeError|expected)", candidate):
                    full = f"{describe} > {candidate}"
                    if full not in tests:
                        tests.append(full)
                    describe = None

    # Jest: "  ● Suite › test name"
    for line in clean_lines:
        m = re.match(r"\s*●\s+(.+?)\s+›\s+(.+)", line.strip())
        if m:
            full = f"{m.group(1).strip()} > {m.group(2).strip()}"
            if full not in tests:
                tests.append(full)

    return tests


def find_test_in_pre_fix_failures(
    pre_fix_prs: list[dict],
    pr_check_runs: dict[int, list[dict]],
    job_pattern: str,
) -> list[str]:
    """
    Fallback: scan the most recent pre-fix CI failures to extract the test name.
    Used when the fix PR's own CI passed (flaky test didn't fire that run).
    """
    # Take up to 15 most-recent pre-fix PRs that failed the job
    checked = 0
    for pr in pre_fix_prs:
        if checked >= 15:
            break
        runs = pr_check_runs.get(pr["number"], [])
        cr = find_job_in_check_runs(runs, job_pattern)
        if not cr or cr.get("conclusion") != "failure":
            continue
        checked += 1
        run_id = run_id_from_url(cr.get("details_url"))
        if not run_id:
            continue
        tests = extract_failing_tests(run_id)
        if tests:
            print(f"Test     {tests[0]}  (extracted from pre-fix failure on PR #{pr['number']})")
            return tests
    return []


def log_contains_test(run_id: str, test_patterns: list[str]) -> Optional[bool]:
    if not run_id or not test_patterns:
        return None
    r = run_cmd(["gh", "run", "view", run_id, "--repo", REPO, "--log-failed"])
    if r.returncode != 0 or not r.stdout.strip():
        return None
    log = strip_ansi(r.stdout).lower()
    return any(p.split(" > ")[-1].lower() in log for p in test_patterns)


# ── PR collection ──────────────────────────────────────────────────────────────

def collect_prs(fix_merged_at: str) -> tuple[list[dict], list[dict]]:
    """
    Return (pre_fix_prs, post_fix_prs), each sorted newest-first.
    Fetches once from the API and splits by fix date.
    """
    raw = gh_json("pr", "list", "--repo", REPO, "--state", "merged", "--base", "main",
                  "--limit", "500", "--json", "number,mergedAt,mergeCommit")
    all_prs = raw or []

    pre_fix = sorted(
        [p for p in all_prs if p.get("mergedAt", "") < fix_merged_at],
        key=lambda p: p["mergedAt"],
        reverse=True,   # newest pre-fix PRs first
    )
    post_fix = sorted(
        [p for p in all_prs if p.get("mergedAt", "") > fix_merged_at],
        key=lambda p: p["mergedAt"],
        reverse=True,   # newest post-fix PRs first
    )
    return pre_fix, post_fix


# ── Result processing ──────────────────────────────────────────────────────────

def process_prs(
    prs: list[dict],
    pr_check_runs: dict[int, list[dict]],
    job_pattern: str,
    fix_commit: Optional[str],      # None = pre-fix (skip ancestry check)
    test_patterns: list[str],
    verbose: bool,
    label: str,
) -> list[dict]:
    """
    Walk through PRs, apply ancestry + job checks, confirm failing tests,
    and print each row. Returns list of conclusive result dicts.
    """
    results: list[dict] = []
    skipped_no_fix = 0
    skipped_no_job = 0

    for pr in prs:
        if len(results) >= SAMPLE_SIZE:
            break

        runs = pr_check_runs.get(pr["number"], [])
        cr = find_job_in_check_runs(runs, job_pattern)
        if not cr:
            skipped_no_job += 1
            if verbose:
                print(f"  #{pr['number']:5}  {pr['mergedAt'][:10]}  ⏭  CI job not found")
            continue

        # Ancestry check (post-fix only)
        if fix_commit is not None:
            ci_sha = cr.get("head_sha") or pr.get("mergeCommit", {}).get("oid", "")
            if not fix_is_ancestor(fix_commit, ci_sha):
                skipped_no_fix += 1
                if verbose:
                    print(f"  #{pr['number']:5}  {pr['mergedAt'][:10]}  ⏭  fix not in CI commit ({ci_sha[:8]})")
                continue

        conclusion = cr.get("conclusion") or "pending"
        run_id = run_id_from_url(cr.get("details_url"))
        details_url = cr.get("details_url", "")
        conclusive = conclusion in ("success", "failure")

        same_test: Optional[bool] = None
        if conclusion == "failure" and test_patterns and run_id:
            same_test = log_contains_test(run_id, test_patterns)

        if conclusive:
            results.append({
                "pr": pr["number"],
                "date": pr["mergedAt"][:10],
                "conclusion": conclusion,
                "same_test": same_test,
                "url": details_url,
            })

        icon = "✅" if conclusion == "success" else "❌" if conclusion == "failure" else "⏳"
        note = ""
        if conclusion == "failure":
            if same_test is True:
                note = "  ← same flaky test"
            elif same_test is False:
                note = "  (different failure)"
            elif same_test is None:
                note = "  (could not confirm test)"
        url_suffix = f"\n           {details_url}" if conclusion == "failure" and details_url else ""
        print(f"  #{pr['number']:5}  {pr['mergedAt'][:10]}  {icon} {conclusion}{note}{url_suffix}")

    if skipped_no_fix:
        print(f"  (skipped {skipped_no_fix} {label} — fix absent from CI commit)")
    if skipped_no_job:
        print(f"  (skipped {skipped_no_job} {label} — CI job not run)")

    return results


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify whether a flaky test fix is working on main.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  %(prog)s RHOAIENG-58263\n"
            "  %(prog)s 7252\n"
            "  %(prog)s 7252 --job 'Cypress-Mock-Tests (pipelines'\n"
            "  %(prog)s 7252 --test 'uploads fails with argo workflow'\n"
        ),
    )
    parser.add_argument("input", help="Jira key (RHOAIENG-XXXXX) or fix PR number")
    parser.add_argument("--job", metavar="PATTERN",
                        help="CI job name pattern (overrides auto-detection)")
    parser.add_argument("--test", metavar="PATTERN",
                        help="Test name to confirm in failure logs (overrides auto-extraction)")
    parser.add_argument("--repo", default=DEFAULT_REPO, metavar="OWNER/REPO",
                        help=f"GitHub repository (default: {DEFAULT_REPO})")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Show skipped PRs")
    args = parser.parse_args()

    global REPO
    REPO = args.repo

    preflight_checks()

    # ── 1. Resolve fix PR ────────────────────────────────────────────────
    pr_number, pr_title = resolve_fix_pr(args.input)
    pr_info = gh_json("pr", "view", str(pr_number), "--repo", REPO,
                      "--json", "mergeCommit,mergedAt")
    fix_commit = pr_info.get("mergeCommit", {}).get("oid", "")
    fix_merged_at = pr_info.get("mergedAt", "")
    if not fix_commit:
        sys.exit("Could not resolve merge commit for fix PR.")

    print(f"\nFix PR   #{pr_number} — {pr_title}")
    print(f"Commit   {fix_commit[:12]}  (merged {fix_merged_at[:10]})")

    # ── 2. Ensure local git is up to date ────────────────────────────────
    remote = find_upstream_remote()
    fetch_main(remote)

    # ── 3. Detect CI job ─────────────────────────────────────────────────
    fix_job_run_id: Optional[str] = None
    if args.job:
        job_pattern = args.job
        print(f"\nJob      {job_pattern}  (manual)")
    else:
        print("\nAuto-detecting failing CI job on fix PR...")
        job_cr = detect_failing_test_job(fix_commit)
        if not job_cr:
            print("No failing job on fix PR CI (test passed that run — flakiness).")
            print("Inferring job from changed test files...")
            job_cr = infer_job_from_changed_files(pr_number, fix_commit)
        if not job_cr:
            sys.exit(
                "Could not infer CI job automatically.\n"
                "Use --job <pattern> to specify the job name manually.\n"
                "Tip: check which directory your .cy.ts file lives in:\n"
                "  cypress/tests/mocked/projects/tabs/ → --job 'projects/tabs'"
            )
        job_pattern = job_cr["name"]
        fix_job_run_id = run_id_from_url(job_cr.get("details_url"))
        print(f"Job      {job_pattern}")

    # ── 4. Collect all candidate PRs in one API call ──────────────────────
    print(f"\nFetching merged PRs around {fix_merged_at[:10]}...")
    pre_fix_prs, post_fix_prs = collect_prs(fix_merged_at)
    print(f"Found {len(pre_fix_prs)} pre-fix and {len(post_fix_prs)} post-fix candidates.")

    # ── 5. Parallel-fetch check runs for all candidates ───────────────────
    # Limit candidates passed to the parallel fetch to avoid excess API calls
    pre_candidates = pre_fix_prs[:150]
    post_candidates = post_fix_prs[:150]
    all_candidates = pre_candidates + post_candidates

    print(f"Fetching CI check runs in parallel ({PARALLEL_WORKERS} workers)...")
    pr_check_runs = fetch_check_runs_parallel(all_candidates)

    # ── 6. Extract failing test name(s) ───────────────────────────────────
    if args.test:
        test_patterns = [args.test]
        print(f"Test     {args.test}  (manual)")
    elif fix_job_run_id:
        print("Extracting failing test names from fix PR CI logs...")
        test_patterns = extract_failing_tests(fix_job_run_id)
        if test_patterns:
            for t in test_patterns:
                print(f"Test     {t}")
        else:
            # Fallback: scan recent pre-fix failures for the test name
            print("Could not extract from fix PR logs. Scanning pre-fix failures...")
            test_patterns = find_test_in_pre_fix_failures(
                pre_candidates, pr_check_runs, job_pattern
            )
            if not test_patterns:
                print("Test     (could not extract — reporting job-level pass/fail only)")
    else:
        # fix PR CI passed; go straight to pre-fix fallback
        print("Scanning pre-fix failures for test name...")
        test_patterns = find_test_in_pre_fix_failures(
            pre_candidates, pr_check_runs, job_pattern
        )
        if not test_patterns:
            print("Test     (could not extract — reporting job-level pass/fail only)")

    # ── 7. Pre-fix baseline ───────────────────────────────────────────────
    print(f"\n{'─' * 58}")
    print(f"BEFORE FIX — {SAMPLE_SIZE} most recent runs before {fix_merged_at[:10]}")
    print(f"{'─' * 58}")
    pre_results = process_prs(
        pre_candidates, pr_check_runs, job_pattern,
        fix_commit=None,  # no ancestry check for pre-fix
        test_patterns=test_patterns,
        verbose=args.verbose,
        label="pre-fix PRs",
    )

    # ── 8. Post-fix check ─────────────────────────────────────────────────
    print(f"\n{'─' * 58}")
    print(f"AFTER FIX  — {SAMPLE_SIZE} most recent runs after {fix_merged_at[:10]}")
    print(f"{'─' * 58}")
    post_results = process_prs(
        post_candidates, pr_check_runs, job_pattern,
        fix_commit=fix_commit,
        test_patterns=test_patterns,
        verbose=args.verbose,
        label="post-fix PRs",
    )

    # ── 9. Summary ────────────────────────────────────────────────────────
    def failure_rate(results: list[dict]) -> tuple[int, int, float]:
        total = len(results)
        fails = sum(1 for r in results if r["conclusion"] == "failure")
        rate = fails / total * 100 if total else 0.0
        return fails, total, rate

    pre_fails, pre_total, pre_rate = failure_rate(pre_results)
    post_fails, post_total, post_rate = failure_rate(post_results)
    post_same = sum(1 for r in post_results
                    if r["conclusion"] == "failure" and r["same_test"] is True)
    post_unknown = sum(1 for r in post_results
                       if r["conclusion"] == "failure" and r["same_test"] is None)

    print(f"\n{'═' * 58}")
    print(f"SUMMARY")
    print(f"{'═' * 58}")
    if pre_total:
        print(f"  Before fix:  {pre_fails}/{pre_total} failures  ({pre_rate:.0f}%)")
    else:
        print(f"  Before fix:  no data")
    if post_total:
        print(f"  After fix:   {post_fails}/{post_total} failures  ({post_rate:.0f}%)", end="")
        if post_same:
            print(f"  ({post_same} confirmed same test)", end="")
        print()
    else:
        print(f"  After fix:   no data")

    if pre_total and post_total and pre_rate > 0:
        improvement = pre_rate - post_rate
        print(f"  Change:      {improvement:+.0f}pp  ", end="")
        if post_rate == 0:
            print("(eliminated)", end="")
        elif improvement > 0:
            print("(improved)", end="")
        else:
            print("(no improvement)", end="")
        print()

    # Verdict
    print()
    if post_total == 0:
        print("⚠️  VERDICT: INSUFFICIENT DATA — no qualifying post-fix CI runs found")
        print("   Try --job to broaden the job name match.")
    elif post_fails == 0:
        print(f"✅ VERDICT: LIKELY FIXED — {post_total} clean runs since fix", end="")
        if pre_total:
            print(f" (was {pre_rate:.0f}% before)", end="")
        print()
    elif post_same > 0:
        print(f"❌ VERDICT: STILL FLAKY — {post_same}/{post_total} runs ({post_rate:.0f}%) "
              f"failed with the same test", end="")
        if pre_total:
            print(f" (was {pre_rate:.0f}% before)", end="")
        print()
    elif post_unknown > 0:
        print(f"⚠️  VERDICT: UNCERTAIN — {post_fails}/{post_total} failures, "
              f"could not confirm test names (check URLs above manually)")
    else:
        print(f"⚠️  VERDICT: UNCERTAIN — {post_fails}/{post_total} failures "
              f"appear to be a different test/regression")


if __name__ == "__main__":
    main()
