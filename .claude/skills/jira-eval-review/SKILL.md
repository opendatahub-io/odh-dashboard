---
name: jira-eval-review
description: Evaluates code changes in a PR against the acceptance criteria of a Jira issue. Given a Jira issue key, determines whether each criterion is satisfied, partially satisfied, or missed. Use when asked to evaluate a PR against a Jira issue, check acceptance criteria, or verify implementation completeness.
---

# Jira Evaluation Review

Evaluates code changes against Jira acceptance criteria to produce a structured per-criterion verdict report.

This skill operates independently of the [jira-triage pipeline](../jira-triage/SKILL.md). It is invoked on-demand for a single issue+PR pair, not as part of bulk triage.

## Inputs

The user provides one or more of:

- **Jira issue key** (required) — e.g., `RHOAIENG-12345`
- **PR number or URL** (optional) — e.g., `#4567` or `https://github.com/opendatahub-io/odh-dashboard/pull/4567`. If omitted, the skill auto-detects from the current git branch.
- **Repository** (optional) — defaults to `opendatahub-io/odh-dashboard`

## Phase 1: Verify Prerequisites

Check that both required MCP servers are available before proceeding.

### Required MCPs

| MCP | Purpose | How to verify |
|---|---|---|
| **Atlassian** (`user-atlassian`) | Fetch Jira issue details and acceptance criteria | Call `jira_get_issue` with a known key format |
| **GitHub** (`user-github`) | Fetch PR diff and changed files | Call `pull_request_read` or `search_pull_requests` |

**Verification procedure:**

1. Attempt to call `jira_get_issue` for the provided issue key with `fields=summary,description,status,issuetype,labels,assignee,parent,issuelinks`
2. If the call fails with an auth or connection error, stop and report:
   > Atlassian MCP is not available or not authenticated. This skill requires the Atlassian MCP to fetch Jira issue details. Please configure and authenticate the `user-atlassian` MCP server.
3. Attempt a lightweight GitHub call (e.g., `get_me`) to verify the GitHub MCP is reachable
4. If it fails, stop and report:
   > GitHub MCP is not available or not authenticated. This skill requires the GitHub MCP to fetch PR diffs. Please configure and authenticate the `user-github` MCP server.

If both succeed, proceed. The Jira issue data from step 1 is reused in Phase 2 (no redundant fetch).

## Phase 2: Gather Context

### Step 1: Extract Acceptance Criteria

Extract acceptance criteria from the provided Jira issue **and** its parent/linked issues.

#### 1a. Collect criteria from the direct issue

Parse the Jira issue description (fetched in Phase 1) to extract discrete acceptance criteria. Look for:

- A section titled "Acceptance Criteria" (any heading level, case-insensitive)
- Bullet points or numbered items under that section
- Checkbox-style items (`- [ ]` or `- [x]`)

If no explicit "Acceptance Criteria" section exists, look for:
- A "Requirements" or "Definition of Done" section
- Bullet-point lists that describe expected behavior or deliverables

#### 1b. Traverse parent hierarchy and linked issues

The direct issue may not contain all relevant criteria. Parent epics/stories and linked issues often carry high-level acceptance criteria that child tasks must satisfy.

1. **Parent issue** — check the issue's `parent` field. If a parent exists, call `jira_get_issue` for the parent key and extract any acceptance criteria from its description. Continue up the hierarchy (parent-of-parent) until there is no further parent or no additional criteria are found (max depth: 3).
2. **Linked issues** — check the issue's `issuelinks` field. For each link (e.g., "is blocked by", "is part of", "implements"), fetch the linked issue and extract criteria from its description. Only follow links where the relationship suggests the linked issue may contain requirements (skip "is cloned by", "duplicates", etc.).
3. **Subtasks** — if the provided issue is an epic or story with subtasks, do **not** traverse downward. Criteria flow from parent to child, not the reverse.

De-duplicate criteria that appear in multiple issues. When a criterion appears in both the direct issue and a parent, keep it once and note that it originates from the parent.

#### 1c. Handle no criteria found

If no structured criteria can be found across the issue and its parents/links, report:
> No acceptance criteria found in the issue or its parent/linked issues. The issue may need a description update before evaluation. Proceeding with the issue summary as a single high-level criterion.

In that case, use the issue **summary** as a single criterion (the evaluation will be less granular).

#### 1d. Organize criteria for the report

Store each criterion as a numbered item. When criteria come from multiple issues, group and label them by source:

```text
1. [RHOAIENG-12345] Criterion from the direct issue
2. [RHOAIENG-12345] Another criterion from the direct issue
3. [RHOAIENG-12000 — parent] Criterion inherited from parent epic
4. [RHOAIENG-12100 — linked] Criterion from a linked story
```

### Step 2: Find the PR

Resolve the PR to evaluate. **Auto-detection from the current branch is the default** when no PR number or URL is provided.

1. **User provided a PR number or URL** — use it directly
2. **Auto-detect from current branch** (default) — run `git branch --show-current` to get the branch name, then use the GitHub MCP's `search_pull_requests` (query: `repo:{owner}/{repo} head:{branch} is:open`) to find an open PR for that branch. If the GitHub MCP is unavailable, fall back to `gh pr view --json number,title,url 2>/dev/null`
   - **If on `main`:** stop and report an error:
     > Cannot auto-detect PR from the `main` branch. Check out the feature branch or provide a PR number.
   - **If on a feature branch with an open PR:** use that PR
   - **If on a feature branch with no open PR:** fall back to `git diff main...HEAD` to evaluate the local branch changes directly. Report that no PR was found and the evaluation is based on the local branch diff against `main`.

### Step 3: Fetch Code Changes

**If a PR was resolved:**

1. Call `pull_request_read` with `method: "get"` to get PR metadata (title, body, state, draft status)
2. Call `pull_request_read` with `method: "get_files"` to get the list of changed files
3. Call `pull_request_read` with `method: "get_diff"` to get the full diff

If the PR is in **draft** state, note this prominently in the report header. Draft PRs may have intentionally incomplete changes; use `[SKIP]` rather than `[MISS]` for criteria that appear to be not-yet-implemented (as opposed to overlooked).

**If evaluating local branch changes (no PR):**

1. Use the `git diff main...HEAD` output from Step 2 as the diff
2. Use `git diff --name-only main...HEAD` to get the list of changed files
3. Read key changed files from the local workspace using the `Read` tool


## Phase 3: Evaluate Criteria

For each acceptance criterion, assess whether the code changes satisfy it.

### Evaluation Process

For each criterion:

1. **Identify relevant changes** — which files and diff hunks relate to this criterion
2. **Assess coverage** — does the code change fully address the criterion?
3. **Check for edge cases** — are there obvious gaps or missing pieces?
4. **Assign a verdict**

### Verdicts

| Verdict | Symbol | Meaning |
|---|---|---|
| **Satisfied** | `[PASS]` | The code changes fully address this criterion with clear evidence |
| **Partially Satisfied** | `[PARTIAL]` | Some aspects are addressed but gaps remain |
| **Not Satisfied** | `[MISS]` | No evidence the criterion is addressed in the changes |
| **Cannot Evaluate** | `[SKIP]` | Criterion requires runtime verification, manual testing, or information not available in the diff |

### Evidence Requirements

Every verdict must cite specific evidence:

- **PASS**: reference the file(s) and change(s) that satisfy the criterion
- **PARTIAL**: reference what is present and explicitly state what is missing
- **MISS**: confirm no relevant changes were found (list files searched)
- **SKIP**: explain why the criterion cannot be evaluated from code alone

## Phase 4: Generate Report

Present the report in this format:

```markdown
## Jira Evaluation Review

**Issue:** [RHOAIENG-12345](https://redhat.atlassian.net/browse/RHOAIENG-12345) — {summary}
**Related issues analyzed:** {list of parent/linked issue keys with links, or "none" if only the direct issue}
**PR:** [#{number}]({url}) — {title}
**Status:** {N}/{total} criteria satisfied

### Per-Criterion Evaluation

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | {criterion text} | {verdict} | {brief evidence} |
| 2 | {criterion text} | {verdict} | {brief evidence} |

### Details

#### 1. {criterion text}

**Verdict:** {PASS|PARTIAL|MISS|SKIP}

{Detailed explanation with file references and code citations.}

#### 2. {criterion text}

...

### Summary

- **Satisfied:** N criteria
- **Partially satisfied:** N criteria
- **Not satisfied:** N criteria
- **Cannot evaluate:** N criteria

{Overall assessment: is the PR ready for merge from an AC perspective, or what gaps remain?}
```

### Report Rules

- Every issue key in the report is a clickable link: `[RHOAIENG-12345](https://redhat.atlassian.net/browse/RHOAIENG-12345)`
- PR references are clickable links when a PR exists: `[#4567](https://github.com/opendatahub-io/odh-dashboard/pull/4567)`. When evaluating from a local branch diff, show the branch name instead (e.g., `_(no PR)_ — branch \`feature-branch\``)
- File references use backtick-wrapped paths: `` `frontend/src/pages/Foo.tsx` ``
- Code citations use the repository's standard fenced code block format with a `startLine:endLine:filepath` header, e.g., a line containing `` ``` `` followed by `12:18:frontend/src/pages/Foo.tsx` on the same line as the opening fence
- The summary table appears first for quick scanning; detailed sections follow
