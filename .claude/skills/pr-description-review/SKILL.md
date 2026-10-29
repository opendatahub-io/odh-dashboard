---
name: pr-description-review
description: "Review a pull request description for substance readiness: Problem, Solution, and Evidence. Use when checking PR description completeness or merge readiness."
argument-hint: "[PR number]"
---

# PR Description Review

Review whether a PR body gives reviewers the information needed to understand, test, and approve the proposed change. This evaluates the PR description only; it does not judge implementation correctness or test quality.

## Invocation contract

This skill owns the substance-readiness criteria and status mapping. A caller may provide an invocation meta-prompt that changes context acquisition, output format, and side-effect rules, but not these criteria. Without one, use the direct CLI defaults and return the Markdown report in [Report](#report).

## Inputs and direct CLI defaults

The caller may supply a PR body and changed paths. Treat supplied values as authoritative.

Otherwise, require a PR number. Fetch the body and changed paths with:

```bash
gh pr view <PR> --json body --jq .body
gh pr diff <PR> --name-only
```

With no PR or supplied body, report ➖ not applicable; do not infer a PR description from commits or source files.

## Review procedure

**Evaluate substance, not format.** Read the entire body end-to-end, ignoring HTML comments, before scoring. Information often appears under a different heading than where a template expects it. A section counts as **present** if the substance appears **anywhere** in the body, regardless of which heading (or no heading) it sits under. Empty headings with only HTML comments or placeholders do not count.

Score these three aspects:

1. **Problem** — What is wrong or missing. The body describes the broken workflow, gap, or motivation — not just a file list or code-level cause. Missing or placeholder-only → ❌. Present but vague (one sentence, no actionable detail) → ⚠️.

2. **Solution** — What changed and why this approach. The body explains what the PR does and the reasoning behind the chosen approach. Missing or placeholder-only → ❌. Present but vague, or a file list with no rationale → ⚠️. When the diff touches security/RBAC, API/contract, migrations, or breaking changes and the body does not note the impact → ⚠️.

3. **Evidence** — Proof the change works. Automated tests covering the change are presumed to run in required CI; do not enumerate or verify the required checks, and do not require the author to restate those runs, name the commands, or repeat their output — never score this aspect down for that absence alone. The one hard requirement is that Evidence is not blank: where required CI is the only applicable proof, a plain statement that automated coverage is the evidence satisfies the aspect, in any wording — do not prescribe a phrase. Author-supplied evidence is still required for what a CI run cannot show — visual proof for UI changes, cluster or manual checks, and test-quality judgments — so look for commands run, cluster checks, screenshots, or log snippets. For non-behavioral edits (localization strings, docs, formatting), a scope statement such as "localization only; no behavior change" is sufficient; do not ask for test runs or screenshots. When changed paths include `.tsx`, `.css`, or `.scss`, look for visual evidence (screenshot, GIF, or video/recording attachment, including `user-attachments` media links); missing visual evidence for UI changes is a ⚠️ (folded into this aspect, not a separate row). A blank or placeholder-only Evidence section → ❌ even when required CI covers the change, because a reviewer needs something to check the change against. Missing or placeholder-only author-supplied proof for what required CI cannot show → ❌. Present but thin (e.g., "tested locally" with no details) → ⚠️. Evidence that leaks tokens, passwords, or cluster credentials → ❌.

One classic `## Description` may satisfy **both** Problem and Solution when both substances are clearly present. Do not require separate headings.

## Status mapping

The overall status is the worst aspect status: any ❌ makes the review failed, otherwise any ⚠️ makes it a warning.

| Status | Meaning |
| --- | --- |
| ✅ passed | All three aspects present with substantive content |
| ⚠️ warning | All aspects present but at least one is thin or vague, or UI evidence is missing for visual changes |
| ❌ failed | At least one aspect is absent or placeholder-only |
| ➖ not applicable | No PR body is available |

## Report

```md
## PR Description Review

**Status:** ✅ passed | ⚠️ warning | ❌ failed | ➖ not applicable

| Item | Status | Evidence |
| --- | --- | --- |
| Problem | <status> | <summary> |
| Solution | <status> | <summary> |
| Evidence | <status> | <summary> |
```
