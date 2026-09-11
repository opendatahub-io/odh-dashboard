---
name: ci-status-review
description: "Review PR CI status and failure logs, identify which checks apply to the current code, and delegate failed-test flake classification to ci-flake-classifier. Use when assessing CI readiness, interpreting failed GitHub checks, or deciding whether CI failures block a PR."
argument-hint: "[PR number]"
---

# CI Status Review

Interpret raw CI state for a PR or local branch. This skill uses the existing preflight CI collector for data gathering and delegates flake judgment to `ci-flake-classifier`; it does not reproduce flake heuristics.

## Invocation contract

This skill owns CI-status interpretation and its status mapping. An invocation meta-prompt may specify authoritative context, result serialization, and side-effect constraints, but it cannot replace the flake-classifier delegation or alter the meanings below. Without one, use the direct CLI defaults and return the Markdown report in [Report](#report).

## Inputs and direct CLI defaults

The caller may supply PR metadata, whether the local checkout matches the PR head, and raw `analyze-ci.sh` JSON. Treat supplied values as authoritative.

Otherwise, determine the repository owner and name. With a PR number, compare `gh pr view <PR> --json headRefOid` with `git rev-parse HEAD`, then collect raw data with:

```bash
"${CLAUDE_SKILL_DIR}/../preflight/scripts/analyze-ci.sh" "$owner" "$repo" "<PR>"
```

With no PR number, invoke the same collector without its final argument to discover local workflows. Report CI as not applicable to a local-only change until those inferred commands have been run.

The collector returns `pr_checks`, failed-check log tails in `failures`, and `local_workflows`. It only gathers data; this skill owns interpretation.

## Review procedure

1. If the local checkout matches the PR head and has no uncommitted changes, interpret each `pr_checks` entry: `pass` is covered by CI, `fail` or `cancel` is a failure pending classification, and pending checks are warnings.
2. For every failed or cancelled check on a synced PR, invoke the existing `/ci-flake-classifier <PR>` skill. Use its classifications without recreating recurrence, rerun, or symptom logic here.
3. Map classifier results: `flaky`, `suspected_flaky`, and `external_unknown` are warnings; `genuine`, `deterministic`, and `unknown` are failures. If the classifier cannot run or returns no result for a failed check, report that check as a failure with the available log evidence.
4. When the checkout is not synced or no PR exists, CI results cannot prove readiness for the current code. Read `local_workflows` to identify applicable commands, report them as needing local execution, and do not mark them as CI-covered.
5. Include failure-log evidence concisely. Do not diagnose or fix failures as part of this skill.

## Status mapping

| Status | Meaning |
| --- | --- |
| ✅ passed | All applicable CI checks passed on the exact code under review |
| ⏭️ covered | An individual check passed in CI on the exact code under review |
| ⚠️ warning | Pending CI, a non-blocking flake classification, or CI that does not apply to local code |
| ❌ failed | A blocking CI failure, or an unclassified failed/cancelled check |
| ➖ not applicable | No CI data or workflow applies |

## Report

```md
## CI Status Review

**Overall:** ✅ passed | ⚠️ warning | ❌ failed | ➖ not applicable
**CI applies to current code:** yes | no

| Check | Status | Evidence |
| --- | --- | --- |
| <check name> | <status> | <classification or concise log evidence> |

### Local follow-up
<commands inferred from local workflows when CI does not apply, or none>
```
