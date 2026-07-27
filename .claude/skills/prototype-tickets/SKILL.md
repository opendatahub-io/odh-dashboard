---
name: prototype-tickets
description: Read a RHOAI UX prototype fork and create a Jira epic with properly scoped child tickets. Deduplicates against existing tickets and switches to review mode when full coverage exists.
---

# /prototype-tickets

Reads a designer's fork diff, identifies features and interactive flows, generates acceptance criteria from prototype scenarios, previews for approval, then creates tickets in Jira. Tickets are designed to be consumed by `/prototype-spec --ticket <key>`.

## Arguments

```text
/prototype-tickets <url> --fork <ssh-url> [--project RHOAIENG] [--parent RHAISTRAT-XXXXX | RHOAIENG-XXXXX] [--base 3.5]
```

- `<url>` — deployed prototype URL
- `--fork <ssh-url>` — designer's forked repo SSH clone URL
- `--project <key>` — Jira project key (default: `RHOAIENG`)
- `--parent <key>` — parent ticket for context:
  - **Epic** → link children under it (no new Epic)
  - **RHAISTRAT-\* or other** → read for context, create new Epic
  - **Omitted** → create new Epic
- `--base <branch>` — (optional) upstream branch to diff against (e.g., `3.5`). If omitted, auto-detected via merge-base distance. See Procedure 2 in `.claude/rules/prototype-fork-ops.md`.

## Prerequisites

See **Prerequisites** in `.claude/rules/prototype-fork-ops.md`.

## Step 0: Validate arguments

Parse: URL (`http`), `--fork`, `--project` (default `RHOAIENG`), `--parent`, `--base`. Order doesn't matter.

- No URL → stop: "Prototype URL required."
- No `--fork` → stop: "Fork URL required."

## Steps 1-2: Read parent ticket + clone fork (parallel)

### Step 1: Read parent ticket (if --parent)

Read with `getJiraIssue`. Determine type:
- **Epic** → link children under it. Read existing children for dedup:
  ```
  searchJiraIssuesUsingJql(cloudId: "redhat.atlassian.net", jql: "\"Epic Link\" = <parent-key> ORDER BY key ASC")
  ```
- **RHAISTRAT-\* or non-Epic** → read for context. New Epic in Step 8.
- **No --parent** → skip. New Epic in Step 8.

Handle errors per `.claude/rules/prototype-fork-ops.md`.

### Step 2: Clone or update the fork

Follow **Procedure 1** in `.claude/rules/prototype-fork-ops.md`.

## Step 3: Identify design scope

Capture commit SHA: `git -C "$FORK_DIR" rev-parse --short HEAD`

Follow **Procedures 2 and 3** in `.claude/rules/prototype-fork-ops.md`. Unlike `/prototype-spec`, do NOT scope to one area — get ALL changed files.

**CLI fast scan:** Run **Procedure 4** in background. Use results to pre-populate feature areas and prioritize TSX reading.

Group files by feature area via URL-to-directory mapping. Note all areas with changes.

## Step 4: Read TSX source

**Use the Read tool — not cat, grep, sed.** Read each file fully.

No TSX files → ask: "Styling or data-only update. Create tickets, or different branch?"

For each file, extract:
1. Route definitions
2. Component hierarchy
3. Interactive units — forms, tables, modals, drawers, wizards, dropdowns
4. Scenarios/state management — any mechanism for showing different states
5. Form validation rules
6. Mock data shapes
7. State management — hooks, context
8. Dependencies between components

Prioritize: new files → route/page components → modal/form components → shared imports.

## Step 5: Split into ticket proposals

**Read `splitting.md` for the splitting heuristic, AC generation, and ticket format.**

## Step 6: Dedup against existing tickets

### Re-run protection + Epic discovery

Search for existing tickets referencing this prototype URL:

```text
searchJiraIssuesUsingJql(cloudId: "redhat.atlassian.net", jql: "project = <project> AND text ~ \"<prototype-url>\" AND statusCategory != Done ORDER BY key ASC")
```

**Epic(s) found:**
- **Filter to same project** — ignore Epics from other projects.
- **One Epic** → promote to target Epic (prevents duplicate Epics).
- **Multiple Epics** → list them, ask which to use.
- Read children for sibling dedup.
- Tell user: "Found existing Epic `[KEY]`. New tickets will be linked under it."

**Non-Epic tickets found, no Epic:**
- List them, ask: "Skip duplicates, or create anyway?"

### Sibling dedup

If an Epic has existing children:
1. Compare each proposed ticket against existing children
2. **Exact match** → skip: "Already exists as `[KEY]`"
3. **Partial overlap** → flag: "Overlaps with `[KEY]`. Create anyway?"
4. **No match** → include
5. **ALL match** → switch to **review mode**: read `review-mode.md` for Step 6b

## Step 7: Preview (MANDATORY)

**Never create tickets without explicit user approval.**

Present the full breakdown: prototype URL, fork, project, parent, changed files count. Then for each ticket: type, summary, priority, labels, depends on, full description with ACs.

Show skipped/overlapping tickets if dedup found matches.

> **Review the breakdown above.** You can:
> - **"create all"** / **"create all except 3, 5"** / **"merge 2 and 3"** / **"split 4"**
> - Edit any summary, AC, priority, or type
> - **"cancel"** to abort

Do not proceed until explicitly approved. Revise and re-present on feedback.

## Step 8: Create tickets in Jira

### Safety cap

**>15 tickets** → pause and confirm before proceeding.

### 8a: Create Epic (if needed)

Only if no existing Epic from `--parent` AND none discovered in Step 6. **If Epic creation fails, stop entirely** — no orphaned children.

```text
createJiraIssue(cloudId: "redhat.atlassian.net", projectKey: "<project>",
  issueTypeName: "Epic", summary: "...", description: "...", contentFormat: "markdown",
  components: "AI Core Dashboard",
  additional_fields: { "customfield_10001": "ec74d716-af36-4b3c-950f-f79213d08f71-1809",
    "priority": {"name": "Major"} })
```

### 8b: Create child tickets

One by one, in dependency order. Track successful creates for Step 8c.

**Stories:** Epic Link `customfield_12311140`, team `customfield_10001`, labels `["enhancement"]`.

**Tasks:** Same fields, labels `["tech-debt"]`.

On failure: report error.
If the failed ticket is a prerequisite for later tickets, stop and re-preview before continuing.

### 8c: Create dependency links

**Only link successfully created tickets.** Skip links where either ticket failed.

```text
createIssueLink(cloudId: "redhat.atlassian.net", type: "Blocks",
  inwardIssue: "<blocker>", outwardIssue: "<blocked>")
```
Link failures are non-critical — report and continue.

### 8d: Output summary

```text
| # | Key | Type | Summary | Depends on |
| 0 | RHOAIENG-XXXXX | Epic | [title] | — |
| 1 | RHOAIENG-XXXXX | Task | [summary] | — |
| 2 | RHOAIENG-XXXXX | Story | [summary] | #1 |

Next step: /prototype-spec <url> --fork <ssh> --ticket RHOAIENG-XXXXX
```
