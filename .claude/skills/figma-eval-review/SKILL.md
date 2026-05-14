---
name: figma-eval-review
description: Evaluates code changes in a PR against a Figma design to assess visual conformance. Given a Figma URL (or discovers one from the linked Jira ticket), analyzes the code diff and reports how well the implementation matches the intended design. Static analysis only — no browser automation. Use when asked to compare a PR or branch against a Figma design, verify design fidelity, or review implementation conformance.
---

# Figma Evaluation Review

Evaluates code changes against a Figma design to produce a structured design-conformance report. Uses the Figma MCP to extract design context (component structure, tokens, layout, screenshot) and the GitHub MCP to fetch the PR diff, then statically analyzes how well the code matches the intended design.

This skill is invoked on-demand for a single Figma-design + PR pair.

## Inputs

The user provides:

- **Jira ticket key or URL** (required) — e.g., `RHOAIENG-12345` or `https://redhat.atlassian.net/browse/RHOAIENG-12345`. The Jira ticket is the primary source for discovering the Figma URL and PR when they are not provided directly.
- **Figma URL** (optional) — e.g., `https://figma.com/design/ABC123/MyFile?node-id=1-2`. If omitted, the skill discovers the Figma URL from the Jira ticket (see Phase 2, Step 2).
- **PR number or URL** (optional) — e.g., `#4567` or `https://github.com/opendatahub-io/odh-dashboard/pull/4567`. If omitted, the skill auto-detects from the current git branch.
- **Repository** (optional) — defaults to `opendatahub-io/odh-dashboard`

If the user does not provide a Jira ticket, ask for one before proceeding.

## Phase 1: Verify Prerequisites

Check that all required MCP servers are available before proceeding.

### Required MCPs

| MCP | Purpose | How to verify |
|---|---|---|
| **Figma** (`plugin-figma-figma`) | Fetch design context, screenshot, node metadata, and component structure | Call `get_metadata` with a known test fileKey to verify connectivity |
| **Atlassian** (`user-atlassian`) | Discover Figma URLs from Jira tickets and linked UX issues; fetch ticket objectives to scope which Figma nodes are relevant | Call `jira_get_issue` with a test key |

### Optional MCPs

| MCP | Purpose | How to verify |
|---|---|---|
| **GitHub** (`user-github`) | Fetch PR diff, changed files, and search for open PRs by branch name. If unavailable, the skill falls back to local git commands (`git diff`, `git log`, `git branch`). | Call `get_me` to verify connectivity |

### Verification procedure

1. **Figma MCP** — call `get_metadata` with a known test fileKey (any lightweight call that exercises authentication). If it fails with an authentication or MCP error, stop and report:
   > **Figma MCP is not available or not authenticated.** This skill requires the Figma MCP (`plugin-figma-figma`) to fetch design context. Please set up the Figma MCP server by following the [Figma MCP setup guide](https://help.figma.com/hc/en-us/articles/35281350665623-Figma-MCP-collection-How-to-set-up-the-Figma-remote-MCP-server-preferred) and try again.
   Discard the test result — actual Figma data is fetched in Phase 2, Step 3.
2. **Atlassian MCP** — call `jira_get_issue` with the dummy key `NONEXISTENT-0`. Any HTTP response (including 404 "issue not found") means the MCP is reachable. Only treat network errors, timeouts, or MCP request failures as unavailable. If unreachable, stop and report:
   > **Atlassian MCP is not available or not authenticated.** This skill requires the Atlassian MCP to discover Figma URLs from Jira tickets and scope the evaluation. Please configure and authenticate the `user-atlassian` MCP server.
3. **GitHub MCP** (optional) — call `get_me` to check reachability. Record the result but **do not stop** if it fails — the skill falls back to local git commands.

If all required MCPs succeed, proceed to Phase 2.

## Phase 2: Gather Context

### Step 1: Find the PR

Resolve the PR to evaluate. Auto-detection from the current branch is the default when no PR number or URL is provided.

1. **User provided a PR number or URL** — use it directly
2. **Auto-detect from current branch** (default) — run `git branch --show-current` to get the branch name. If the GitHub MCP is available, use `search_pull_requests` (query: `repo:{owner}/{repo} head:{branch} is:open`) to find an open PR. If the GitHub MCP is unavailable, skip PR search and go directly to the local git fallback.
   - **If on `main`:** stop and report the following — do not fall back to `git diff` since `main...HEAD` produces no diff on main:
     > Cannot auto-detect PR from the `main` branch. Check out the feature branch or provide a PR number.
   - **If on a feature branch with an open PR:** use that PR
   - **If on a feature branch with no open PR (or GitHub MCP unavailable):** fall back to `git diff main...HEAD` to capture committed changes on the feature branch relative to main. If the diff is empty (no committed changes ahead of main), stop and report: "No changes to evaluate — the branch has no commits ahead of main." Otherwise, report that no PR was found and the evaluation is based on the local branch diff.

### Step 2: Resolve Figma URL and Extract Jira Ticket Objectives

This step discovers the Figma URL (if not provided by the user) and extracts Jira ticket context to scope the evaluation.

#### 2a. Parse the Jira key

Extract the Jira issue key from the user-provided input. If the user gave a URL (e.g., `https://redhat.atlassian.net/browse/RHOAIENG-12345`), extract the key (`RHOAIENG-12345`). If the user gave a key directly, use it as-is.

#### 2b. Fetch ticket details

Call `jira_get_issue` with the extracted key and `fields=summary,description,status,issuetype,labels,issuelinks`. Extract:

- **Summary** — the one-line objective
- **Description** — full context including requirements and any Figma URLs or node references embedded in the ticket
- **Acceptance criteria** — search the description for a section titled "Acceptance Criteria", "Requirements", or "Definition of Done" and extract each criterion as a discrete item. If not found in the description, check the issue's fields map for a field whose name or display name matches "Acceptance Criteria" (this is typically a custom field whose ID varies by Jira instance) and extract its value.
- **Issue links** — the list of linked issues (used in step 2c for Figma URL discovery)

#### 2c. Discover Figma URL from Jira (if not provided by user)

If the user did not provide a Figma URL, search for one in the Jira ticket. Figma URLs are typically not in the PR itself but linked from the Jira issue or a related UX issue. Search these sources in order — stop at the first match:

1. **Ticket description** — scan the description for URLs matching `figma.com/design/` or `figma.com/file/`. Extract the first Figma URL found.
2. **Ticket comments** — call `jira_get_issue` with `comment_limit=20` (if not already fetched with comments) and scan all comment bodies for Figma URLs. Designers often paste Figma links in comments rather than the description.
3. **Custom fields** — check the issue's fields for any field values containing Figma URLs. Some teams use custom fields (e.g., "Design Link", "Figma URL") to store design references.
4. **Linked UX issues** — check the issue's `issuelinks` for linked issues. Look for links whose related issue has a label like `ux`, `design`, or `UX/Design`, or whose issue type is `Design` or `UX`. For each candidate (limit to 3 to avoid over-fetching), call `jira_get_issue` with `fields=summary,description` and scan the description for Figma URLs.
5. **Linked issues (general)** — if no UX-specific links were found, check linked issues whose summary mentions "design", "figma", "mockup", or "UX" (case-insensitive). Fetch up to 2 candidate descriptions.

If a Figma URL is discovered, parse it to extract `fileKey` and `nodeId` (see parsing rules in Step 3).

If no Figma URL is found in any source, stop and report:
> No Figma URL found. Searched the Jira ticket description, comments, custom fields, and linked issues for [{issue key}]({jira url}) but found no Figma link. Please provide a Figma URL directly.

#### 2d. Use ticket objectives to scope the Figma evaluation

If the Figma URL (whether user-provided or discovered) points to a **page or top-level frame** (rather than a specific component node), use the ticket objectives to narrow focus:

1. Call `get_metadata` for the Figma page to get the structure of all child frames/nodes
2. Match frame names and annotations against the ticket summary and acceptance criteria (e.g., a ticket about "empty state for model list" should match a frame named "Model List / Empty" or similar)
3. If a clear match is found, call `get_design_context` again with the scoped node's ID to get more specific design data
4. If multiple frames match (e.g., the ticket covers a flow with several states), call `get_design_context` for each relevant frame and consolidate findings in the report

### Step 3: Fetch Figma Design Context

Parse the resolved Figma URL (user-provided or discovered in Step 2c) to extract `fileKey` and `nodeId`:

- `figma.com/design/:fileKey/:fileName?node-id=:nodeId` — convert `-` to `:` in nodeId
- `figma.com/design/:fileKey/branch/:branchKey/:fileName?node-id=:nodeId` — use branchKey as fileKey; if `node-id` is present, convert `-` to `:` to produce nodeId (same normalization as the non-branch pattern)

Fetch design data and a screenshot from the Figma MCP:

1. **`get_design_context`** — returns reference code, component structure, Code Connect mappings, design tokens, and annotations. Pass `clientLanguages: "typescript"` and `clientFrameworks: "react"`.
2. **`get_screenshot`** — capture a screenshot of the resolved node for inclusion in the report.

From the `get_design_context` response, extract:

- **Component hierarchy** — the tree of Figma components and their nesting
- **Code Connect snippets** — if Code Connect is configured, the mapped codebase components
- **Design tokens** — colors, spacing, typography, border radius referenced in the design
- **Layout structure** — auto-layout direction, padding, gap, alignment
- **Annotations** — any designer notes, constraints, or instructions
- **Asset references** — icons, images, or illustrations used

### Step 4: Fetch Code Changes

**If a PR was resolved and the GitHub MCP is available:**

1. Call `pull_request_read({ method: "get", owner, repo, pullNumber })` to get PR metadata (title, body, state, draft status)
2. Call `pull_request_read({ method: "get_files", owner, repo, pullNumber })` to get the list of changed files (paginate if needed)
3. Call `pull_request_read({ method: "get_diff", owner, repo, pullNumber })` to get the full diff

If the PR is in **draft** state, note this in the report header. Use `[NOT_IMPLEMENTED]` for checks that target code not yet written.

**If a PR was resolved but the GitHub MCP is unavailable**, or **if evaluating local branch changes (no PR):**

1. Use `git diff main...HEAD` as the diff
2. Use `git diff --name-only main...HEAD` to get the list of changed files
3. Read key changed files from the local workspace

### Step 5: Read Relevant Source Files

From the changed files list, identify UI-related files (`.tsx`, `.jsx`, `.scss`, `.css`) and read them in full using the Read tool. These files are needed for the conformance checks in Phase 3.

Also read any existing component files that the design's Code Connect snippets reference, even if they are not in the diff — they provide baseline context for how the design system is used.

## Phase 3: Evaluate Design Conformance

Analyze the code changes against the Figma design context across the following dimensions. Each dimension produces one or more findings.

**Before running these checks**, invoke the **style-review** skill on the same changed files. The style-review skill checks PF priority order, wrapper component usage, token compliance, and class naming conventions. Its findings feed into Dimensions 2–4 below — do not duplicate those checks here. Include a summary of style-review findings in the report's Recommendations section.

### Dimension 1: Component Mapping

Compare the Figma component hierarchy against the React component tree in the code.

- Do the top-level Figma components correspond to React components in the implementation?
- If Code Connect mappings exist, are the mapped components actually used in the code?
- Are there Figma components that have no corresponding code (missing implementation)?
- Are there coded components that don't appear in the Figma design (extra implementation)?

### Dimension 2: Layout & Spacing

Compare the Figma auto-layout properties against the code's layout approach.

- **Direction** — does Figma's horizontal/vertical auto-layout match the code's flex direction or PF layout components (`Stack`, `Split`, `Flex`, `Grid`)?
- **Alignment** — does the Figma alignment (top-left, center, space-between, etc.) match the code's `alignItems`/`justifyContent` or PF alignment props?
- **Sizing** — does the Figma sizing (fixed, hug, fill) match the code's width/height behavior?
- **Responsive behavior** — if the Figma design shows multiple breakpoints or responsive variants, note them as `[LIMITED]` since verifying responsive behavior requires runtime evaluation

> **PF token compliance** (hardcoded gap/padding values, missing PF spacer tokens) is checked by the **style-review** skill. This dimension focuses on whether the layout *structure* matches the Figma design — not whether the code uses the right tokens.

### Dimension 3: Typography

Compare the Figma text styles against the code's typography.

- Are Figma text nodes using the correct PF text components (`Content`, `Title`, `Text`) or heading levels?
- Do heading levels and text hierarchy match the Figma design's visual hierarchy?

> **PF token compliance** (hardcoded font sizes/weights, missing typography tokens) is checked by the **style-review** skill. This dimension focuses on whether the *text structure and hierarchy* match the Figma design.

### Dimension 4: Color & Theming

Compare the Figma color usage against the code's color references.

- Does the implementation use the correct semantic color roles (e.g., status colors, link colors, background roles) as shown in the Figma design?
- Does the implementation account for dark/light theme if the Figma file shows both variants?

> **PF token compliance** (hardcoded hex/rgb values, missing color tokens) is checked by the **style-review** skill. This dimension focuses on whether the *color intent* matches the Figma design.

### Dimension 5: Interactive States

If the Figma design includes multiple states (hover, disabled, active, error, empty), check:

- Does the code handle the states shown in the design?
- Are conditional styles/classes applied for each state?
- Are empty states, loading states, or error states present in both design and code?

### Dimension 6: Content & Copy

Compare text content between the Figma design and the code.

- Do headings, labels, button text, and placeholder text match?
- Are there discrepancies in wording, capitalization, or punctuation?
- If the design uses placeholder/example data, does the code use similar realistic examples?

### Verdict Definitions

| Verdict | Symbol | Meaning |
|---|---|---|
| **Matches** | `[MATCH]` | The code faithfully implements this aspect of the design |
| **Partial Match** | `[PARTIAL]` | Some aspects match but gaps or deviations exist |
| **Mismatch** | `[MISMATCH]` | The code diverges from the design in a meaningful way |
| **Cannot Evaluate** | `[LIMITED]` | Cannot determine conformance from static analysis alone (e.g., animation, responsive behavior, interaction timing) |
| **Not Yet Implemented** | `[NOT_IMPLEMENTED]` | PR is in draft state or the check targets code that is not yet written |
| **Not Applicable** | `[NOT_APPLICABLE]` | This dimension is not relevant to the current change set |

### Evidence Requirements

Every verdict must cite specific evidence:

- **MATCH**: reference the Figma property and the corresponding code that implements it
- **PARTIAL**: reference what matches and explicitly state what deviates
- **MISMATCH**: reference the Figma expectation and the code that contradicts it
- **LIMITED**: explain why static analysis is insufficient for this check
- **NOT_IMPLEMENTED**: note the draft PR state or cite the missing code area
- **NOT_APPLICABLE**: explain why this dimension does not apply to the change set

## Phase 4: Generate Report

Present the report in this format:

```markdown
## Figma Design Conformance Review

**Figma Design:** [{design name or node path}]({figma url})
**PR:** [#{number}]({url}) — {title}
**Jira:** [{issue key}]({jira url}) — {summary} _(omit if no ticket found)_
**Status:** {N}/{total} dimensions fully matching

### Screenshot

{Include the Figma screenshot captured in Step 3 for visual reference}

### Conformance Summary

| # | Dimension | Verdict | Key Findings |
|---|-----------|---------|--------------|
| 1 | Component Mapping | {verdict} | {brief summary} |
| 2 | Layout & Spacing | {verdict} | {brief summary} |
| 3 | Typography | {verdict} | {brief summary} |
| 4 | Color & Theming | {verdict} | {brief summary} |
| 5 | Interactive States | {verdict} | {brief summary} |
| 6 | Content & Copy | {verdict} | {brief summary} |

### Detailed Findings

#### 1. Component Mapping

**Verdict:** {MATCH|PARTIAL|MISMATCH|LIMITED|NOT_IMPLEMENTED|NOT_APPLICABLE}

{Detailed analysis with specific Figma component names mapped to code component references.}

**Figma components:**
- {Component name} → `{CodeComponent}` in `{file path}` — {status}
- ...

#### 2. Layout & Spacing

**Verdict:** {MATCH|PARTIAL|MISMATCH|LIMITED|NOT_IMPLEMENTED|NOT_APPLICABLE}

{Detailed analysis comparing Figma auto-layout to code layout approach.}

| Figma Property | Figma Value | Code Equivalent | Status |
|---|---|---|---|
| Direction | Vertical | `<Stack>` | MATCH |
| Gap | 16px | `--pf-t--global--spacer--md` | MATCH |
| Padding | 24px | hardcoded `24px` | MISMATCH — use `--pf-t--global--spacer--lg` |

#### 3. Typography

**Verdict:** {MATCH|PARTIAL|MISMATCH|LIMITED|NOT_IMPLEMENTED|NOT_APPLICABLE}

{Detailed analysis of text style conformance.}

#### 4. Color & Theming

**Verdict:** {MATCH|PARTIAL|MISMATCH|LIMITED|NOT_IMPLEMENTED|NOT_APPLICABLE}

{Detailed analysis of color token usage and theme support.}

#### 5. Interactive States

**Verdict:** {MATCH|PARTIAL|MISMATCH|LIMITED|NOT_IMPLEMENTED|NOT_APPLICABLE}

{Analysis of which states from the design are implemented.}

#### 6. Content & Copy

**Verdict:** {MATCH|PARTIAL|MISMATCH|LIMITED|NOT_IMPLEMENTED|NOT_APPLICABLE}

{Text content comparison.}

### Recommendations

{Prioritized list of changes needed to improve design conformance, grouped by severity:}

#### Must Fix
- {Critical mismatches that break design intent}

#### Should Fix
- {Deviations from design tokens or spacing system}

#### Consider
- {Minor copy differences, optional enhancements}

### Overall Assessment

{1-2 paragraph summary: how well does the implementation match the design? Is it ready for design review, or are there significant gaps? Highlight the strongest and weakest dimensions.}
```

### Report Rules

- The Figma URL is always a clickable link
- Jira issue keys are clickable links: `[RHOAIENG-12345](https://redhat.atlassian.net/browse/RHOAIENG-12345)`. Omit the Jira line from the header if no ticket was found.
- PR references are clickable links when a PR exists: `[#4567](https://github.com/opendatahub-io/odh-dashboard/pull/4567)`. When evaluating local branch changes, show the branch name instead.
- File references use backtick-wrapped paths: `` `frontend/src/pages/Foo.tsx` ``
- Code citations use the repository's standard fenced code block format with a `startLine:endLine:filepath` header
- The summary table appears first for quick scanning; detailed sections follow
- Include the Figma screenshot in the report for visual reference
- When a dimension has no applicable findings (e.g., no text changes for Content & Copy), use `[NOT_APPLICABLE]` with a note explaining it is not relevant to this change set

## Out of Scope

- **Runtime visual comparison** — no Playwright, Puppeteer, or browser automation to capture screenshots of the running application
- **Pixel-perfect overlay diffing** — the skill does not overlay Figma screenshots on application screenshots
- **Automated code fixes** — the skill reports findings but does not modify source code
