---
name: flake-check
description: "Github PR flake investigator — /flake-check <PR> [--deep] | scan [Nd] [--deep] [--file <name>] -- To see commands just run `/flake-check`"
user-invocable: true
allowed-tools: "Bash"
---

# Flake check — Investigates CI failures on a github odh-dashboard PR and classifies them

Investigate failing CI checks on a PR and classify each failure using live CI data, symptom pattern matching, and cross-PR overlap analysis.

## Quick Reference

| Invocation | What it does |
|---|---|
| `/flake-check <PR>` | Investigate a single PR — fetches failing checks, reads logs, classifies each failure, checks code overlap between failing tests and PR changes |
| `/flake-check <PR> --deep` | Same as above, plus rerun detection (checks that failed then passed on the same SHA — hidden flakiness) |
| `/flake-check scan` | Lightweight survey of the last 7 days of PRs for recurring failure patterns (no log fetching) |
| `/flake-check scan --deep` | Same as above, plus rerun detection (checks that failed then passed on the same SHA — hidden flakiness), test-level pattern analysis, and file-level overlap for each recurring test |
| `/flake-check scan <N>d` | Survey PRs from the last N days (e.g. `scan 7d`) |
| `/flake-check scan --file <filename>` | Find every PR in the window where a specific test file appeared in failures (fetches logs — slower) |

```bash
/flake-check 7301
/flake-check 7301 --deep
/flake-check scan
/flake-check scan --deep
/flake-check scan 7d
/flake-check scan 14d --deep
/flake-check scan --file pipelineCreateRuns.cy.ts
/flake-check scan 30d --file pipelineCreateRuns.cy.ts
/flake-check scan --since 14d --until 7d
/flake-check scan --since 2026-04-01 --until 2026-04-15
```

---

## How We Identify Flaky Tests

Flakiness is a pattern, not a single event. The more signals you see, the more confident you can be. In rough order of strength:

**Signal 1 — Cross-PR recurrence (strong)**
The same test or check fails on multiple unrelated PRs that touch different parts of the codebase. This is the strongest signal because it rules out a real regression: if the test fails whether or not you've changed the relevant code, the test itself is the problem.

*Example:* `pipelineCreateRuns.cy.ts` fails on a PR that only changes `model-serving/` — completely unrelated areas.

*How to find it:*
- `/flake-check scan` — lightweight survey of the last 7 days of PRs
- `/flake-check scan 30d --file pipelineCreateRuns.cy.ts` — targeted search for a specific file

**Signal 2 — Rerun detection (strong)**
The check failed on an earlier run, then passed on a later run of the same commit SHA without any code change in between. Same code, different result — the test is non-deterministic by definition.

**Signal 3 — No code overlap on a single PR (moderate)**
The failing test exercises feature area X, but the PR only touches feature area Y. Not conclusive on its own (unrelated changes can still expose race conditions in a shared subsystem), but it lowers suspicion that the PR caused the regression.

*How to find it:* `/flake-check <PR> --deep` — adds a "Previously Failed — Rerun Detected" section to the report.

**Signal 4 — Symptom pattern match (low/moderate - starting point only)**

| Pattern | What it usually indicates |
|---------|--------------------------|
| `CypressError: Timed out retrying after` | DOM timing race |
| `cy.click() / cy.type() failed — requires a DOM element` | Element disappeared mid-test |
| `AssertionError: Timed out retrying` | Timing race — but check the error detail; a missing named element may be a real defect |
| `Unable to find an element by:` | Ambiguous — element absent or not yet rendered; check CI screenshot/video to confirm |
| `socket hang up` / `ECONNRESET` / `ERR_CONNECTION_REFUSED` | Infrastructure hiccup |
| `Cannot read properties of null` | Race condition in test setup |

A symptom match is a starting signal, not a verdict. Real failures produce identical patterns — always check the error detail and look for corroborating signals before concluding flakiness.

---

## Architecture

This skill separates **data collection** (deterministic Python scripts) from **analysis** (Claude reasoning):

| Phase | Who | What |
|---|---|---|
| Data collection | Scripts | Fetch PR state, CI logs — output clean JSON |
| Classification | Claude | Apply confidence model using symptom patterns, checking code overlap with failed tests, etc. |
| Report | Claude | Generate structured, actionable output |

Scripts live in `${CLAUDE_SKILL_DIR}/scripts/`. Run scripts from the repo root (the user's working directory) using their absolute path. All scripts output JSON to stdout; errors are also emitted as JSON to stdout (`{"error": "..."}`) and exit with a non-zero status code.

## Prerequisites

Scripts have no external dependencies. They use only the Python standard library and `gh` CLI (already available in this environment).

## Arguments

`$ARGUMENTS` — one of:
- A PR number (e.g. `4821`) → run the **Main Investigation** workflow
- A PR number with `--deep` (e.g. `4821 --deep`) → Main Investigation with rerun detection
- `scan` or `scan <N>` → run the **scan** workflow (N PRs; bare `scan` defaults to last 7 days)
- `scan <N>d` (e.g. `scan 7d`) → scan PRs from the last N days
- `scan --since <date/period> --until <date/period>` → scan a specific time window (e.g. `--since 14d --until 7d` or `--since 2026-04-01 --until 2026-04-15`)
- `scan --deep` → scan with rerun detection and cross-PR code overlap analysis
- `scan --file <filename>` (e.g. `scan --file pipelineCreateRuns.cy.ts`) → run the **file-scoped scan** workflow — fetches CI logs to find every PR where that specific test file failed
- Any `scan` variant may combine modifiers (e.g. `scan 30d --deep --file pipelineCreateRuns.cy.ts`)
- Empty → print the Quick Reference table from the top of this file and stop; do not prompt for a PR number

---

## Confidence Model

Apply this conservatively — a real regression can produce the same symptoms as a flaky test.

**Suspected flaky** (symptom or cross-PR signal)
- The error matches a known pattern below, OR the check has failed across multiple unrelated PRs
- A symptom match is a starting signal, not a final classification — always analyse the error detail before assigning it in the table
- If your analysis concludes the failure is likely deterministic (wrong selector, missing element, new test with a bug), classify as Likely real instead and explain why
- Do NOT label it flaky — surface it as a possibility
- Prompt the dev: is this related to their changes? Has this test passed on `main` recently?
- Recommended action: gather multiple signals to confirm — see "If You Confirm It's Flaky" in any investigation report; then log a RHOAIENG Bug with label `flaky-test` if not already tracked

**Likely real**
- No symptom pattern match and no cross-PR recurrence signal
- Also use Likely real when a symptom pattern matched but analysis clearly points to a real failure (e.g. brand-new test with a wrong selector name, deterministic build/lint error)
- Do NOT automatically classify "Unable to find an element" errors as Likely real — these are ambiguous and require visual confirmation first (see "Downloading CI Artifacts" below)
- Treat as a real failure until proven otherwise
- Recommended action: investigate as a potential real regression

**Known symptom patterns (Suspected flaky signals only — not conclusions):**
- `CypressError: Timed out retrying after`
- `cy.click() failed because it requires a DOM element`
- `cy.type() failed because it requires a DOM element`
- `AssertionError: Timed out retrying` — timing race signal; if the error names a specific element (e.g. "Unable to find button with name X"), this is **ambiguous** — the element may have been genuinely absent (real failure) or may not have rendered in time (flaky); classify as Suspected flaky; CI artifacts are especially useful for resolving this case (see "Downloading CI Artifacts" below)
- `Unable to find an element by:` — element lookup failed; **ambiguous** between a real missing element and a rendering/timing race; classify as Suspected flaky; CI artifacts are especially useful for resolving this case (see "Downloading CI Artifacts" below)
- `socket hang up`
- `ECONNRESET`
- `net::ERR_CONNECTION_REFUSED`
- `Cannot read properties of null` in test output (race condition signal)

---

## Downloading CI Artifacts

When a failure matches an ambiguous pattern — especially `Unable to find an element by:` or `AssertionError: Timed out retrying` naming a specific element — proactively offer to download the Cypress screenshot or video for that run. These give direct visual evidence of the UI state at the moment of failure, which is often decisive.

**Step 1 — List available artifacts for the run:**

```bash
gh api repos/opendatahub-io/odh-dashboard/actions/runs/<run_id>/artifacts \
  --jq '.artifacts[] | {name: .name, id: .id, size_in_bytes: .size_in_bytes, expired: .expired}'
```

Look for artifact names containing `screenshot`, `video`, or `cypress`. If `expired: true`, the artifacts are no longer available — note this and skip. If the list is empty (no artifacts at all), advise the user to check whether the failing workflow uploads Cypress results on failure — fetch the workflow path for the run and read the file to verify:
```bash
gh api repos/opendatahub-io/odh-dashboard/actions/runs/<run_id> --jq '.path'
```
Check whether the workflow contains an `actions/upload-artifact` step that runs `if: failure()` and includes the Cypress `screenshots` and `videos` output directories. If missing, suggest adding it so future failures produce downloadable evidence.

**Step 2 — Download the artifact:**

```bash
gh run download <run_id> -n <artifact-name> -D /tmp/ci-artifacts/
```

Cypress zips each artifact type separately. After download, list what was extracted:

```bash
find /tmp/ci-artifacts/ -type f | sort
```

**Step 3 — Find the file for the failing test:**

Cypress names screenshots after the test: `<describe block> -- <it description> (failed).png`, nested under the spec file's path. Videos are named after the spec file: `<spec-file>.cy.ts.mp4`.

Match the failing test name from the log to the downloaded files.

**Step 4 — View the image or video:**

For screenshots, use the Read tool to view the PNG directly — Claude can analyse what's shown:

```
Read: /tmp/ci-artifacts/cypress/screenshots/.../<test name> (failed).png
```

After reading, always share the local path and the terminal command to open it:
> Screenshot saved locally: `/tmp/ci-artifacts/.../<test name> (failed).png`
> Open in macOS: `open "/tmp/ci-artifacts/.../<test name> (failed).png"`

For videos, Claude cannot play MP4 files — provide the local path and the terminal command to open it:
> Video saved locally: `/tmp/ci-artifacts/.../videos/<spec>.cy.ts.mp4`
> Open in macOS: `open "/tmp/ci-artifacts/.../videos/<spec>.cy.ts.mp4"`

**What to look for:**
- Screenshot shows the expected element clearly rendered → timing race, supports flaky classification
- Screenshot shows a blank page, wrong page, or missing component → likely a real defect or infrastructure issue
- Screenshot shows a spinner or partially loaded state → async race condition, supports flaky classification
- Element is visibly absent with no obvious loading state → may be a real regression; investigate further

After viewing, update the classification based on what the screenshot shows and explain your reasoning.

---

## Main Investigation

### Step 1 — Fetch PR overview and failing checks

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/fetch_pr_failures.py <number>

# With --deep: also detects checks that previously failed then passed on the same SHA
python3 ${CLAUDE_SKILL_DIR}/scripts/fetch_pr_failures.py <number> --deep
```

This returns a JSON object with:
- `pr` — title, author, branch, state, merge status, review decision, and two merge-gate fields:
  - `merge_state_status` — GitHub's merge readiness: `CLEAN` (all good), `BLOCKED` (required checks/reviews failing), `UNSTABLE` (non-required checks failing — PR can still merge), `BEHIND`, `DIRTY`, `UNKNOWN`
  - `merged_despite_failures` — `true` when the PR is already merged but `failing_checks` is non-empty; indicates those checks were not required for merge (or an admin bypassed them)
- `summary` — total/failing/pending/passing check counts
- `failing_checks` — list of checks where `conclusion` is `failure` or `timed_out`, each with its `run_id` and `job_id` extracted from the GitHub Actions URL
- `pending_checks` — checks still running (blocking the PR but not yet failed)

**Merge gate interpretation — always surface this in the Status line:**
- `merged_despite_failures: true` → note "merged despite N failing check(s) — those checks are not required for merge (or were bypassed by an admin)"
- `merge_state_status: UNSTABLE` (open PR) → note "failing checks are non-required — this PR could merge in its current state"
- `merge_state_status: BLOCKED` (open PR) → note "at least one failing check is required — merge is gated"

If there are no `failing_checks` and no `pending_checks`, report that all checks are passing and note any remaining review blockers from `review_decision`.

For each `failing_check`, use this table to decide whether to fetch logs. Matrix jobs append values in parentheses — match by prefix (e.g. `Cypress-Mock-Tests (mcpCatalog, ...)` matches `Cypress-Mock-Tests`):

| Check name prefix | Type | Flaky risk | Action |
|---|---|---|---|
| `Cypress-Mock-Tests` | cypress-mock | high | Fetch logs → Step 2 |
| `test-and-build` | cypress-mock | high | Fetch logs → Step 2 |
| `Unit-Tests` | jest | low | Fetch logs → Step 2 |
| `Contract-Tests` | contract | medium | Fetch logs → Step 2 |
| `test` | go-test | low | Fetch logs → Step 2 |
| `Lint` | lint | none | Skip — deterministic, classify as ❌ Likely Real |
| `Type-Check` | type-check | none | Skip — deterministic, classify as ❌ Likely Real |
| `Build *` | build | none | Skip — deterministic, classify as ❌ Likely Real |
| `Application Quality Gate` | quality-gate | none | Skip — deterministic, classify as ❌ Likely Real |
| anything else | unknown | unknown | Use judgment — if name suggests infra/setup, skip; otherwise fetch logs |

### Step 2 — Fetch test failure details for each non-deterministic failing check

For each entry in `failing_checks` that needs log analysis, run:

```bash
# Always pass --job when job_id is available — scoped per-job logs are complete and never truncated
python3 ${CLAUDE_SKILL_DIR}/scripts/fetch_test_failures.py <run_id> --job <job_id>

# Only omit --job if job_id is null in the fetch_pr_failures.py output
python3 ${CLAUDE_SKILL_DIR}/scripts/fetch_test_failures.py <run_id>
```

Each failing check has its own `job_id` — always run the script once per failing check, not once per `run_id`. Per-job logs are scoped to a single job and always contain the complete output regardless of log size.

The script returns:
- `framework` — detected test framework (`cypress`, `jest`, `go`, or `unknown`)
- `failing_tests` — list of `{ name, file, error }` extracted from the log
- `raw_summary` — the runner's pass/fail count line (e.g. `3 passing (16s), 2 failing`)
- `parse_warnings` — non-empty if the script couldn't parse individual tests (e.g. build failures before tests ran)

If `parse_warnings` is non-empty, note that in the report and explain what likely happened (e.g. build error prevented tests from starting).

### Step 3 — Classify each failing test

For each test name returned in Step 2:

1. Does the `error` field match any known symptom pattern? → **Suspected flaky** (initial classification — refine with the code overlap check below)
2. Otherwise → **Likely real**

**Code overlap check — run this for every Suspected flaky test:**

If any tests are initially classified as Suspected flaky, fetch the PR's changed files:

```bash
gh pr view <number> --json files --jq '[.files[].path]'
```

For each suspected flaky test, compare the PR's changed file paths against the feature area the test exercises — inferred from the test file's directory (e.g. `cypress/tests/mocked/pipelines/runs/` → pipelines area) and the source directories the PR touches (e.g. `frontend/src/pages/pipelines/` → pipelines area).

**Artifact check — run this for every Suspected flaky test:**

After the initial classification and before generating the report, proactively check whether CI screenshots or videos are available for the failing run. Do not wait for the user to ask.

```bash
gh api repos/opendatahub-io/odh-dashboard/actions/runs/<run_id>/artifacts \
  --jq '.artifacts[] | {name: .name, id: .id, size_in_bytes: .size_in_bytes, expired: .expired}'
```

- If artifacts exist and are not expired: download and inspect them — see "Downloading CI Artifacts" for the full procedure. View any screenshots with the Read tool and include your visual analysis in the report.
- If artifacts are expired: note this in the report and suggest the user rerun the failing check to capture fresh artifacts if they need visual confirmation.
- If no artifacts are found at all: note this and advise the user to check whether the failing workflow is configured to upload Cypress results on failure. Look up the relevant workflow file to check — for example:
  ```bash
  gh api repos/opendatahub-io/odh-dashboard/actions/runs/<run_id> --jq '.path'
  ```
  Then read that workflow file (e.g. `.github/workflows/gen-ai-frontend-build.yml`) and check whether it has an artifact upload step (typically `actions/upload-artifact`) that runs `if: failure()` and includes the Cypress `screenshots` and `videos` directories. If this step is missing or misconfigured, advise the user to add it so future failures produce downloadable evidence.

**Overlap verdict — refine the classification based on the result (check in this order):**
- **PR modifies the test file itself** — the failing test's exact file path is among the PR's changed files → the overlap is the test file being edited directly, not source code in the same area. Do NOT escalate to "regression possible". Instead, fetch the PR's title, body, and branch name to look for evidence this is a flake fix attempt:
  ```bash
  gh pr view <number> --json title,body,headRefName --jq '{title: .title, branch: .headRefName, body: .body}'
  ```
  Look for keywords: `flake`, `flaky`, `stabilize`, `intermittent`, `timing`, `fix test`, `test fix`, or a RHOAIENG ticket reference in a known flaky-test context. Then apply one of:
  - *Flake fix signals found* — PR title/body/branch suggests this is a flake fix attempt; classify as **⚠️ Suspected Flaky — PR appears to be a flake fix (fix may be incomplete)**; note the test is still failing and the underlying issue may not yet be resolved; recommend cross-PR recurrence and rerun checks to confirm
  - *No flake fix signals* — no evidence the PR is trying to fix this test; the test file edit may be incidental; classify as **⚠️ Suspected Flaky — PR modifies the failing test file (ambiguous)**; recommend gathering more signals before drawing conclusions
- **No overlap** — PR changes are in a different domain than the test's feature area (e.g. PR touches `api-keys/`, test is in `pipelines/runs/`) → refine to **⚠️ Suspected Flaky — no code overlap (likely unrelated to this PR)**; lower the alarm level in the report
- **Overlap detected** — PR touches source files in the same feature area as the failing test, but does NOT modify the test file itself → keep as **⚠️ Suspected Flaky — code overlap detected (regression possible)**; flag clearly that a real regression is plausible
- **Unclear** — PR spans many areas or the test area is ambiguous → note uncertainty and keep as Suspected flaky

### Step 4 — Generate the report

```
## PR #<number> Blocker Analysis — <title>

**Author:** <author> | **Branch:** <head_ref> → <base_ref>
**Status:** <N> of <total> checks failing | Reviews: <review_decision>

---

### Failing Tests

| Test | Check | Job Type | Code Overlap | Classification | Suggested Action |
|------|-------|----------|-------------|---------------|-----------------|
| <test name> | <check name> | jest (low flaky risk) | None (PR: api-keys; test: pipelines) | ⚠️ Suspected Flaky — likely unrelated | Rerun to unblock; investigate deeper to confirm (see below) |
| <test name> | <check name> | cypress-mock (high flaky risk) | Yes (both touch pipelines/) | ⚠️ Suspected Flaky — regression possible | Investigate before merging |
| —  | Lint | lint (deterministic) | — | ❌ Likely Real | Fix the lint error |
| <test name> | <check name> | unknown | — | ❌ Likely Real | Treat as real failure |

---

### Suspected Flaky — verify before acting
<For each Suspected flaky:>

- **"<test name>"** matched symptom: `<pattern>`
  - **Code overlap:** <one of the verdicts below>
    - *PR appears to be a flake fix (fix may be incomplete)* — PR edits `<test file>` and title/body/branch suggests a flake fix attempt; the test is still failing — the fix may not yet be working; gather cross-PR recurrence and rerun signals to confirm
    - *PR modifies the failing test file (ambiguous)* — PR edits `<test file>` but no flake fix signals found in title/body/branch; unclear whether the edit is incidental or intentional — gather more signals before drawing conclusions
    - *No overlap* — PR touches `<areas>`, test exercises `<area>`; failure is likely unrelated to these changes — rerun to unblock; then gather deeper signal to confirm flakiness (see "If You Confirm It's Flaky" below)
    - *Overlap detected* — PR touches source files in the same area as this test (`<area>`) but does not modify the test file itself; a real regression is plausible — investigate before dismissing
    - *Unclear* — PR spans multiple areas or test area is ambiguous; treat with caution
---

### Likely Real Failures
<For each Likely real:>

- **"<test name>"** — no pattern match; investigate as a potential real failure

---

### Previously Failed — Rerun Detected
<Only present when --deep was passed and rerun_detected is non-empty>

- **"<check name>"** — failed then passed on the same commit SHA; not currently blocking
  - May be a flaky test the dev silently worked around via rerun
  - Run `/flake-check scan --deep` to see if this check reruns frequently across PRs
  - If confirmed flaky, see "If You Confirm It's Flaky" below for Jira fields

---

### Still Running / Pending
<List any pending_checks — these are also blocking the PR>

---

### If You Confirm It's Flaky
<Include this section only when the report contains one or more ⚠️ Suspected Flaky tests.>

A single passing rerun is suggestive but not conclusive — gather multiple signals before logging a ticket. Good next steps:

- **Rerun detection:** run `/flake-check <number> --deep` — if the check previously failed then passed on the same commit SHA without new code being pushed, that's a strong behavioural signal
- **Cross-PR recurrence:** run `/flake-check scan --file <filename>` — if this file keeps failing across PRs with unrelated code changes, that's the strongest signal of all
- **Other giveaway signs:** timing errors (`Timed out retrying`), DOM race conditions (`Cannot read properties of null`), infrastructure errors (`ECONNRESET`, `ERR_CONNECTION_REFUSED`), no code overlap — see the flake-check README for the full pattern list

When you have enough evidence, **proactively ask the user** whether they want you to search Jira for existing tickets — do not wait for them to ask. Frame it as:

> "Would you like me to search Jira for existing tracking tickets for these suspected flaky tests? (Requires Jira MCP to be configured.)"

If they agree and Jira MCP is available, run up to three searches per suspected test — a single query on the full test name is often too narrow and will miss tickets filed against the file name or symptom. Always include `component = "AI Core Dashboard"` to exclude flaky-test tickets from other repos (e.g. kserve) that share the RHOAIENG project:

1. **Test file name** — `project = RHOAIENG AND component = "AI Core Dashboard" AND labels = "flaky-test" AND text ~ "<filename>" ORDER BY created DESC`
2. **Short it() fragment** — 2–3 distinctive words from the `it()` description, not the full sentence: `project = RHOAIENG AND component = "AI Core Dashboard" AND labels = "flaky-test" AND text ~ "<short fragment>" ORDER BY created DESC`
3. **Error symptom** — if a distinctive error token is known (e.g. `modal-submit-button`, `pf-m-progress`, `ECONNRESET`): `project = RHOAIENG AND component = "AI Core Dashboard" AND labels = "flaky-test" AND text ~ "<symptom token>" ORDER BY created DESC`

Deduplicate results across queries. Report unique matches (key, summary, status) for each test. If a ticket already exists, link to it. If no existing ticket — say "create the Jira" and I'll file it, or copy these fields:

<For each ⚠️ Suspected Flaky test in the report, generate one block. Substitute all `<...>` placeholders except `<team label if known ...>` and `<team component if known>` — render those two verbatim so the user knows they must supply those values themselves.>

**"<test name>"**
```
Type: Bug | Priority: Normal | Labels: flaky-test, <team label if known e.g. dashboard-crimson-scrum for Gen AI Studio area> | Component: <team component if known>
Summary: test(mock): "<test name>" is intermittently failing in CI
```
Description: test `<file>`, area `<area>`, symptom `<error pattern>`, PRs: `<pr list>`
AC: Investigate root cause (timing race, missing guard, selector instability); fix; verify stable on RHOAI and ODH clusters; remove `@Maintain` tag.

---

### Recommended Actions

<Numbered list, e.g.:>
1. Rerun failing checks — <N> suspected flaky test(s) are blocking this PR
2. Investigate "<test name>" before dismissing as flaky — <why it's ambiguous>
3. <Any review blockers, e.g. "Awaiting approval from <reviewer>">

---

### Slack-ready summary
> PR #<number> blocked — <N> suspected flaky / <N> likely real.
> <One line: what to do next.>
```

---

## `scan` Sub-command

Survey recent PRs for CI failures. Plain `scan` is lightweight (no log fetching); `--deep` and `--file` additionally fetch CI logs for test-level analysis. Use this to spot patterns across many PRs, then follow up with `/flake-check <number> --deep` for deep investigation.

### Step 1 — Determine scan parameters

Parse `$ARGUMENTS` for optional modifiers after `scan`:
- A bare number (e.g. `scan 30`) → `--limit 30`
- A day count (e.g. `scan 7d`) → `--since 7d`
- `--file <filename>` (e.g. `scan --file pipelineCreateRuns.cy.ts`) → pass `--file` to the script; this triggers CI log fetching and is slower than the default scan
- `--file` may be combined with time/limit modifiers (e.g. `scan 30d --file pipelineCreateRuns.cy.ts`)
- Otherwise default to `--since 7d` (last 7 days of non-bot PRs)

When `--file` is present, switch to the **File-Scoped Scan** report format (see Step 4).

Bot PRs (`openshift-cherrypick-robot`, Renovate, Dependabot) are excluded by default.

### Step 2 — Run the scan

```bash
# Default: last 7 days of non-bot PRs
python3 ${CLAUDE_SKILL_DIR}/scripts/scan_prs.py

# By count
python3 ${CLAUDE_SKILL_DIR}/scripts/scan_prs.py --limit 30

# By time window
python3 ${CLAUDE_SKILL_DIR}/scripts/scan_prs.py --since 7d
python3 ${CLAUDE_SKILL_DIR}/scripts/scan_prs.py --since 14d --until 7d   # 7-14 days ago
python3 ${CLAUDE_SKILL_DIR}/scripts/scan_prs.py --since 2026-04-01 --until 2026-04-15

# Deep mode: rerun detection, cross-PR overlap analysis, and test-level patterns across all failing checks
python3 ${CLAUDE_SKILL_DIR}/scripts/scan_prs.py --since 7d --deep

# File-scoped: find every PR where a specific test file appeared in failures (fetches CI logs — slower)
python3 ${CLAUDE_SKILL_DIR}/scripts/scan_prs.py --file pipelineCreateRuns.cy.ts
python3 ${CLAUDE_SKILL_DIR}/scripts/scan_prs.py --since 30d --file pipelineCreateRuns.cy.ts
```

When `--file` is passed, `scan_prs.py` fetches CI logs for all failing checks not excluded by `_DETERMINISTIC_PREFIXES` across the scanned PRs (using the same logic as `fetch_test_failures.py`) and returns only PRs where the named file appeared in the failures. Each matching PR gains a `matched_tests` field listing the failing test names and errors from that file. Step 3 (test-file overlap) still applies — run it against `test_patterns` as normal.

`scan_prs.py` returns:
- `prs` — list of PRs with their failing check names
- `patterns` — check names that **visibly failed** on more than one PR, each with `failure_count` and the list of PR numbers it failed on
- `rerun_patterns` — *(with `--deep` or `--file`)* check names that **failed then passed on the same commit SHA** on two or more PRs, with `rerun_count` and PR numbers. This surfaces flaky tests that devs routinely re-run — they won't appear in `patterns` because `statusCheckRollup` only shows the final passing state.
- `test_patterns` — *(with `--deep` or `--file`)* **individual test names** that failed on two or more PRs, each with `failure_count`, `pr_numbers`, and distinct `errors` seen. A test appearing here means the *same specific `it()` block* recurred across PRs — much stronger evidence than the same job recurring. With `--deep`: fetches logs for all failing checks not excluded by `_DETERMINISTIC_PREFIXES` across all scanned PRs (the same test can recur across different check matrix variants — this catches it). With `--file`: same log fetching but filtered to a specific file.
- `bots_excluded` — count of bot PRs filtered out
- `all_passing_count` — PRs where everything passed
- `filters` — the resolved `since`/`until`/`limit`/`limit_hit`/`deep`/`bots_excluded`/`file_filter` values actually used

### Step 3 — Test-file overlap analysis (deep mode and file mode)

*Skip this step when neither `--deep` nor `--file` was passed, or when `test_patterns` is empty.*

For each entry in `test_patterns`, fetch the changed files for every PR it appeared on:

```bash
gh pr view <pr_number> --json files --jq '[.files[].path]'
```

Run this once per PR number across all test patterns (deduplicate to avoid redundant calls). Then for each test pattern, compare the PRs' changed files against the test's actual file path (use the directory component of `test_patterns[].file` as the feature area — e.g. `cypress/tests/mocked/pipelines/runs/` → pipelines/runs area):

- **No overlap** — none of the PRs where this test failed touched the same feature area as the test file → strong evidence the test is flaky independent of code changes
- **Partial overlap** — some PRs touched the relevant area, others did not → may be flaky or a recurring real regression; note the split
- **Full overlap** — all PRs touched the same feature area as the test file → the failures may reflect a persistent real regression rather than flakiness

### Step 4 — Generate the scan report

**Signal assignment logic (in priority order):**
1. `⚠️ Suspected Flaky` — check name appears in `patterns` (cross-PR recurrence at the check level)
2. `❌ Likely Real` — check name is clearly deterministic (Lint, Type-Check, Build, kustomize) — these don't flake
3. `❓ Unknown` — check name is ambiguous or is a test runner check with no cross-PR pattern yet; note that no pattern at scan level doesn't mean the failure isn't flaky — it means there isn't enough signal yet without fetching logs

```
## Recent PR Scan — <since>–<until> | <N> PRs scanned (<bots_excluded> bots excluded)

> ⚠️ Limit of <N> reached — there may be more PRs in this window. Re-run with `--limit <higher>` for broader coverage.
<Only include the above line when filters.limit_hit is true>

**With failures:** <X> | **All passing:** <Y> | **Patterns:** <Z>

| PR | Title | Author | Failed Checks | Job Type | Signal |
|---|---|---|---|---|---|
| #<n> | <title> | <author> | <check name(s)> | cypress-mock | ⚠️ Suspected Flaky |
| #<n> | <title> | <author> | <check name(s)> | lint | ❌ Likely Real |
| #<n> | <title> | <author> | <check name(s)> | jest | ❓ Unknown |

### Patterns Observed (visible failures)
<For each entry in patterns:>
- "<check_name>" (<job_type>) failed in <N>/<scanned> PRs
  - PRs: #<n>, #<n>, ...
  - Classify as: ⚠️ Suspected Flaky

### Test-Level Patterns — only present with --deep or --file (when test_patterns is non-empty)
<The test_name field is the full Cypress name: describe chain + it() block concatenated. Split it for display using this approach: if the it() description starts with "should", locate the first "should" in the test_name and treat everything from that word onward as the it() description, and everything before as the suite path. If the it() description does NOT start with "should", look up the actual test file (using the `file` field) with Grep to find the exact `it('...')` string that matches the test_name suffix — this gives the correct it() boundary. Never guess the split point when the test doesn't follow the "should…" convention. Format each entry as shown below.>
<For each entry in test_patterns, incorporating overlap verdict from Step 3:>
- **it:** `<it_description>` — `<file>` — <N>/<scanned> PRs
  - Suite: `<describe_chain>`
  - PRs: #<n>, #<n>, ...
  - Error(s): `<errors[0]>` <and any additional distinct errors>
  - **Overlap:** <one of:>
    - *No overlap* — none of the PRs touched the test's feature area (`<dir>`) → strong flaky signal; consider opening a Jira task to track it
    - *Partial overlap* — some PRs touched `<dir>`, others did not → may be flaky or a recurring regression; investigate with `/flake-check <number>`
    - *Full overlap* — all PRs touched `<dir>` → possible persistent regression rather than flakiness; investigate before dismissing

<If --deep was used but test_patterns is empty or absent:>
No individual test recurred across multiple PRs — different tests failed within the same jobs each time. Try a wider window or `/flake-check scan --file <filename>` for a targeted search.

### Rerun Patterns (hidden failures) — only present with --deep
<For each entry in rerun_patterns:>
- "<check_name>" reran on <N>/<scanned> PRs — failed then passed on the same commit SHA; not visible in statusCheckRollup

### PRs with no failures
<N> PRs had all checks passing.

### Slack-ready summary
> <N> PRs scanned (<since> -> <until>): <N> ⚠️ Suspected Flaky / <N> ❓ Unknown / <N> ❌ Likely Real.
> <One line: top pattern or recommended next step.>
```

#### File-Scoped Scan report format

Use this format instead of the standard report when `filters.file_filter` is non-null.

```
## File-Scoped Scan: "<file_filter>" — <since>–<until> | <scanned> PRs scanned (<bots_excluded> bots excluded)

**PRs where this file had failures:** <with_failures> of <scanned> scanned

| PR | Title | Author | Failing Test(s) | Check | Classification |
|---|---|---|---|---|---|
| #<n> | <title> | <author> | <matched_tests[].name> | <check name> | ⚠️ Suspected Flaky |
| #<n> | <title> | <author> | <matched_tests[].name> | <check name> | ❌ Likely Real |

### Recurring Tests (same test on multiple PRs)
<For each entry in test_patterns, run the file-level overlap check from Step 3 using test_patterns[].file:>
<Split test_name into it() and describe chain as described in the Test-Level Patterns section above.>
- **it:** `<it_description>` — `<file>` — <N>/<scanned> PRs
  - Suite: `<describe_chain>`
  - PRs: #<n> (author: <author>), #<n> (author: <author>), ...
  - Error(s): `<errors[0]>` <and any additional distinct errors>
  - **Overlap:** <one of:>
    - *No overlap* — none of the PRs touched the test's feature area → strong flaky signal; consider opening a Jira task to track it
    - *Partial overlap* — some PRs touched the relevant area, others did not → investigate with `/flake-check <number>`
    - *Full overlap* — all PRs touched the same area → possible persistent regression; investigate before dismissing

<If test_patterns is empty:>
No individual test recurred across multiple PRs — each PR had a unique failure within this file. The file may still be flaky (different tests flaking each time), or each failure may be real. Run `/flake-check <number>` on individual PRs to investigate.

### No matches found
<Only present when with_failures == 0:>
No failures matching "<file_filter>" were found across <scanned> recent PRs. The file may be stable, or the window may be too small — try a larger `--since` window.
```

**Classification rules for file-scoped results** — same confidence model as the main investigation:
- Classify as ⚠️ Suspected Flaky if the error matches a known symptom pattern; note whether the PR author's changes overlap with the test area
- Classify as ❌ Likely Real otherwise

---

### Step 5 — Offer follow-up

List PRs flagged `⚠️` or `❓` and offer:
> "Run `/flake-check <number> --deep` for a deep investigation with full log analysis and rerun detection."
> "If a pattern looks confirmed flaky, say 'create a Jira for this test' and I'll search for an existing ticket and file one with pre-filled fields if needed."

**Jira search offer — include this whenever the report contains one or more ⚠️ Suspected Flaky tests:**

> "Would you like me to search Jira for existing tracking tickets for these suspected flaky tests? (Requires Jira MCP to be configured.)"

If they agree and Jira MCP is available, run up to three searches per suspected test — a single query on the full test name is often too narrow and will miss tickets filed against the file name or symptom. Always include `component = "AI Core Dashboard"` to exclude flaky-test tickets from other repos (e.g. kserve) that share the RHOAIENG project:

1. **Test file name** — `project = RHOAIENG AND component = "AI Core Dashboard" AND labels = "flaky-test" AND text ~ "<filename>" ORDER BY created DESC`
2. **Short it() fragment** — 2–3 distinctive words from the `it()` description, not the full sentence: `project = RHOAIENG AND component = "AI Core Dashboard" AND labels = "flaky-test" AND text ~ "<short fragment>" ORDER BY created DESC`
3. **Error symptom** — if a distinctive error token is known (e.g. `modal-submit-button`, `pf-m-progress`, `ECONNRESET`): `project = RHOAIENG AND component = "AI Core Dashboard" AND labels = "flaky-test" AND text ~ "<symptom token>" ORDER BY created DESC`

Deduplicate results across queries. Report unique matches (key, summary, status) for each test. If a match exists, link to it and note whether it is open or closed. If no match is found, say so and offer to file a new ticket.
