---
name: test-impact-review
description: "Assess whether a pull request or local change has assurance-grade test impact: durable automation, efficient tier, and deep testing evidence. Use when reviewing test impact, automation sufficiency, test efficiency, or merge readiness."
argument-hint: "[PR number | path | branch]"
---

# Test Impact Review

Assurance-grade readiness check for how the change is tested. Scores **Automation**, **Efficiency**, and **Evidence depth**. This is narrower than a test run and is a readiness check only (not a code-finding producer): it judges durable automation, tier/efficiency, and whether author-supplied proof covers the change and protects feature integrity while those tests stay green. This skill digs into whether that proof (required in the description) is adequate for the actual changes.

## Invocation contract

This skill owns the test-impact criteria and status mapping. A caller may provide an invocation meta-prompt that changes context acquisition, output format, and side-effect rules, but not these criteria. Without one, use the direct CLI defaults and return the Markdown report in [Report](#report).

## Inputs and direct CLI defaults

The caller may supply a PR body, changed paths, a base branch, and/or enough of the diff and relevant source/test files. Treat supplied values as authoritative.

Otherwise:

- With a PR number, fetch body and changed paths, then obtain enough of the diff and nearby tests to score applicable aspects:

```bash
gh pr view <PR> --json body --jq .body
gh pr diff <PR> --name-only
gh pr diff <PR>
```

- With a file or directory path, review that target and its nearby tests when identifiable. There is no PR body unless the caller provides one.
- With a branch name, validate and resolve it, then inspect `git diff main...<branch>` (names and content as needed).
- With no argument, use `git diff main` (names and content as needed).

Do **not** pass Evidence depth from the test tree alone when the description omits testing proof.

## Review procedure

Classify changed paths (product code vs docs / manifests / generated / lockfiles / CI config). Then score the three aspects below. Evaluate substance in the PR body end-to-end (ignore HTML comments); testing proof may appear under any heading, but a heading alone is not enough.

**Do not** treat “a `.test.` / `.spec.` / `.cy.` file changed” as an automatic pass. **Do not** treat a substantive testing rationale in the PR description alone as an automatic pass — use it as input to Evidence depth.

### 1. Automation

Is there enough durable test automation for the future to cover the feature, including edge cases?

- Product-code changes that need automation but lack adequate coverage (including edge cases) → ❌, **unless** the PR description provides a **sufficient constraint justification** (see below) → ⚠️.
- Coverage present but thin / missing important edges → ⚠️.
- Adequate durable automation for the change → ✅.
- **➖** when there is no product behavior under test (e.g. docs-only, pure lockfile/manifest/generated with nothing sensible to unit- or mock-test). Do not require new test files for those heads.

**Constraint justification (Automation):** the author may explain in the PR body — typically under `## Evidence` alongside their other testing proof — why durable test automation could not or should not be added for this change (e.g. the surface is not automatable, the change is infrastructure/workflow-only with no testable behavior, or tests would provide no value for the specific type of change). A sufficient justification must state **which constraint** applies, **why** automation is inappropriate or impossible here, and **what alternative verification** exists. When sufficient, score ⚠️ (acknowledged waiver) instead of ❌ — never ✅, which would imply automation exists. Note in the Evidence cell that the score was adjusted based on the author's constraint justification.

### 2. Efficiency

Are tests written efficiently? Call out duplication. Prefer unit tests over Cypress mock. Reserve mock/e2e-style tests for flows or application-level testing, not isolated component-level checks.

- **Heavy Cypress dependence with little or no unit tests → ❌**, unless the PR description **explicitly justifies** that mix (why units are not appropriate and Cypress is the right tier) → ⚠️. The justification must explain which constraint makes unit tests inappropriate and why Cypress is the correct tier for this change. Note in the Evidence cell when the score was adjusted.
- Milder wrong-tier, duplication, or efficiency issues → ⚠️.
- Efficient tier mix for the change → ✅.
- **➖** when there is nothing to place on the pyramid (Automation is ➖; or there are no tests to evaluate for tier/efficiency — including when Automation is ❌ for missing coverage, or ⚠️ solely from a constraint justification with no tests present). Do not score Efficiency when the suite is empty, even if Automation was waived to ⚠️.

### 3. Evidence depth

Dig into author-supplied testing evidence (and related automation): does it sufficiently cover the changes that were made, and will feature integrity hold so long as those tests continue to pass?

- Testing proof **not called out in the PR description** → ❌, even when the tree already has good automation. Silent “tests exist in the tree” is not enough.
- Proof present but does not cover the changed behavior, or green tests would not protect integrity → ❌.
- Proof present but thin / partially matched to the change → ⚠️.
- Proof in the description adequately covers the change and supports integrity-while-green → ✅.
- **Still scored** for docs, manifests, lockfiles, CI config, and similar: require verification proof in the description (CI green, install/deploy check, override rationale, etc.) that fits the change. Missing call-out → ❌.
- **➖** only when no PR body is available (cannot evaluate description call-out). Do **not** mark the whole check ➖ merely because the head is docs/manifest/lockfile-only.

## Status mapping

Overall status follows the applicable aspects (ignore ➖): any ❌ → failed; else any ⚠️ → warning; else passed when at least one aspect was scored. If every aspect is ➖, the check is not applicable.

| Status | Meaning |
| --- | --- |
| ✅ passed | Every applicable aspect is ✅ |
| ⚠️ warning | At least one applicable aspect is ⚠️, and every other applicable aspect is ✅ or ⚠️ |
| ❌ failed | At least one applicable aspect is ❌ |
| ➖ not applicable | Nothing to review (e.g. empty change and no PR body), or every aspect is ➖ |

## Report

```md
## Test Impact Review

**Status:** ✅ passed | ⚠️ warning | ❌ failed | ➖ not applicable

| Item | Status | Evidence |
| --- | --- | --- |
| Automation | <status> | <summary> |
| Efficiency | <status> | <summary> |
| Evidence depth | <status> | <summary> |
```
