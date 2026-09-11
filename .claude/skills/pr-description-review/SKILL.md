---
name: pr-description-review
description: "Review a pull request description for required ODH Dashboard template content, Jira linkage, test-impact context, checklist completion, and UI evidence. Use when checking PR completeness, PR template compliance, or merge readiness."
argument-hint: "[PR number]"
---

# PR Description Review

Review whether a PR body gives reviewers the information needed to understand, test, and approve the proposed change. This evaluates the PR description only; it does not judge implementation correctness or test quality.

## Invocation contract

This skill owns the template-completeness criteria and status mapping. A caller may provide an invocation meta-prompt that changes context acquisition, output format, and side-effect rules, but not these criteria. Without one, use the direct CLI defaults and return the Markdown report in [Report](#report).

## Inputs and direct CLI defaults

The caller may supply a PR body, changed paths, and the repository template. Treat supplied values as authoritative.

Otherwise, require a PR number. Fetch the body and changed paths with:

```bash
gh pr view <PR> --json body --jq .body
gh pr diff <PR> --name-only
```

Read `.github/pull_request_template.md` before reviewing. With no PR or supplied body, report ➖ not applicable; do not infer a PR description from commits or source files.

## Review procedure

Ignore HTML comments when deciding whether a section has substantive content. Check:

1. `## Description` explains the change. Missing or placeholder-only content is a failure.
2. `## How Has This Been Tested?` contains testing information. Missing content is a warning.
3. `## Test Impact` contains testing impact or a rationale that tests are inapplicable. Missing content is a warning.
4. The self-checklist is meaningfully completed. Report checked versus unchecked items; do not require every item that is inapplicable to be checked.
5. Jira linkage, resolved in this fixed order — take the first rule that matches and stop, so the same PR always yields the same result:

   1. Body contains a tracker URL (`issues.redhat.com/browse/<KEY>` or `atlassian.net/browse/<KEY>`) → **passed**.
   2. No URL, but an issue key matching `[A-Z][A-Z0-9]+-\d+` appears in the PR title or body → **warning**. The repository's convention is to carry the key in the title; the template asks for the URL, so a bare key is incomplete, not absent.
   3. Neither a URL nor a key anywhere → **failed** for code changes. For a non-code change the template is not required (see its first line), so report ➖ not applicable rather than a failure.

   Do not reclassify between these outcomes on judgment about whether the convention "counts" — the ladder is the decision.
6. When changed paths include `.tsx`, `.css`, or `.scss`, look for image or GIF evidence in the body. Missing visual evidence is a warning, not a failure.

## Status mapping

The overall status is the worst item status: any ❌ makes the review failed, otherwise any ⚠️ makes it a warning.

| Status | Meaning |
| --- | --- |
| ✅ passed | Description present; Jira linkage at rule 5.1; no warnings apply |
| ⚠️ warning | Description present and Jira linkage at rule 5.1 or 5.2, but testing, Test Impact, checklist context, Jira URL, or applicable UI evidence is incomplete |
| ❌ failed | Description is absent or placeholder-only, or Jira linkage falls to rule 5.3 on a code change |
| ➖ not applicable | No PR body is available, or a non-code change the template does not govern |

## Report

```md
## PR Description Review

**Status:** ✅ passed | ⚠️ warning | ❌ failed | ➖ not applicable

| Item | Status | Evidence |
| --- | --- | --- |
| Description | <status> | <summary> |
| Testing | <status> | <summary> |
| Test Impact | <status> | <summary> |
| Checklist | <status> | <checked>/<total> checked |
| Jira link | <status> | <URL or absent> |
| UI evidence | <status> | <applicable evidence or n/a> |
```
