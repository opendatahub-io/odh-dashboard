---
name: figma-eval-review
description: Evaluates code changes in a PR against a Figma design to assess visual conformance. Given a Figma URL, analyzes the code diff and reports how well the implementation matches the intended design. Static analysis only — no browser automation. Use when asked to compare a PR or branch against a Figma design, verify design fidelity, or review implementation conformance.
---

# Figma Evaluation Review

Evaluates code changes against a Figma design to produce a structured design-conformance report. Uses the Figma MCP to extract design context (component structure, tokens, layout, screenshot) and the GitHub MCP to fetch the PR diff, then statically analyzes how well the code matches the intended design.

This skill is invoked on-demand for a single Figma-design + PR pair.

## Inputs

The user provides:

- **Figma URL** (required) — e.g., `https://figma.com/design/ABC123/MyFile?node-id=1-2`
- **PR number or URL** (optional) — e.g., `#4567` or `https://github.com/opendatahub-io/odh-dashboard/pull/4567`. If omitted, the skill auto-detects from the current git branch.
- **Repository** (optional) — defaults to `opendatahub-io/odh-dashboard`

## Phase 1: Verify Prerequisites

Check that all required MCP servers are available before proceeding.

### Required MCPs

| MCP | Purpose | How to verify |
|---|---|---|
| **Figma** (`plugin-figma-figma`) | Fetch design context, screenshot, node metadata, and component structure | Call `get_design_context` or `get_screenshot` with the provided Figma URL params. Also uses `get_metadata` to enumerate child nodes when scoping by Jira ticket. |
| **GitHub** (`user-github`) | Fetch PR diff and changed files | Call `get_me` to verify connectivity |

### Optional MCPs

| MCP | Purpose | How to verify |
|---|---|---|
| **Atlassian** (`user-atlassian`) | Fetch Jira ticket objectives to scope which Figma nodes are relevant | Call `jira_get_issue` with a test key |

The Atlassian MCP is optional. If unavailable, the skill skips Jira-based scoping and evaluates the Figma URL as provided.

### Verification procedure

1. Parse the Figma URL to extract `fileKey` and `nodeId`:
   - `figma.com/design/:fileKey/:fileName?node-id=:nodeId` — convert `-` to `:` in nodeId
   - `figma.com/design/:fileKey/branch/:branchKey/:fileName?node-id=:nodeId` — use branchKey as fileKey; if `node-id` is present, convert `-` to `:` to produce nodeId (same normalization as the non-branch pattern)
2. Attempt to call `get_screenshot` for the extracted fileKey and nodeId
3. If the call fails, stop and report:
   > **Figma MCP is not available or not authenticated.** This skill requires the Figma MCP (`plugin-figma-figma`) to fetch design context. Please set up the Figma MCP server by following the [Figma MCP setup guide](https://help.figma.com/hc/en-us/articles/35281350665623-Figma-MCP-collection-How-to-set-up-the-Figma-remote-MCP-server-preferred) and try again.
4. Attempt a lightweight GitHub call (`get_me`) to verify the GitHub MCP is reachable
5. If it fails, stop and report:
   > GitHub MCP is not available or not authenticated. This skill requires the GitHub MCP to fetch PR diffs. Please configure and authenticate the `user-github` MCP server.
6. Attempt a reachability check for the Atlassian MCP: call `jira_get_issue` with the dummy key `NONEXISTENT-0`. Any HTTP response (including 404 "issue not found" or real issue data) means the MCP is reachable — record it as available. Only treat network errors, timeouts, or MCP request failures as unavailable. This is purely a connectivity check; discard any returned data. This check must not fail the overall flow if the MCP is unreachable.

If the required MCPs succeed, proceed. The screenshot captured in step 2 is carried forward to Phase 2 and Phase 4 — do not call `get_screenshot` again.

## Phase 2: Gather Context

### Step 1: Fetch Figma Design Context

Using the fileKey and nodeId extracted in Phase 1, fetch design data from the Figma MCP:

1. **`get_design_context`** — returns reference code, component structure, Code Connect mappings, design tokens, and annotations. Pass `clientLanguages: "typescript"` and `clientFrameworks: "react"`.

The screenshot captured during the Phase 1 prerequisite check (step 2) is reused here — do not call `get_screenshot` again.

From the `get_design_context` response, extract:

- **Component hierarchy** — the tree of Figma components and their nesting
- **Code Connect snippets** — if Code Connect is configured, the mapped codebase components
- **Design tokens** — colors, spacing, typography, border radius referenced in the design
- **Layout structure** — auto-layout direction, padding, gap, alignment
- **Annotations** — any designer notes, constraints, or instructions
- **Asset references** — icons, images, or illustrations used

### Step 2: Find the PR

Resolve the PR to evaluate. Auto-detection from the current branch is the default when no PR number or URL is provided.

1. **User provided a PR number or URL** — use it directly
2. **Auto-detect from current branch** (default) — run `git branch --show-current` to get the branch name, then use the GitHub MCP's `search_pull_requests` (query: `repo:{owner}/{repo} head:{branch} is:open`) to find an open PR for that branch.
   - **If on `main`:** stop and report the following — do not fall back to `git diff` since `main...HEAD` produces no diff on main:
     > Cannot auto-detect PR from the `main` branch. Check out the feature branch or provide a PR number.
   - **If on a feature branch with an open PR:** use that PR
   - **If on a feature branch with no open PR:** fall back to `git diff main...HEAD` to capture committed changes on the feature branch relative to main. If the diff is empty (no committed changes ahead of main), stop and report: "No changes to evaluate — the branch has no commits ahead of main." Otherwise, report that no PR was found and the evaluation is based on the local branch diff.

### Step 3: Extract Jira Ticket Objectives (if available)

If the Atlassian MCP is available (verified in Phase 1), attempt to extract a Jira ticket from the PR to understand what the code change is trying to accomplish. This context is used to:

- **Scope which Figma design nodes are relevant** when the Figma file contains multiple screens, states, or variants
- **Prioritize evaluation dimensions** based on what the ticket describes (e.g., a ticket about "add empty state" focuses Dimension 5)
- **Provide ticket context in the report** so readers understand the intent behind the change

#### 3a. Find a Jira key

Search for a Jira issue key (pattern: `[A-Z][A-Z0-9]+-\d+`, e.g., `RHOAIENG-12345`) in these sources, in order:

1. **PR title** — often prefixed with the ticket key
2. **PR body** — may contain a Jira link or key in a "References" or "Related" section
3. **Branch name** — commonly formatted as `RHOAIENG-12345-description` or `feature/RHOAIENG-12345`
4. **Commit messages** — check the commits in the PR for ticket keys

If no key is found, skip to Step 4 — Jira scoping is best-effort.

#### 3b. Fetch ticket details

Call `jira_get_issue` with the extracted key and `fields=summary,description,status,issuetype,labels`. Extract:

- **Summary** — the one-line objective
- **Description** — full context including requirements and any Figma URLs or node references embedded in the ticket
- **Acceptance criteria** — search the description for a section titled "Acceptance Criteria", "Requirements", or "Definition of Done" and extract each criterion as a discrete item. If not found in the description, check the issue's fields map for a field whose name or display name matches "Acceptance Criteria" (this is typically a custom field whose ID varies by Jira instance) and extract its value.

#### 3c. Use ticket objectives to scope the Figma evaluation

If the Figma URL provided by the user points to a **page or top-level frame** (rather than a specific component node), use the ticket objectives to narrow focus:

1. Call `get_metadata` for the Figma page to get the structure of all child frames/nodes
2. Match frame names and annotations against the ticket summary and acceptance criteria (e.g., a ticket about "empty state for model list" should match a frame named "Model List / Empty" or similar)
3. If a clear match is found, call `get_design_context` again with the scoped node's ID to get more specific design data (replacing the broader result from Step 1)
4. If multiple frames match (e.g., the ticket covers a flow with several states), call `get_design_context` for each relevant frame and consolidate findings in the report

If no Jira key was found or the Atlassian MCP is unavailable, evaluate the Figma node exactly as provided by the user.

### Step 4: Fetch Code Changes

**If a PR was resolved:**

1. Call `pull_request_read({ method: "get", owner, repo, pullNumber })` to get PR metadata (title, body, state, draft status)
2. Call `pull_request_read({ method: "get_files", owner, repo, pullNumber })` to get the list of changed files (paginate if needed)
3. Call `pull_request_read({ method: "get_diff", owner, repo, pullNumber })` to get the full diff

If the PR is in **draft** state, note this in the report header. Use `[NOT_IMPLEMENTED]` for checks that target code not yet written.

**If evaluating local branch changes (no PR):**

1. Use `git diff main...HEAD` as the diff
2. Use `git diff --name-only main...HEAD` to get the list of changed files
3. Read key changed files from the local workspace

### Step 5: Read Relevant Source Files

From the changed files list, identify UI-related files (`.tsx`, `.jsx`, `.scss`, `.css`) and read them in full using the Read tool. These files are needed for the conformance checks in Phase 3.

Also read any existing component files that the design's Code Connect snippets reference, even if they are not in the diff — they provide baseline context for how the design system is used.

## Phase 3: Evaluate Design Conformance

Analyze the code changes against the Figma design context across the following dimensions. Each dimension produces one or more findings.

### Dimension 1: Component Mapping

Compare the Figma component hierarchy against the React component tree in the code.

- Do the top-level Figma components correspond to React components in the implementation?
- If Code Connect mappings exist, are the mapped components actually used in the code?
- Are there Figma components that have no corresponding code (missing implementation)?
- Are there coded components that don't appear in the Figma design (extra implementation)?

### Dimension 2: Layout & Spacing

Compare the Figma auto-layout properties against the code's layout approach.

- **Direction** — does Figma's horizontal/vertical auto-layout match the code's flex direction or PF layout components (`Stack`, `Split`, `Flex`, `Grid`)?
- **Gap & Padding** — do the Figma spacing values map to PatternFly spacing tokens (`--pf-t--global--spacer--*`) or PF component props (`gap`, `hasGutter`)?
- **Alignment** — does the Figma alignment (top-left, center, space-between, etc.) match the code's `alignItems`/`justifyContent` or PF alignment props?
- **Sizing** — does the Figma sizing (fixed, hug, fill) match the code's width/height behavior?
- **Responsive behavior** — if the Figma design shows multiple breakpoints or responsive variants, note them as `[LIMITED]` since verifying responsive behavior requires runtime evaluation

### Dimension 3: Typography

Compare the Figma text styles against the code's typography.

- Are Figma text nodes using the correct PF text components (`Content`, `Title`, `Text`) or heading levels?
- Do font sizes, weights, and line heights correspond to PF typography tokens?
- Are there hardcoded font values in the code where PF tokens should be used?

### Dimension 4: Color & Theming

Compare the Figma color usage against the code's color references.

- Are Figma fill/stroke colors mapped to PF color tokens (`--pf-t--global--color--*`, `--pf-t--global--background--color--*`)?
- Are there hardcoded hex/rgb values in the code where PF tokens exist?
- Does the implementation account for dark/light theme if the Figma file shows both variants?

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

{Include the Figma screenshot captured in Phase 1 for visual reference}

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
