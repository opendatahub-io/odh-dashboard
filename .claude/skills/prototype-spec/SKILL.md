---
name: prototype-spec
description: Read a RHOAI UX prototype and produce scoped implementation instructions. Ticket mode (--ticket) for one spec, epic mode (--epic) for all specs + phased execution plan with parallel agent briefings.
---

# /prototype-spec

Two modes: **ticket mode** (one ticket → one spec) and **epic mode** (one epic → all specs + execution plan).

## Arguments

```text
/prototype-spec <url> --fork <ssh-url> --ticket RHOAIENG-12345 [--base 3.5]
/prototype-spec <url> --fork <ssh-url> --epic RHOAIENG-XXXXX [--base 3.5]
```

- `<url>` — deployed prototype URL
- `--fork <ssh-url>` — designer's forked repo SSH clone URL
- `--ticket <key-or-url>` — RHOAIENG Story or Task. Accepts bare key (`RHOAIENG-12345`) or full URL (`https://redhat.atlassian.net/browse/RHOAIENG-12345`). One spec.
- `--epic <key-or-url>` — RHOAIENG Epic. Same formats as `--ticket`. All specs + execution plan. Mutually exclusive with `--ticket`.
- `--base <branch>` — (optional) upstream branch to diff against (e.g., `3.5`). If omitted, auto-detected via merge-base distance. Use when the upstream default branch has moved since the designer forked.

## Prerequisites

See **Prerequisites** in `.claude/rules/prototype-fork-ops.md`. Additionally:
- **prototype-reader CLI** (optional, for DOM extraction) — auto-cloned from GitLab on first run, falls back to fork-only analysis.
- **PatternFly MCP server** (optional, for live PF v6 validation) — setup: `"patternfly-docs": { "command": "npx", "args": ["-y", "@patternfly/patternfly-mcp@latest"] }`. Requires Node.js 22+.

**Note:** This skill targets **PatternFly v6** prototypes (RHOAI/ODH mode). For Material UI prototypes (Kubeflow mode), skip PF-specific guidance — TSX reading and ticket scoping still work.

## Step 0: Validate arguments

Parse: URL (starts with `http`), `--fork`, `--ticket`, `--epic`, `--base`. Order doesn't matter.

- Both `--ticket` and `--epic` → stop: "Use one or the other."
- No URL → stop: "Prototype URL required."
- No `--fork` → stop: "Fork URL required."
- Neither `--ticket` nor `--epic` → stop: "Ticket or Epic key required."

If `--ticket` or `--epic` is a full URL, extract the key: `https://redhat.atlassian.net/browse/RHOAIENG-12345` → `RHOAIENG-12345`.

Validate URL format per `.claude/rules/prototype-fork-ops.md`. Determine mode: ticket or epic.

## Steps 1-2: Read Jira context + clone fork (parallel)

Run simultaneously.

### Step 1: Read Jira context

**Ticket mode:** Read the ticket with `getJiraIssue`. If it's an Epic → stop: "Use `--epic` instead." Extract summary, description, ACs, type, linked tickets.

**Discover parent Epic and siblings:** The `parent` field in the Jira response contains the Epic (if linked). Extract the Epic key, then find siblings:
```text
searchJiraIssuesUsingJql(cloudId: "redhat.atlassian.net", jql: "\"Epic Link\" = <parent-epic-key> AND statusCategory != Done ORDER BY key ASC")
```
If no `parent` field, check `customfield_12311140` (Epic Link). If no Epic → skip sibling discovery.

**Epic mode:** Read the Epic, then ALL active children:
```text
searchJiraIssuesUsingJql(cloudId: "redhat.atlassian.net", jql: "\"Epic Link\" = <epic-key> AND statusCategory != Done ORDER BY key ASC")
```
Zero children → stop: "Create tickets first with `/prototype-tickets`."

Handle Jira errors per `.claude/rules/prototype-fork-ops.md`.

### Step 2: Clone or update the fork

Follow **Procedure 1** in `.claude/rules/prototype-fork-ops.md`.

## Step 3: Identify design scope

Follow **Procedures 2 and 3** in `.claude/rules/prototype-fork-ops.md`.

- **Ticket mode**: always filter changed files to the URL area. Broad diffs waste context on irrelevant sections.
- **Epic mode**: do NOT filter — group all files by area, read areas matching ticket scope.

Map URL to feature area via the URL-to-directory mapping. Unmatched paths → "Shared/Other."

**CLI fast scan:** Run **Procedure 4** in background alongside Step 4. Use results to prioritize TSX reading and pre-seed scenarios.

**Cached context:** If fork TSX was already read in this conversation, reuse it: "Fork TSX already analyzed — reusing cached analysis."

## Step 4: Read TSX source + DOM extraction (parallel)

### Step 4a: Read TSX source

**Prefer the Read tool** for TSX files. Use `offset` and `limit` for large files. If a code-discovery hook blocks Read on fork files (they're external to the project), fall back to Bash `cat` — fork files in `~/.cache/` are not project code.

No TSX in diff → ask: "Styling or data-only update. Produce spec from CSS/JSON, or different branch?"

Prioritize: new files → URL-matching files → shared imports. For each file, extract:

1. **New PF component imports** — including `@patternfly/react-templates` (CheckboxSelect, MultiTypeaheadSelect)
2. **Scenario/state management** — any mechanism: dropdowns, tabs, URL params, feature flags, conditional renders, state variables, comments
3. **Conditional renders** — all branches
4. **Form validation** — rules, error messages, required fields
5. **Interactive flows** — modals, drawers, wizards
6. **Mock data shapes** — API contracts
7. **Responsive props** — breakpoint-aware props

### PF component reference extraction

Extract **exact JSX snippets** for each major UI element in scope. Capture: component hierarchy, exact props, layout props, text content, icon names.

**Discover wrappers dynamically** — scan `frontend/src/components/`, `components/table/`, `components/pf-overrides/`, `concepts/dashboard/`, `pages/projects/components/` for PF wrappers. Read each to understand what it wraps.

### Step 4b: DOM extraction

Run CLI in background. Falls back gracefully if unavailable. See **Procedure 4** in `.claude/rules/prototype-fork-ops.md`.

## Step 5: Scope to tickets

**Ticket mode:** scope to ONE ticket. **Epic mode:** scope EACH ticket (skip per-ticket checkpoints — scope matrix in Step 7b is the combined checkpoint). Zero-scenario tickets → "ACs-only spec."

### Scoping rules

1. Read ACs word by word — IN scope only if ACs explicitly describe it
2. OUT of scope if it belongs to a sibling ticket — even if same prototype section
3. Ambiguous → list and ask developer to confirm
4. Err on excluding — better to build less than overreach

**Rendering ownership test:** If a component is introduced by a different ticket, the scenario belongs to that ticket.

**Prerequisite gate test:** If the user can't reach this ticket's UI without another ticket's work, that scenario belongs to the prerequisite.

**Mandatory checkpoint (ticket mode):** Present IN/OUT/AMBIGUOUS scope and ask "Does this look right?" Skip only for clear, unambiguous ACs with no sibling overlap.

## Step 6: Find patterns + review design

**Read `pattern-search.md` for full Step 6 details** — target context detection (host vs federated package), pattern search directories, backend location guidance, PF MCP validation, and manual design review checks.

For comprehensive pattern searches spanning multiple directories, spawning an **Explore agent** in background is acceptable — it parallelizes file discovery while you continue with other steps.

## Step 7: Produce scoped implementation spec

Output a BUILD guide, not a design document. Keep each section scannable.

**Summary table:** Ticket, fork, upstream base, files to create/modify, scenarios, PF patterns, data layer readiness.

**Ticket Scope:** What to implement (2-3 sentences) + OUT OF SCOPE list with ticket keys.

**Related Tickets:** Linked issues from Jira.

**Design Reference:** 3-7 exact JSX snippets from the prototype. Note odh-dashboard wrapper equivalents, props to preserve, props to change. Show REAL JSX — not templates.

**New Feature Patterns:** What it does, how to build it (existing pattern to follow), data shape.

**Scenarios:** Trigger, UI behavior, implementation approach.

**Files to Create or Modify:** Map to odh-dashboard locations (pages, concepts, api, hooks).

**Implementation Warnings:** Wrong PF usage, convention conflicts, inline styles, deprecated components. Always flag PF token mismatches — prototypes use `--pf-v6-global--*` while odh-dashboard uses semantic tokens (`--pf-t--global--*`).

**Questions for Designer:** 3-7 specific ambiguities. Mark blocking ones with **[BLOCKING]**.

**Testing Guidance:** Key test cases, unit test location (`testHook` from jest-config), Cypress mock test location (25 areas), Cypress utils (70+), shared mock factories.

**Ready to Implement (ticket mode):** "implement this", "implement only [feature]", ask questions, re-run.

## Epic Mode

**Read `epic-mode.md` for Steps 7b through 9** — scope matrix, dependency analysis, briefing packages, execution plan, phase handoff rules.
