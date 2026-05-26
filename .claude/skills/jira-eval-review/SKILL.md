---
name: jira-eval-review
description: Evaluates code changes in a PR against the acceptance criteria of a Jira issue. Given a Jira issue key, determines whether each criterion is satisfied, partially satisfied, or missed. Use when asked to evaluate a PR against a Jira issue, check acceptance criteria, or verify implementation completeness.
---

# Jira Evaluation Review

Evaluates code changes against Jira acceptance criteria to produce a structured per-criterion verdict report.

This skill operates independently of the [jira-triage pipeline](../jira-triage/SKILL.md). It is invoked on-demand for a single issue+PR pair, not as part of bulk triage.

**Before running this skill, read [`persona.md`](../jira-triage/persona.md) and [`jira-project-reference.md`](../jira-triage/jira-project-reference.md).** The persona defines the execution protocol (thoroughness, verification, no assumptions). The project reference provides field IDs, project key, component name, and other Jira-specific values used throughout this skill.

## Inputs

The user provides one or more of:

- **Jira issue key** (required) — e.g., `RHOAIENG-12345`
- **PR number or URL** (optional) — e.g., `#4567` or `https://github.com/opendatahub-io/odh-dashboard/pull/4567`. If omitted, the skill auto-detects from the current git branch.
- **Repository** (optional) — defaults to `opendatahub-io/odh-dashboard`

## Phase 1: Verify Prerequisites

Check that required tools are available before proceeding.

### Required Tools

| Tool | Purpose | How to verify |
|---|---|---|
| **Atlassian MCP** | Fetch Jira issue details and acceptance criteria | Call `jira_get_issue` with the provided issue key |
| **GitHub CLI (`gh`)** | Fetch PR metadata, changed files, and diffs | Run `gh api user` to verify connectivity |

### Verification procedure

1. Attempt to call `jira_get_issue` for the provided issue key with `fields=summary,description,status,issuetype,labels,assignee,parent,issuelinks,comment` and `comment_limit=50`
2. If the call fails with an auth or connection error, stop and report:
   > Atlassian MCP is not available or not authenticated. This skill requires the Atlassian MCP to fetch Jira issue details. Please configure and authenticate the Atlassian MCP server.
3. Verify GitHub CLI connectivity by running `gh api user`
4. If it fails, stop and report:
   > GitHub CLI is not available or not authenticated. This skill requires `gh` to fetch PR data. Please run `gh auth login` to authenticate.

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

Review Jira comments on the issue (already fetched in Phase 1 with `comment_limit=50`) for clarifications, additional requirements, scope changes, or other useful information that may refine or supplement the acceptance criteria extracted from the description.

#### Comment-AC discrepancy detection

After extracting criteria and reviewing comments, explicitly check whether any comment **changes what should be built** — not just how. A comment explaining implementation details or technical approach is a *clarification*; a comment saying "we decided to do X instead of Y" or "UX agreed to drop this requirement" is a *discrepancy*.

**Classification:**

- **Clarification** — explains how to implement, adds technical detail, or answers a question without changing the goal. These refine the AC and require no special treatment.
- **Discrepancy** — changes the intended behavior, drops a requirement, replaces one approach with another, or introduces a new requirement not captured in the written AC. These indicate the written AC may be stale.

**Signals that indicate a discrepancy (non-exhaustive):**

- Language like "instead of", "we decided to", "actually we should", "no longer need", "skip this", "changed direction", "updated approach", "won't do", "out of scope now"
- A comment from the assignee, reporter, or PM that describes different behavior than what the AC specifies
- A comment referencing a UX/design decision that contradicts the written AC

**When discrepancies are detected:**

1. Record each discrepancy: which comment (author, date), which criterion it affects, and what the comment says should happen instead.
2. During Phase 3 evaluation, if a criterion has a discrepancy: if the code matches the *written AC* but not the *comment's direction*, cap the verdict at **PARTIAL** and note the discrepancy in the evidence. If the code matches the *comment's direction* but not the *written AC*, still give the appropriate verdict (PASS/PARTIAL) based on the comment's updated intent, but flag that the written AC is stale.
3. Surface all discrepancies in a **Flags** section of the report (see Phase 4).

#### 1b. Traverse parent hierarchy and linked issues for context

The target issue should contain its own acceptance criteria. Parent epics/stories and linked issues provide **read-only context** to enhance understanding of the target issue's AC — they are **not** independent sources of criteria. Never add a criterion to the evaluation list because it appeared in a parent or linked issue. Use these issues only to clarify ambiguous criteria, fill in implicit requirements, or understand the broader feature context.

**MANDATORY: Always walk the full parent chain of the target issue.** Do NOT stop early because a parent "seems unrelated" or "is too far up." Context from any ancestor level may be needed to fully understand the child task's criteria. The only valid reason to stop is reaching an issue with no `parent` field (the root).

**Cycle detection:** Maintain a set of already-visited issue keys. Before fetching any issue (parent or linked), check whether it has already been visited. If so, skip it and continue. This prevents infinite loops from circular issue links.

**Traversal scope:**

1. **Parent chain (target issue only)** — check the issue's `parent` field. If a parent exists, call `jira_get_issue` for the parent key with `fields=summary,description,status,issuetype,labels,assignee,parent,issuelinks` and `update_history=false` (parent fetches are for context only — do not pollute the user's Jira view history). Do **not** pass `comment_limit` — comments are only reviewed on the target issue. **Always** continue up the hierarchy (parent-of-parent) until there is no further parent (i.e., the `parent` field is absent or null). Read each ancestor's description for context that clarifies the target issue's criteria.
2. **Linked issues (target issue only, single level)** — check the target issue's `issuelinks` field. For each link (e.g., "is blocked by", "is part of", "implements"), call `jira_get_issue` for the linked issue key with `fields=summary,description,issuetype` and `update_history=false`. Do **not** traverse parents or links of linked issues — only the target issue's direct links are in scope. Skip "duplicates", "is cloned by", and other non-requirement relationships — clones are often modified entirely and are unreliable. If more than 10 linked issues exist, process the first 10 and note in the report that additional links were skipped.
3. **Subtasks** — if the provided issue is an epic or story with subtasks, do **not** traverse downward. Criteria flow from parent to child, not the reverse.
4. **Rate-limit errors** — if the Atlassian MCP returns a rate-limit or throttling error during traversal, stop traversal, report which issues were successfully fetched, and continue the evaluation with the context gathered so far. Do not silently retry.

#### 1c. Handle no criteria found

If no structured criteria can be found in the issue (including after reviewing comments and parent/linked context), **stop and fail** with the following report:

> **Evaluation failed:** No acceptance criteria found in [{issue_key}](https://redhat.atlassian.net/browse/{issue_key}). The issue description does not contain structured acceptance criteria, requirements, or a definition of done. Please update the issue with explicit acceptance criteria before running this evaluation.

Do **not** fall back to using the issue summary as a criterion. Without explicit AC, the evaluation cannot produce meaningful results.

#### 1d. Organize criteria for the report

**Filter out test-related criteria.** Unless the issue itself is specifically about testing (e.g., "add unit tests for X", "fix flaky E2E test"), drop any acceptance criteria that are solely about adding or updating tests. This includes boilerplate items from the ticket template such as "Add/Update Cypress mocked tests" and "Add/Update unit tests for hooks/functions." This skill focuses on evaluating the core feature or fix — test coverage is handled separately.

Store each criterion as a numbered item. Do not label criteria by source issue — the target issue owns all its criteria, and parent/linked issues only provide context.

If the PR references **multiple Jira issues** (e.g., the PR title or body mentions several issue keys), evaluate each issue's criteria separately and enumerate them in the report with issue key prefixes to distinguish them.

### Step 2: Find the PR

Resolve the PR to evaluate. **Auto-detection from the current branch is the default** when no PR number or URL is provided.

1. **User provided a PR number or URL** — run `gh pr view {number} --json number,title,url,body,state,baseRefName` to fetch metadata
2. **Auto-detect from current branch** (default) — run `git branch --show-current` to get the branch name, then run `gh pr view --json number,title,url,body,state,baseRefName` to find the open PR for that branch
   - **If on `main`:** stop and report an error:
     > Cannot auto-detect PR from the `main` branch. Check out the feature branch or provide a PR number.
   - **If on a feature branch with an open PR:** use that PR
   - **If on a feature branch with no open PR:** fall back to `git diff main...HEAD` to evaluate the local branch changes directly. Report that no PR was found and the evaluation is based on the local branch diff against `main`.

### Step 3: Fetch Code Changes

**If a PR was resolved:**

1. Reuse PR metadata from Step 2 (`title`, `body`, `state`, `baseRefName` were already fetched — no redundant call)
2. Run `gh pr diff {number}` to get the full diff
3. Run `gh pr view {number} --json files --jq '.files[].path'` to get the list of changed files

**If evaluating local branch changes (no PR):**

1. Use the `git diff main...HEAD` output from Step 2 as the diff
2. Use `git diff --name-only main...HEAD` to get the list of changed files
3. Read key changed files from the local workspace using the `Read` tool

## Phase 3: Evaluate Criteria

For each acceptance criterion, assess whether the code changes satisfy it.

### Evaluation Process

For each criterion:

1. **Identify relevant changes** — which files and diff hunks relate to this criterion. For large diffs, prioritize files whose names or paths are most relevant to the criterion rather than reading every hunk sequentially. When the diff context is insufficient, use the `Read` tool to examine surrounding code in the full file.
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
**PR:** [#{number}]({url}) — {title}
**Status:** {N}/{total} criteria satisfied{, M partial if any}

### Flags

{Include this section only when comment-AC discrepancies were detected. Omit entirely if none were found.}

| Criterion | Comment Author | Discrepancy |
|-----------|---------------|-------------|
| #1 — {short criterion text} | {author}, {date} | {What the comment says vs. what the written AC says} |

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
- Code citations reference specific files and line ranges with a fenced code block. Format: `` `frontend/src/pages/Foo.tsx` lines 12–18: `` followed by a fenced block with the appropriate language tag (e.g., `` ```tsx ``). Alternatively, place the file/line reference as a comment inside the fence: `` ```tsx `` then `// frontend/src/pages/Foo.tsx:12-18` on the next line
- The summary table appears first for quick scanning; detailed sections follow
