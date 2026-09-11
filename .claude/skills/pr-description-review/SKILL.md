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
5. A Jira URL links to an issue tracker, such as `issues.redhat.com/browse/` or `atlassian.net/browse/`. Its absence is a failure for code changes governed by the template.
6. When changed paths include `.tsx`, `.css`, or `.scss`, look for image or GIF evidence in the body. Missing visual evidence is a warning, not a failure.

## Status mapping

| Status | Meaning |
| --- | --- |
| ✅ passed | Description and Jira link are present; no warnings apply |
| ⚠️ warning | Required description/Jira link is present, but testing, Test Impact, checklist context, or applicable UI evidence is incomplete |
| ❌ failed | Description or Jira link is absent or placeholder-only |
| ➖ not applicable | No PR body is available |

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
