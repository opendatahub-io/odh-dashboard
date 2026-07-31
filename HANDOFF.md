# Handoff: CI Decouple Tests from Quality Gate

## Branch

`ci/decouple-tests-quality-gate-polling` on `antowaddle/odh-dashboard`

## Goal

Reduce wall-clock time of the `Test` workflow by letting test jobs (Unit-Tests, Contract-Tests, Cypress-Mock-Tests) start immediately after `Setup` instead of waiting ~9 min for lint/type-check to finish. The `Tests` aggregate job remains the single branch-protection check and must still fail if lint or type-check fails.

## Hard constraint: fork PRs (99% of our PRs)

`pull_request` events from forks get a **read-only** `GITHUB_TOKEN`. This blocks every approach that needs write access:

| Mechanism | Requires | Available on fork PRs? |
|---|---|---|
| `gh run cancel` / `actions.cancelWorkflowRun()` | `actions: write` | No |
| `pull_request_target` (grants base repo token) | — | Yes, but **security risk** (runs untrusted code with write access) |
| `workflow_run` (triggers on completed workflow) | — | **Does not trigger** for fork PRs |
| `listJobsForWorkflowRun()` (read job status) | `actions: read` | Yes |
| `fail-fast: true` (cancel sibling matrix jobs) | Runtime-enforced | Yes |

The only cross-job signaling available to fork PRs is **reading** job status via the API, plus `fail-fast` within a single matrix strategy.

---

## Approaches tried and why they failed

### Attempt 1: `gh run cancel` sentinel (PR #8970 — closed)

**Approach:** A lightweight `Cancel-On-Quality-Failure` job with `needs: [Lint, Type-Check]` and `if: failure()` that ran `gh run cancel ${{ github.run_id }}` to cancel the entire workflow run when lint or type-check failed.

**Why it failed:** `gh run cancel` calls `actions.cancelWorkflowRun()`, which requires `actions: write`. Fork PR tokens are read-only, so the cancel command gets a 403. The sentinel job itself ran fine but couldn't actually cancel anything.

**PR:** https://github.com/opendatahub-io/odh-dashboard/pull/8970

### Attempt 2: Quality-gate polling loop (PR #9014 — current branch)

**Approach:** Removed Quality-Gate from test job `needs` arrays so tests start after `Setup`. Added a "Wait for quality gates" step to each test job that polls `listJobsForWorkflowRun()` every 10s (up to 60 iterations / 10 min) checking whether Quality-Gate jobs have completed. If they failed, the test job self-aborts. If they passed, tests proceed.

**Why it failed:** The polling works mechanically (the API call succeeds, fork PRs have `actions: read`), but the approach is catastrophically wasteful:

- **69 jobs** each ran the polling loop (Unit-Tests, Contract-Tests, ~65 Cypress shards)
- **Unit-Tests polled for 500s** (8.3 min) — its setup (~2 min) was far shorter than the quality gate (~9 min), so it sat idle polling
- **Contract-Tests polled for 469s** (7.8 min) — same problem
- **~65 Cypress jobs polled for 68–167s each** — they started later (after Cypress-Setup) so the wait was shorter
- **Total billable runner time wasted on polling: 151 minutes per run** — on EVERY run, success or failure
- Wall-clock savings were minimal (~2 min for Cypress, ~0 for Unit-Tests) because test setup finishes much faster than the quality gate

**Run data:** https://github.com/opendatahub-io/odh-dashboard/actions/runs/30618780877
**PR:** https://github.com/opendatahub-io/odh-dashboard/pull/9014

### Other approaches evaluated but not tried

| Approach | Why rejected |
|---|---|
| `continue-on-error` on Quality-Gate + job output + `if` on test jobs | Quality-Gate is a matrix (`fail-fast: true`). `continue-on-error` would disable `fail-fast`. Making it a single sequential job adds ~7 min (lint then type-check on one runner). Either way, test jobs still `needs: [Quality-Gate]` so no wall-clock savings. |
| Run lint/type-check in parallel on one runner inside Setup | Lint uses `NODE_OPTIONS="--max-old-space-size=8192"`. Running both lint + type-check on a 7GB runner would OOM. |
| Split test jobs into prep (parallel with QG) + execution (needs QG) | Prep jobs save ~2 min of setup but artifact upload/download adds ~1 min overhead. Net savings ~1 min, not worth the complexity. |
| Turbo remote cache sharing across runners | Would require Vercel Remote Cache or equivalent infra. Not available. |
| `concurrency` groups for cross-job cancellation | Concurrency controls prevent duplicate runs; they don't allow one job to cancel a different job. |
| Embed quick lint/type-check in each test job | Duplicates the check across 69 jobs. Even with turbo cache, the cache keys are per-task so there's no hit. |

---

## Recommended approach: one-time quality gate check (no polling)

### Core idea

Remove Quality-Gate from test job `needs` so tests start immediately after Setup. Replace the polling loop with a **single API call** (not a loop) right before the expensive test step. The `Tests` aggregate job (which already has `needs: [Quality-Gate, ...]` with `if: always()`) is the guaranteed safety net.

### How it works

1. Test jobs start right after `Setup` — no waiting for quality gates
2. While tests do checkout + cache restore (~2–4 min), quality gates run in parallel
3. Right before the expensive test command, one `listJobsForWorkflowRun()` call checks: has Quality-Gate already failed?
   - **Yes** → the test job self-fails immediately (saves test execution time)
   - **No (still running or passed)** → tests proceed normally
4. If quality gate fails *after* the check → tests run to completion, but `Tests` aggregate job still catches the failure and blocks the merge

### Why one check is enough

The one-time check is not a polling loop — it's a best-effort early exit. It catches quality gate failures that have already completed by the time the check runs. For Cypress jobs, this is ~7 min into the pipeline (after Cypress-Setup + cache restore), so it catches most failures since quality gates take ~7–9 min. For Unit-Tests, the check runs only ~2 min in and will rarely catch a failure — but the `Tests` aggregate job is the guaranteed backstop regardless.

### Expected performance

| Metric | `needs` (original) | Polling (attempt 2) | One-time check (proposed) |
|---|---|---|---|
| Wall-clock (success) | ~25 min | ~23 min | ~20 min |
| Billable waste (success) | 0 min | **151 min** | **0 min** |
| Billable waste (lint failure) | 0 min | ~20 min | ~200–470 min |
| Expected avg waste (15% failure rate) | 0 min | 151 min | ~30–70 min |
| Complexity | Simple | Complex | Simple |

The tradeoff: when lint/type-check fails, test jobs may run to completion unnecessarily. But lint failures are a minority of pushes, and even at a 30% failure rate the expected waste (141 min) is less than what polling wastes on every single run (151 min). The original `needs` approach wastes zero billable time but adds ~5 min wall-clock to every run.

---

## Implementation plan

### Changes to `.github/workflows/test.yml`

**Keep from the current branch:**
- The Quality-Gate matrix job (merged Lint + Type-Check into one job with `fail-fast: true`)
- The `permissions: { actions: read, contents: read }` on Unit-Tests and Contract-Tests
- The `needs: [Setup]` (not Quality-Gate) on Unit-Tests and Contract-Tests
- The `needs: [Setup, Cypress-Setup, Get-Test-Groups, Get-Cypress-Packages]` (not Quality-Gate) on Cypress-Mock-Tests

**Replace** the polling loop in all three test jobs with a one-time check:

```yaml
- name: Abort if quality gate already failed
  uses: actions/github-script@60a0d83039c74a4aee543508d2ffcb1c3799cdea # v7.0.1
  with:
    script: |
      const { owner, repo } = context.repo;
      const { data } = await github.rest.actions.listJobsForWorkflowRun({
        owner, repo, run_id: context.runId,
      });
      const gates = data.jobs.filter(j => j.name.startsWith('Quality-Gate'));
      const failed = gates.filter(j =>
        j.conclusion === 'failure' || j.conclusion === 'cancelled'
      );
      if (failed.length > 0) {
        core.setFailed(
          `Quality gate(s) failed: ${failed.map(j => j.name).join(', ')}. Skipping tests.`
        );
        return;
      }
      const status = gates.map(j =>
        `${j.name}=${j.conclusion || 'in_progress'}`
      );
      core.info(`Quality gates: ${status.join(', ')}`);
```

Place this step **after** all setup steps (checkout, cache restore, module caches) but **before** the expensive test execution step in each job.

**Keep the `Tests` aggregate job unchanged** — it already has `needs: [Quality-Gate, ...]` with `if: always()` and checks `contains(needs.*.result, 'failure')`.

### Summary of `needs` changes (original → proposed)

| Job | Original `needs` | Proposed `needs` |
|---|---|---|
| Quality-Gate | `[Setup]` | `[Setup]` (unchanged) |
| Unit-Tests | `[Setup, Lint, Type-Check]` | `[Setup]` |
| Contract-Tests | `[Setup, Lint, Type-Check]` | `[Setup]` |
| Cypress-Mock-Tests | `[Setup, Lint, Type-Check, Cypress-Setup, Get-Test-Groups, Get-Cypress-Packages]` | `[Setup, Cypress-Setup, Get-Test-Groups, Get-Cypress-Packages]` |
| Tests | `[Lint, Type-Check, Unit-Tests, Contract-Tests, Cypress-Mock-Tests, Combine-Results-and-Upload]` | `[Quality-Gate, Unit-Tests, Contract-Tests, Cypress-Mock-Tests, Combine-Results-and-Upload]` (already done) |

---

## Test plan

### Test 1: Happy path — clean code, all checks pass

**Setup:** Push a commit with clean code (no lint or type errors) to the fork PR.

**Expected behavior:**
- Setup completes (~3 min)
- Quality-Gate (lint) and Quality-Gate (type-check) start
- Unit-Tests, Contract-Tests start immediately after Setup (NOT after Quality-Gate)
- Cypress-Setup starts after Setup; Cypress-Mock-Tests starts after Cypress-Setup
- One-time check in each test job does one API call, sees quality gates as `in_progress` or `success`, and logs the status without failing
- All jobs pass
- `Tests` aggregate job passes
- **Verify:** total wall-clock is ~20 min (vs ~25 min with the old `needs`-based approach)
- **Verify:** the "Abort if quality gate already failed" step takes <5s in each job (no polling loop)

**What to look at in the run logs:**
- Each test job's "Abort if quality gate already failed" step should show: `Quality gates: Quality-Gate (lint)=in_progress, Quality-Gate (type-check)=in_progress` or `=success`
- The step should complete in under 5 seconds
- Unit-Tests and Contract-Tests should start within ~30s of Setup completing (check `startedAt` timestamps)

### Test 2: Type error — quality gate fails, tests should abort or be caught

**Setup:** Push a commit with a deliberate type error (e.g., add `const x: number = "not a number";` to any `.ts` file). Lint should pass, type-check should fail.

**Expected behavior:**
- Quality-Gate (type-check) fails after ~9 min
- Quality-Gate (lint) may be cancelled by `fail-fast: true`, or may pass if it finishes first
- **Cypress-Mock-Tests:** The one-time check runs ~7 min into the pipeline. If type-check has already failed by then, Cypress jobs self-abort with `Quality gate(s) failed: Quality-Gate (type-check). Skipping tests.`. If type-check is still running, Cypress tests proceed but `Tests` catches it.
- **Unit-Tests:** The one-time check runs ~2 min in. Type-check likely hasn't failed yet, so unit tests probably run to completion. `Tests` catches the failure.
- **Contract-Tests:** Similar to Unit-Tests.
- `Tests` aggregate job fails because `Quality-Gate` failed
- **Verify:** PR shows red check on `Tests`

**What to look at in the run logs:**
- How many Cypress jobs caught the failure via the one-time check (look for `Quality gate(s) failed` in the step output)
- How many test jobs ran to completion despite the quality gate failure (these are the "wasted" runs — acceptable, caught by `Tests`)
- `Tests` job should show failure with "One or more required jobs failed"

### Test 3: Lint error — quality gate fails early

**Setup:** Push a commit with a deliberate lint error (e.g., add an unused import, or remove a trailing comma where required). Type-check should pass.

**Expected behavior:**
- Quality-Gate (lint) fails
- Quality-Gate (type-check) may be cancelled by `fail-fast: true` if lint fails first
- Same abort-or-catch behavior as Test 2 depending on timing
- `Tests` aggregate job fails
- **Verify:** PR shows red check on `Tests`

**What to look at:** Same as Test 2, but check if `fail-fast` correctly cancels the other matrix entry.

### Test 4: Both lint AND type errors

**Setup:** Push a commit with both a lint error and a type error.

**Expected behavior:**
- Both Quality-Gate entries fail (whichever fails first cancels the other via `fail-fast`)
- One-time check may or may not catch it depending on timing
- `Tests` fails
- **Verify:** The one-time check correctly reports the failed gate(s) by name if they've completed

### Test 5: Verify `Tests` aggregate catches late failures

**Setup:** Same as Test 2 (type error). Focus on the `Tests` aggregate job.

**Expected behavior:**
- Even if all test jobs "pass" (because the one-time check ran before the quality gate failed), the `Tests` aggregate job must still fail
- `Tests` has `needs: [Quality-Gate, ...]` and checks `contains(needs.*.result, 'failure')` — this is the guaranteed safety net
- **Verify:** `Tests` job conclusion is `failure` even though Unit-Tests conclusion might be `success`

### Test 6: Verify `Combine-Results-and-Upload` still works

**Setup:** Same as Test 1 (clean code). Focus on coverage upload.

**Expected behavior:**
- `Combine-Results-and-Upload` has `needs: [Unit-Tests, Cypress-Mock-Tests]` — these jobs must complete before it runs
- Coverage artifacts are uploaded correctly
- **Verify:** `unit-coverage` and `cypress-coverage-*` artifacts exist in the run

### Test 7: Verify `concurrency` + `cancel-in-progress` still works

**Setup:** Push a clean commit, then push a second commit before the first run finishes.

**Expected behavior:**
- First run is cancelled by `cancel-in-progress: true`
- Second run starts fresh and completes normally
- **Verify:** First run shows as "cancelled", second run completes

### Timing comparison template

Use this to record actual vs expected timing:

```
Run URL: ___
Run result: pass / fail

                              Started     Ended       Duration    Notes
Setup                         ________    ________    ________    
Quality-Gate (lint)           ________    ________    ________    
Quality-Gate (type-check)     ________    ________    ________    
Unit-Tests                    ________    ________    ________    one-time check: pass/fail/in_progress
Contract-Tests                ________    ________    ________    one-time check: pass/fail/in_progress
Cypress-Mock-Tests (any)      ________    ________    ________    one-time check: pass/fail/in_progress
Tests                         ________    ________    ________    
Total wall-clock              ________

One-time check step duration (should be <5s): ________
Cypress jobs that caught QG failure via check: ____ / ____
```

---

## Risks and edge cases

1. **Job name coupling:** The one-time check filters by `j.name.startsWith('Quality-Gate')`. If the job is renamed, the filter silently passes (no gates found = no failure detected). The `Tests` aggregate job still catches failures via `needs`, so this is a defense-in-depth issue, not a correctness issue.

2. **Quality-Gate matrix size assumption:** The current check doesn't validate that it found exactly 2 Quality-Gate jobs. If the matrix changes (e.g., adding a third check), the one-time check still works — it just checks for any failures among whatever gates it finds.

3. **Billable time on lint failure:** When lint fails and the one-time check misses it, all test jobs run to completion. With ~65 Cypress shards at ~7 min each plus Unit-Tests and Contract-Tests, this is ~470 min of billable time. This is the known tradeoff — acceptable because: (a) lint failures are a minority of pushes, (b) the `Tests` job still blocks the merge, (c) expected waste is still less than the polling approach.

4. **`Combine-Results-and-Upload` on quality gate failure:** If quality gate fails and some test jobs self-abort via the one-time check, they won't upload coverage artifacts. `Combine-Results-and-Upload` depends on `Unit-Tests` and `Cypress-Mock-Tests` — if those fail, it won't run. If they succeed (because the one-time check missed the failure), it runs normally. Either way, `Tests` catches the quality gate failure.

5. **`skipped` result handling:** If a test job is skipped (e.g., by a future `if` condition), the `Tests` aggregate job checks for `skipped` in results and fails. This is existing behavior, unchanged.

## Related

- PR #8970: Attempt 1 — `gh run cancel` sentinel (closed, 403 on fork PRs)
- PR #9014: Attempt 2 — quality-gate polling (current branch, 151 min billable waste per run)
- Original `needs`-based structure: `main` branch at commit `60b313a14`
