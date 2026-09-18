---
name: test-impact-review
description: "Assess whether a pull request or local code change has appropriate test coverage or a credible Test Impact explanation. Use when reviewing test impact, checking whether changed code needs tests, or preparing a PR for merge."
argument-hint: "[PR number | path | branch]"
---

# Test Impact Review

Determine whether the change includes relevant test coverage or explains why tests are not applicable. This check is deliberately narrower than a test run: it assesses the relationship between changed implementation and test evidence.

## Invocation contract

This skill owns the test-impact judgment, status, and evidence requirements. If the caller supplies an invocation meta-prompt, follow it for supplied context, output serialization, and side-effect limits; it cannot change these review criteria. Without one, use the direct CLI defaults below and return the Markdown report in [Report](#report).

## Inputs and direct CLI defaults

The caller may provide changed paths, a PR body, and a base branch. Treat supplied context as authoritative.

Otherwise:

- With a PR number, obtain changed paths with `gh pr diff <PR> --name-only` and the body with `gh pr view <PR> --json body --jq .body`.
- With a file or directory path, review that target and its nearby tests when identifiable.
- With a branch name, validate and resolve it before running `git diff main...<branch> --name-only`.
- With no argument, run `git diff main --name-only`.

For a local change, there is no PR body unless the caller explicitly provides one.

## Review procedure

1. Classify changed files. Documentation, manifests, generated files, lockfiles, and other non-code-only changes do not require test files; report them as not applicable.
2. For code changes, identify added or modified test files by the repository conventions: names containing `.test.`, `.spec.`, or `.cy.`.
3. If relevant tests changed, pass the check and name them. Do not claim the tests pass unless execution evidence was supplied or the tests were run.
4. If no relevant test changed, read the PR body's `## Test Impact` section. A substantive explanation that tests are inapplicable or were intentionally not added passes the check. HTML comments, empty headings, and placeholder text are not explanations.
5. If neither test evidence nor an explanation exists, return a warning. This is not a merge-blocking failure by itself: reviewers may reasonably decide the change does not need automated coverage.

## Status mapping

| Status | Meaning |
| --- | --- |
| ✅ passed | Relevant tests changed, or Test Impact gives a substantive rationale |
| ⚠️ warning | Code changed without test files or a substantive rationale |
| ➖ not applicable | Only non-code changes are in scope |

## Report

```md
## Test Impact Review

**Status:** ✅ passed | ⚠️ warning | ➖ not applicable

- Code files changed: <count and paths when useful>
- Test files changed: <paths, or none>
- Test Impact rationale: <summary, or absent>
- Reason: <why this status applies>
```
