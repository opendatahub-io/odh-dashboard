---
name: jira-triage
description: Fetch Jira issues by filter criteria, define structured triage operations, and bulk-apply them. Full Triage mode orchestrates all analysis skills on New issues end-to-end.
---

# Jira Triage Infrastructure

Composable infrastructure for Jira triage automation. Provides three capabilities -- **Fetch**, **Apply**, and **Full Triage** -- connected by a standard operations format. Analysis logic lives in separate skills; Full Triage orchestrates them end-to-end.

**Before any Fetch, Apply, or Full Triage operation, read [`persona.md`](persona.md) and [`jira-project-reference.md`](jira-project-reference.md).** The persona defines the execution protocol (thoroughness, verification, no assumptions). The project reference provides all Jira-specific values (project key, component, field IDs, labels, scrum-to-area mapping). This skill contains no hardcoded Jira values.

> **Fresh Start Rule:** Every invocation starts from scratch with fresh Jira queries and fresh analysis. Do **not** read, scan, or reference previous operation files in `.artifacts/triage/` unless the user explicitly provides a file path to apply or resume. See `persona.md` § Fresh Start for the full rule.

## Architecture

```text
User
 │
 ├─── Fetch ───────────── return issue set (in-session)
 │
 ├─── Apply ───────────── validate, dry-run, execute
 │
 └─── Full Triage ─────── orchestrate analysis pipeline for New issues
         │
    ┌────┴────┐
    │  Fetch  │  Query New issues (lightweight: no descriptions)
    └────┬────┘
         │ issue keys + summaries (small context footprint)
    ┌────┴──────────────────────────────────────────┐
    │  Per-Issue Loop                                │
    │  (one issue at a time, write results to disk)  │
    │                                                │
    │  0. Fetch full issue details (description etc) │
    │                                                │
    │  a. Team Gate                                  │
    │     Dashboard-owned? → assign team, continue   │
    │     Another team / not ours? → STOP (skip)     │
    │                                                │
    │  b. Analysis Pipeline                          │
    │     1. validate-issue-type                     │
    │     2. validate-description                    │
    │     3. validate-priority-severity              │
    │     4. evaluate-blockers (Tag mode)            │
    │     5. validate-area-label (Tag mode)          │
    │     6. assign-scrum-team                       │
    │                                                │
    │  c. Status Transition (opt-in only)              │
    │     Skipped unless user requests transitions    │
    │     No blockers → TRANSITION to Backlog        │
    │     Has blockers → remain in New               │
    │                                                │
    │  d. Write operations to file + report progress │
    └────┬──────────────────────────────────────────┘
         │ operations file on disk (built incrementally)
    ┌────┴────┐
    │  Apply  │  Read file, validate, dry-run/execute,
    │         │  post triage comments, report
    └─────────┘
```

**Entry points:**

- **Fetch** -- given filter criteria, query Jira and return issues to the session
- **Apply** -- given operations (inline from analysis or from a file on disk), validate and execute against Jira
- **Full Triage** -- end-to-end: fetch New issues, run all analysis skills, and apply results

Fetch and Apply can be used independently. A user might Fetch without Apply (just exploring), or Apply a hand-edited operations file without Fetch. Full Triage chains them together with the analysis pipeline.

---

## Context Management (all batch operations)

When processing multiple issues through any analysis skill, follow these principles to avoid exhausting the agent's context window:

1. **Complete issue inventory (CRITICAL).** After fetching all pages from the search, build a **verified inventory** of every issue before processing any of them. The inventory is a flat list of `{ key, summary, blocking signals }` for each issue -- compact enough to hold the entire set in context. **Every issue from every page must appear in the inventory.** Compare the inventory count against the total returned by the API. If they don't match, re-read the search results until they do. **Never estimate, approximate, or skip issues from the search results.** Bulk search responses can be thousands of lines; reading them in chunks is fine, but every chunk must be fully processed and every issue key extracted. Missing even one issue invalidates the entire batch.
2. **Lightweight list fetch.** Fetch the issue set with the default fields (no `description`). This gives you keys, summaries, and metadata without loading heavy content.
3. **Per-issue detail fetch.** Load each issue's full details (description, reporter, etc.) via `jira_get_issue` only when processing that specific issue. Discard the details after that issue is complete.
4. **Incremental file writes.** After processing each issue, write its operations to the output file on disk immediately (read the file, append, write back). Do not accumulate all operations in memory until the end.
5. **Progress reporting.** Report a one-line summary after each issue so the user can monitor progress. Include the position in the inventory (e.g., `[7/53]`) so the user can confirm all issues are being processed.

**Default: inline processing.** All issues are processed in the current agent context using principles 1–5 above. No sub-agents are launched. This keeps everything in a single conversation with full shared context.

**Opt-in: sub-agent delegation ("think deep").** When the user explicitly requests deeper analysis (e.g., "think deep", "use sub-agents"), delegate per-issue processing to sub-agents via the `Task` tool. Each sub-agent starts with a fresh context window — no accumulated API responses, no residual skill file content from previous issues. The parent agent holds only the inventory and coordinates dispatch. Sub-agents are dispatched **sequentially** (one at a time). See Capability 3 § Sub-Agent Delegation for the full pattern.

Full Triage implements these principles end-to-end (see Capability 3 § Context Management). Standalone skill invocations (e.g., "validate area labels on 30 backlog issues") should follow the same pattern: lightweight fetch for the list, per-issue `jira_get_issue` for details, per-issue write to the operations file. When the user opts into sub-agent delegation for standalone batch operations, apply the same pattern documented under Full Triage.

### Context Compaction Resilience (CRITICAL)

Context compaction silently degrades the agent's working memory. After compaction, issue summaries are paraphrased or hallucinated, issue counts drift, skipped issues vanish, and operations get fabricated from vague recollection. **The operations file on disk is the only reliable state.** These rules are non-negotiable:

#### Rule 1: The file on disk is sacrosanct

After Step 1 creates the initial skeleton (with the verified `issues` map and `issueCount`), the file is the authoritative record. **Never** regenerate, reconstruct, or rewrite the file from memory. All subsequent writes are **read-append-write**: read the current file from disk, append new operations for the just-completed issue, write it back. If your memory conflicts with the file on disk, **the file wins**.

#### Rule 2: Never overwrite existing content

If the operations file already exists and contains data, treat its `issues` map and existing `operations` array as immutable history. Only **append** to the `operations` array. Never replace the `issues` map, `metadata`, or previously written operations with values reconstructed from memory. Never generate a fresh file that replaces one with existing content.

#### Rule 3: Recovery after compaction

If context has been compacted (earlier tool call results are gone, conversation is summarized, or your memory of issues feels vague), recover by reading the operations file from disk:

1. The `issues` map tells you the **complete inventory** (every issue key and its verified summary).
2. The `operations` array tells you **which issues have been processed** (any issue key appearing in at least one operation — including `NO_OP` — is done).
3. Subtract processed issue keys from the full `issues` map to get the **remaining unprocessed issues**.
4. Continue processing from the next unprocessed issue in key-ascending order, using the standard per-issue loop (Step 2.0–2e).
5. **Do not** re-fetch the issue list from Jira — the inventory on disk is already verified.
6. **Do not** reconstruct or "fill in" operations for issues you vaguely remember processing but that have no operations on disk — they were not persisted, so redo them from scratch.
7. **Do not** re-process issues that already have operations (including `NO_OP`).

#### Why these rules matter

`NO_OP` records ensure every evaluated issue leaves a trace — without them, skipped issues are indistinguishable from unprocessed ones after compaction. Static `issueCount` (set once in Step 1, never modified) prevents the count from drifting. The `issues` map persisted in Step 1 means the agent never needs to reconstruct the inventory from memory. Together, these mechanisms make the operations file a self-contained recovery checkpoint.

---

## Capability 1: Fetch

Query Jira and return a structured issue set. The output stays in the agent session (not written to disk).

### How to Fetch

1. Read `jira-project-reference.md` for the project key, component, and any label values needed for JQL
2. Build a JQL query from the user's filter criteria using the reference values
3. **Always include `resolution = Unresolved`** in the query unless the caller explicitly requests resolved issues. This prevents fetching thousands of closed issues that don't need triage.
4. **Always enforce deterministic ordering** by appending `ORDER BY key ASC` to the final JQL used for `jira_search` (unless that exact ordering is already present)
5. Call `jira_search` with the JQL, requested fields, `limit=50`, and `start_at=0`
6. **Always check for more pages.** The Jira Cloud API often returns `total: -1` (unknown count), so do **not** rely solely on `total` to decide whether to paginate. After each response, check for a `next_page_token` in the response **or** `total > start_at + max_results`. If either is present, fetch the next page (`start_at += 50` or pass `page_token`) and repeat until no more pages remain. **Skipping pagination silently drops issues from the result set.**
7. Return the accumulated issue set to the session

### Default Fields

When the caller does not specify fields, use: `summary, status, priority, labels, assignee, issuetype, created, updated`

`description` is excluded by default because it can be very large and bloat context across dozens of issues. Analysis skills that need description content should request it explicitly by adding it to the fields list.

### Common JQL Patterns

All values below must come from `jira-project-reference.md`. The patterns show the structure; substitute actual values from the reference file. All patterns include `resolution = Unresolved` by default and end with `ORDER BY key ASC`.

Placeholder reference:

| Placeholder | Reference section |
|---|---|
| `{project_key}` | Project Constants |
| `{component}` | Project Constants |
| `{jql_team_id}` | Project Constants → Team field (JQL) |
| `{triage_types}` | Issue Types → Standard Query Filters |
| `{needs_labels_list}` | Triage Labels → Needs-\* Labels |
| `{scrum_labels_list}` | Scrum Team Labels |
| `{area_labels_list}` | Area Labels |
| `{triage_labels_list}` | Triage Labels → Needs-\* Labels |

**Untriaged issues:**
```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND status = New
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND (Team is EMPTY OR Team = {jql_team_id})
  AND (labels is EMPTY OR labels != Security)
  AND (labels is EMPTY OR labels not in (Cross-Team))
  AND (labels is EMPTY OR labels not in ({scrum_labels_list}))
  AND (labels is EMPTY OR labels not in ({needs_labels_list}))
  AND Blocked != "True"
ORDER BY key ASC
```

This is the one query that uses `(Team is EMPTY OR Team = ...)` because incoming issues may not yet have a team assigned. Issues inside an epic are excluded because they are managed as part of the epic's planned work. Issues with `needs-*` labels or `Blocked = True` have already been through triage and identified as waiting on something. They are handled separately by the evaluate-blockers skill. Issues labeled `Cross-Team` are managed at the program level and excluded from dashboard-specific triage.

> **JQL negative-label caveat:** In Jira, `labels != X` and `labels not in (...)` exclude issues with **no labels at all** — those issues have no label value to compare against, so they silently drop out of results. Every negative label condition must be wrapped in `(labels is EMPTY OR ...)` to include label-less issues.

**Issues missing area labels:**
```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND Team = {jql_team_id}
  AND status = Backlog
  AND (labels is EMPTY OR labels not in ({area_labels_list}))
ORDER BY key ASC
```

**Issues assigned to a scrum team:**
```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND Team = {jql_team_id}
  AND labels = "{scrum_label}"
ORDER BY key ASC
```

**Stale assigned issues (no update in N days):**
```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND Team = {jql_team_id}
  AND assignee is not EMPTY
  AND updated < -{N}d
ORDER BY key ASC
```

**Issues needing triage attention:**
```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND Team = {jql_team_id}
  AND labels in ({triage_labels_list})
ORDER BY key ASC
```

The caller (user or analysis skill) can provide any valid JQL. These patterns are starting points, not exhaustive. All sub-triage queries include the standard filters from `jira-project-reference.md` § Standard Query Filters. To include resolved issues, the caller must explicitly omit or override the `resolution = Unresolved` clause. **Before execution, normalize every triage query to include `ORDER BY key ASC` for stable issue ordering.**

---

## Operations Format (the contract)

The JSON format that sits between analysis and execution. Analysis skills produce it; Apply consumes it. The formal JSON Schema is at [`operations-schema.json`](operations-schema.json). **Required operation fields, action enums, and `params` contracts are defined only in that schema** — sub-skills reference it and describe which actions *this skill* emits, not a duplicate field checklist.

### Structure

```json
{
  "metadata": {
    "generated": "2026-03-11",
    "query": "project = RHOAIENG AND component = \"AI Core Dashboard\" AND status = New",
    "issueCount": 12
  },
  "issues": {
    "RHOAIENG-12345": "Issue title for readability",
    "RHOAIENG-12346": "Another issue in the query result"
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-12345",
      "action": "ADD_LABEL",
      "params": { "labels": ["needs-info"] },
      "reason": "No reproduction steps, reporter inactive for 30+ days"
    },
    {
      "issueKey": "RHOAIENG-12346",
      "action": "NO_OP",
      "params": {},
      "reason": "Not a dashboard issue — operator-only component with no UI/BFF scope"
    }
  ]
}
```

**`issueCount` is static.** Set once when the file is created (Step 1) to the total number of issues returned by the initial query. Never incremented during processing. This is the authoritative count of the query result set.

**`issues` map contains ALL queried issues.** Populated in Step 1 from the verified inventory — every issue returned by the query appears here, regardless of whether it has actionable operations. This serves as the authoritative record of the query result set, as a completeness check (every key in `issues` must have at least one entry in `operations`, even if it's `NO_OP`), and as a deduplication mechanism (avoids repeating summaries on every operation). Per-operation `summary` is still allowed for single-operation emits or overrides. Apply and dry-run lines use `operation.summary ?? issues[issueKey] ?? issueKey`.

### Supported Actions

| Action | MCP Tool | Params |
|---|---|---|
| `SET_FIELDS` | `jira_update_issue` | `{ "fields": { ... } }` -- passed through as-is |
| `ADD_LABEL` | `jira_get_issue` + `jira_update_issue` | `{ "labels": ["label1"] }` -- **read-modify-write** (see below) |
| `REMOVE_LABEL` | `jira_get_issue` + `jira_update_issue` | `{ "labels": ["label1"] }` -- **read-modify-write** (see below) |
| `ADD_COMMENT` | `jira_add_comment` | `{ "comment": "markdown text" }` -- **visibility enforced at execution time** (see below) |
| `TRANSITION` | `jira_get_transitions` + `jira_transition_issue` | `{ "transitionName": "Backlog", "fields": { ... } }` -- resolved at execution time; `fields` is optional |
| `LINK_DUPLICATE` | `jira_create_issue_link` | `{ "duplicateOf": "RHOAIENG-99999" }` |
| `LINK_BLOCKED_BY` | `jira_create_issue_link` | `{ "blockedBy": "RHOAIENG-99999" }` |
| `NO_OP` | *(none — informational)* | `{}` -- empty params; the `reason` field explains why no action is needed |

#### NO_OP (informational record)

`NO_OP` is not an executable action — it records that an issue was evaluated and no operations are needed, along with the reason. Every issue from the query result that has no actionable operations must have exactly one `NO_OP` entry. This ensures the operations file accounts for every issue in the query result (the `issues` map and operations array are complete and verifiable).

Common reasons for `NO_OP`:
- Template issue — not a real work item (detected at template gate)
- Issue skipped at team gate (not a dashboard issue)
- Issue already fully triaged (all fields correct, no changes needed)
- Issue excluded by analysis (e.g., CI flake that doesn't need dashboard triage)

**`NO_OP` issues still get `ai-reviewed`:** Even when no substantive changes are needed, the `ai-reviewed` label is added (if not already present) to prevent reprocessing the issue in future triage runs. A `NO_OP` + `ADD_LABEL ai-reviewed` pair is the standard output for fully-triaged issues. No triage summary comment is posted for issues whose only operations are `NO_OP` and `ai-reviewed`.

Apply skips `NO_OP` operations during execution. Dry-run shows them for completeness.

#### Comment Header (all ADD_COMMENT operations)

**All comments posted by triage skills must start with `### AI Triage` as the first line.** This applies to every `ADD_COMMENT` operation across all skills -- audit trail comments, description validation requests, area label reviews, and triage summary comments. The header identifies the comment as machine-generated and makes it easy to find/filter in issue history.

#### Comment Visibility (all ADD_COMMENT operations)

**All comments posted by triage skills are restricted to Red Hat employees.** This is enforced at execution time -- analysis skills do not need to include visibility in their operations. The Apply step (both agent and script paths) automatically applies the visibility from `jira-project-reference.md` § Comment visibility.

- **Agent path:** When calling `jira_add_comment`, always pass `visibility: '{"type":"group","value":"Red Hat Employee"}'`
- **Script path:** The apply script includes the visibility object in every comment POST body
- **Triage summary comments** (Step 6) also use this visibility

Operations may include an explicit `visibility` in their params to override the default. If omitted, the default is applied.

#### User References in Comments

References to people in comments fall into two categories with different syntax:

**Action pings (requesting someone do something):** Use the Jira mention syntax `@[Display Name](accountid:ACCOUNT_ID)`, which the MCP Markdown-to-ADF converter transforms into a native Jira mention node (clickable, with notifications). Use this **only** when you are directing a question, request, or call-to-action at that person.

**Contextual citations (stating who did something):** Use the person's **plain display name** with no mention syntax. Historical context like "set by Christian Vogt on 2024-11-14" or "comment by Jane Doe (Mar 20)" does not require a notification -- it is providing attribution, not requesting action.

**How to get the account ID (for action pings):** Call `jira_get_user_profile` with the person's email address. The response includes an `account_id` field. The `account_id` is also available on issue fields (`reporter`, `assignee`) and in comment author objects returned by `jira_get_issue`.

**Example -- action ping:**
```markdown
@[Jane Doe](accountid:712020:ce710f80-369e-4b6d-95e2-ca6c9e58d9fb) — can you confirm whether this is still blocked?
```

**Example -- contextual citation (no ping):**
```text
Stale `Blocked=True` (~16 months, set by Christian Vogt on 2024-11-14).
```

**Rule of thumb:** If removing the reference would lose an actionable ask, it's an action ping. If removing it would only lose historical context, it's a contextual citation.

#### Issue and External References in Comments

**Every Jira issue key and external resource mentioned in a comment must be a full clickable link.** This applies to *every occurrence* of the key in the comment — not just the first mention. Do not use bare issue keys (`RHOAIENG-12345`) or shorthand notations (`org/repo#123`). Although Jira may auto-link issue keys in some rendering contexts, explicit markdown links are more reliable and work across all rendering modes (email notifications, API consumers, ADF export).

| Reference type | Bad (not clickable) | Good (clickable) |
|---|---|---|
| Jira issue | `RHOAIENG-12345` | `[RHOAIENG-12345](https://redhat.atlassian.net/browse/RHOAIENG-12345)` |
| GitHub issue | `patternfly-design#1276` | `[patternfly/patternfly-design#1276](https://github.com/patternfly/patternfly-design/issues/1276)` |
| GitHub PR | `odh-dashboard#1234` | `[odh-dashboard#1234](https://github.com/opendatahub-io/odh-dashboard/pull/1234)` |
| GitHub PR (full) | PR #1234 | `[PR #1234](https://github.com/opendatahub-io/odh-dashboard/pull/1234)` |

**Jira issues:** Always use `[KEY](https://redhat.atlassian.net/browse/KEY)`. If the same issue key appears multiple times in a comment (e.g., once in a summary list and again in a ping paragraph), **every occurrence** must be a link.

**GitHub references** require the full URL because Jira does not auto-link GitHub shorthand. When referencing a GitHub issue or PR, construct the URL from the org, repo, and number. Use `jira-project-reference.md` § GitHub Repository for the dashboard repo's owner and name. For external repos (e.g., `patternfly/patternfly-design`), infer the org and repo from the shorthand or Blocked Reason text.

#### When to Ping the Reporter

**Only ping the reporter for `needs-info`** -- when the reporter can provide missing details or confirm a decision that only they can make. Two common cases:

1. **Missing description details** (steps to reproduce, environment, expected behavior, etc.) — handled by the validate-description skill.
2. **Close suggestion confirmation** — when recent comments suggest the issue should be closed, the reporter must confirm whether the issue is still needed. Handled by evaluate-blockers Tag mode Step 5.

**Never ping the reporter for other `needs-*` labels** (`needs-ux`, `needs-pm`, `needs-advisor`). These labels signal that a specific *role* (designer, product manager, tech lead) needs to provide input. The reporter is typically not that person, so pinging them creates noise without producing useful action. These labels are signals to the triage team, not requests to the reporter.

#### SET_FIELDS

Pass-through to `jira_update_issue`. The base skill does not need to know which fields are being set -- analysis skills determine their own field names, IDs, and values.

Examples:
- `{"fields": {"priority": {"name": "Major"}}}`
- `{"fields": {"customfield_10001": "ec74d716-af36-4b3c-950f-f79213d08f71-1809"}}`
- `{"fields": {"issuetype": {"name": "Bug"}}}`

#### ADD_LABEL / REMOVE_LABEL -- Read-Modify-Write (CRITICAL)

The `jira_update_issue` tool **replaces** the entire labels array. Calling it with only the new labels would wipe all existing labels. This is destructive and hard to undo across a batch.

**Required procedure:**

1. Call `jira_get_issue` with `fields=labels` to get the current labels array
2. Compute the new labels:
   - **ADD_LABEL**: union of current labels and the labels in params
   - **REMOVE_LABEL**: current labels minus the labels in params
3. Call `jira_update_issue` with `{"labels": [<full resulting array>]}`

If the current labels already contain the label being added (or don't contain the label being removed), skip the update and mark the operation as `success` with a note.

#### TRANSITION

Operations use a human-readable `transitionName` (e.g., "Backlog", "In Progress"). The Apply step resolves it to a numeric `transition_id` at execution time. An optional `fields` object can set fields during the transition (e.g., resolution when closing).

1. Call `jira_get_transitions` on the issue to get available transitions
2. Find the transition whose name exactly matches `transitionName` (case-insensitive)
3. If found, call `jira_transition_issue` with the resolved `transition_id`. If the operation includes `fields`, pass them as the `fields` parameter to `jira_transition_issue` as a JSON string (e.g., `'{"resolution": {"name": "Done"}}'`).
4. If no match, mark the operation `failed` with error text that includes the list of available transition names for diagnosis

#### LINK_DUPLICATE

Call `jira_create_issue_link` with:
- `link_type`: `"Duplicate"`
- `inward_issue_key`: the operation's `issueKey`
- `outward_issue_key`: the `duplicateOf` value from params

#### LINK_BLOCKED_BY

Call `jira_create_issue_link` with:
- `link_type`: `"Blocks"`
- `inward_issue_key`: the operation's `issueKey` (the issue that is blocked)
- `outward_issue_key`: the `blockedBy` value from params (the issue that blocks)

This creates a link where the `blockedBy` issue "blocks" the operation's issue (and the operation's issue "is blocked by" the `blockedBy` issue).

### Aggregation

Results from multiple analysis skills can be merged by concatenating their `operations` arrays. If producers used the root `issues` map (issue key → summary), merge those objects too (combine maps; on duplicate keys, prefer the later batch or reconcile manually). Apply processes operations in array order regardless of source. A single issue may have multiple operations (e.g., ADD_LABEL + ADD_COMMENT + TRANSITION).

**Ordering matters:** analysis skills should sequence dependent actions correctly. For example, a comment explaining a close should come before the TRANSITION to Closed.

**Conflict detection:** during dry-run, if multiple operations target the same issue, flag them for the user to review. This catches cases where one skill adds a label while another transitions to Closed.

---

## Capability 2: Apply

Execute operations against Jira. Supports two modes and two sources.

**Modes:**

- **Dry-run (default):** Validate, present summary, write operations file to disk, and stop. No Jira mutations. The user reviews the file offline or in a later session.
- **Execute:** Validate, present summary, confirm, execute against Jira, annotate operations in-place with status.

**Sources:**

- **Inline (chained):** Operations from an analysis step in the same session. Default mode is dry-run: validate, summarize, write file, stop. The user can request immediate execution instead.
- **From file:** A path to an operations JSON file (from a previous dry-run or hand-edited). Always runs in execute mode: validate, summarize, confirm, execute.

The agent determines the source from context: "apply operations from `.artifacts/triage/ops.json`" means from-file; operations flowing from a preceding analysis step means inline.

### Operations File Path

All operations files are written to: `.artifacts/triage/`

This path is relative to the workspace root. Create `.artifacts/triage/` if it doesn't exist.

- **File name:** `operations-YYYY-MM-DD.json` using today's date (from the conversation context). If the file already exists, append a numeric suffix: `operations-YYYY-MM-DD_(2).json`, `operations-YYYY-MM-DD_(3).json`, etc. Check the directory with `ls` before choosing the name.

There is no separate results file. Execution status is tracked **in-place** on the operations file — each operation gets a `status` field as it is executed (see Step 5). This keeps everything in one file, supports selective/partial applies naturally, and avoids proliferating results files.

### Apply Procedure

#### Step 1: Validate and Filter

- Verify the operations match the schema in `operations-schema.json`
- Check that every `issueKey` looks valid (matches `^[A-Z]+-[0-9]+$`)
- **Filter out already-applied operations.** Only operations with `status: "success"` are excluded — they are definitively done. Operations with `status: "failed"` are retried alongside unannotated operations. Report the counts: "N operations to apply (M already succeeded, excluded)."
- **Exclude `NO_OP` operations from execution counts.** `NO_OP` operations are informational records — they are not counted as "operations to apply" and are not executed. They appear in the dry-run summary for completeness but are automatically treated as `status: "success"` during execution (annotated in-place without any Jira API call).
- Report any validation errors and stop

#### Step 2: Dry-Run Summary

**Only unannotated operations (no `status` field) appear in the summary.** Already-applied operations are not shown.

Resolve display text for each line as `operation.summary ?? issues[issueKey] ?? issueKey` (see `operations-schema.json`).

**Always present the summary grouped by Jira issue key**, listing each issue once with all its proposed changes underneath. **Every issue key in the summary must be a clickable markdown link** to the Jira issue (format: `[RHOAIENG-12345](https://redhat.atlassian.net/browse/RHOAIENG-12345)`). This makes it easy to review the full picture for each issue at a glance:

```text
Dry-run summary:

[RHOAIENG-12345](https://redhat.atlassian.net/browse/RHOAIENG-12345) -- Widget crashes on save
  - Activity Type = Tech Debt & Quality
  - Comment to @reporter requesting repro steps
  - +`needs-info` -- missing reproduction steps
  - +`dashboard-area-model-serving`
  - +`ai-reviewed`

[RHOAIENG-12346](https://redhat.atlassian.net/browse/RHOAIENG-12346) -- Add dark mode toggle to cluster settings
  - +`needs-ux` -- UI change without mockups
  - +`dashboard-area-cluster-settings`
  - +`ai-reviewed`

[RHOAIENG-12350](https://redhat.atlassian.net/browse/RHOAIENG-12350) -- Pipeline run table shows wrong status
  - **Story -> Bug**, Activity Type = Tech Debt & Quality
  - Severity = Moderate, Priority = Normal -> Major (severity floor)
  - +`dashboard-area-pipelines`
  - +`dashboard-razzmatazz-scrum`
  - -> Backlog
  - +`ai-reviewed`

[RHOAIENG-12355](https://redhat.atlassian.net/browse/RHOAIENG-12355) -- Waiting on backend API for subscription column
  - blocked by [RHOAIENG-12300](https://redhat.atlassian.net/browse/RHOAIENG-12300)
  - +`dashboard-area-model-serving`
  - +`ai-reviewed`

[RHOAIENG-12370](https://redhat.atlassian.net/browse/RHOAIENG-12370) -- Stale bug already fixed on main
  - -> Closed (Done) -- Already fixed on main
  - +`ai-reviewed`

[RHOAIENG-12380](https://redhat.atlassian.net/browse/RHOAIENG-12380) -- Operator webhook validation error
  - NO_OP: Not a dashboard issue — operator-only component with no UI/BFF scope
```

`NO_OP` issues appear at the end of the dry-run summary, separated from actionable issues. They are not included in the executable operation count.

#### Step 3: Write or Execute

**Dry-run mode (default for inline operations):**

1. Write the operations to a new file in `.artifacts/triage/` (see § Operations File Path for naming)
2. Report the file path: "Operations written to `.artifacts/triage/operations-2026-03-26.json` -- review and apply with: apply operations from that file"
3. Stop. No Jira mutations.

**Execute mode (default for from-file, or when the user explicitly requests execution):**

Continue to Step 4.

#### Step 4: Confirm and Execute

Confirmation is **all-or-nothing**:

- "Apply all N operations to M issues? (yes / abort)"

The user either approves the entire batch or aborts. There is no per-group or per-issue selection — the dry-run summary (Step 2) is the review checkpoint. If the user wants to exclude specific operations, they edit the operations file before applying.

On approval, process all operations **sequentially** (one at a time) following the action-specific procedures documented above.

#### Step 5: Track Status (In-Place Annotation)

As each operation is executed, annotate it **in-place** on the operations file. Read the file, update the operation's fields, write it back. This makes the operations file the single source of truth for both what was proposed and what happened.

**Status values:**

| Status | Meaning |
|---|---|
| (absent) | Not yet attempted — the implicit default for unannotated operations |
| `success` | Completed successfully |
| `failed` | Failed with error (see `error` field) |

**Additional fields set on execution:**

| Field | When set | Purpose |
|---|---|---|
| `status` | Always on execution | Tracks outcome |
| `error` | `status: "failed"` only | Error detail for diagnosis |
| `commentId` | `ADD_COMMENT` with `status: "success"` | Jira comment ID, enables later edits |

**On failure:** log the error, mark the operation `failed`, and **continue** to the next operation. Do not abort the batch.

**Partial applies:** When applying a subset of operations from a file (e.g., "apply operations for RHOAIENG-7530 only"), annotate only the targeted operations. Unannotated operations remain available for future applies.

#### Step 6: Post Triage Summary Comments

After all operation groups have been executed, post a summary comment on each issue that had at least one successful, non-bookkeeping operation. This documents what the AI triage changed directly on the issue.

**When to post:** Execute mode only. Dry-run does not post comments.

**Which issues:** Any issue with at least one `success` operation, excluding `NO_OP` and the `ai-reviewed` bookkeeping ADD_LABEL. Issues whose only operations are `NO_OP` + `ai-reviewed` do **not** get a triage summary comment — there is nothing to report.

**Comment format (Markdown):**

The `jira_add_comment` MCP tool accepts **Markdown** (not Jira wiki markup) and converts it to ADF. All comment templates below use Markdown syntax.

```markdown
### AI Triage

| Field | Change |
| --- | --- |
| {field} | {change} |
| | *{reason}* |
| Status | {old status} → {new status} |
```

**Template rules:**

- **Header** is always `### AI Triage`
- **Field/Change table** is a Markdown table with one row per actual change, with an italicized reason sub-row underneath
- **Included operations:** SET_FIELDS, ADD_LABEL (except bookkeeping labels), REMOVE_LABEL, TRANSITION, LINK_DUPLICATE, LINK_BLOCKED_BY
- **Excluded:** bookkeeping labels (`ai-reviewed`), failed operations
- **Field names** use human-readable labels: "Type", "Activity Type", "Priority", "Severity", "Labels", "Scrum Team", "Status", "Team"
- **Field values** use human-readable names, not field IDs or internal codes. Examples: "RHOAI Dashboard" not raw `customfield_10001` UUIDs alone in prose; "Moderate" not `{"value": "Moderate"}`; "Major" not `{"name": "Major"}`
- **Label changes** are shown as `` +`label-name` `` (added) or `` -`label-name` `` (removed), using Markdown inline code
- **Multiple labels** in a single ADD_LABEL are comma-separated in one row: `` +`label-a`, +`label-b` ``
- **Link operations** are shown as `` +blocked by [`RHOAIENG-12300`](https://redhat.atlassian.net/browse/RHOAIENG-12300) `` for LINK_BLOCKED_BY and `` +duplicate of [`RHOAIENG-99999`](https://redhat.atlassian.net/browse/RHOAIENG-99999) `` for LINK_DUPLICATE. Links appear after Labels rows and before the Scrum Team row.
- **Blocked field changes** are shown as `(unset) → Blocked: {reason text}` when setting Blocked=True with a reason, or `Blocked → (unset)` when clearing it. Appears after link rows.
- **Unset fields** use `(unset)` as the explicit "from" value to make reversal unambiguous (e.g., `(unset) → RHOAI Dashboard` for a newly assigned Team field)
- **Scrum Team row** appears after Labels/Links/Blocked rows and before the Status row. Three cases:
  - **Assigned by pipeline:** `` | Scrum Team | +`dashboard-monarch-scrum` | `` with reason sub-row. Normal operation row.
  - **Could not be determined (and no scrum label exists):** `| Scrum Team | — (not assigned) |` with reason sub-row explaining why (e.g., area has no default team mapping, or areas map to conflicting teams). This is the only comment row that can appear without a corresponding successful operation.
  - **Already assigned (noop):** Omit the row entirely. An existing scrum label is a noop — nothing to report.
- **Status transition** is always the last row in the table, shown as `{old} → {new}` with no reason sub-row
- **Reason sub-rows** use `| | *{reason text}* |` (empty first cell, italicized reason in second cell)
- **Do not** restate the issue key or summary -- the comment is on that issue

**Example -- bug with type correction, area label, scrum team, and team assignment:**

```markdown
### AI Triage

| Field | Change |
| --- | --- |
| Type | Story → Bug |
| | *Description reports a crash with stack trace — matches bug criteria, not enhancement.* |
| Activity Type | New Features → Tech Debt & Quality |
| | *Bug classification; Activity aligned to quality/defect work.* |
| Severity | Undefined → Moderate |
| | *Single-user impact with workaround available.* |
| Priority | Normal → Major |
| | *Severity floor: Moderate severity requires at least Major priority.* |
| Labels | +`dashboard-area-pipelines` |
| | *Pipeline-specific error message and file paths in description.* |
| Team | (unset) → RHOAI Dashboard |
| | *Pipeline execution UI errors and file paths in description — dashboard-area-pipelines.* |
| Scrum Team | +`dashboard-razzmatazz-scrum` |
| | *Area 'dashboard-area-pipelines' maps to Razzmatazz.* |
| Status | New → Backlog |
```

**Example -- story with no type change:**

```markdown
### AI Triage

| Field | Change |
| --- | --- |
| Priority | Undefined → Normal |
| | *UX improvement with no urgency signal — default story priority.* |
| Labels | +`enhancement`, +`dashboard-area-model-catalog` |
| | *Standalone enhancement to existing model catalog admin settings.* |
| Scrum Team | +`dashboard-green-scrum` |
| | *Area 'dashboard-area-model-catalog' maps to Green.* |
| Status | New → Backlog |
```

**Example -- issue blocked, not transitioned:**

```markdown
### AI Triage

| Field | Change |
| --- | --- |
| Labels | +`needs-info` |
| | *No reproduction steps or environment details provided.* |
| Labels | +`dashboard-area-model-serving` |
| | *Inference endpoint and serving runtime references in description.* |
| Scrum Team | +`dashboard-zaffre-scrum` |
| | *Area 'dashboard-area-model-serving' maps to Zaffre.* |
```

**Example -- scrum team skipped (unmapped area):**

```markdown
### AI Triage

| Field | Change |
| --- | --- |
| Labels | +`dashboard-area-edge` |
| | *Edge deployment keywords in summary and description.* |
| Scrum Team | — (not assigned) |
| | *Area 'dashboard-area-edge' has no default scrum team mapping.* |
| Status | New → Backlog |
```

**Example -- scrum team skipped (conflicting areas):**

```markdown
### AI Triage

| Field | Change |
| --- | --- |
| Labels | +`dashboard-area-model-registry`, +`dashboard-area-pipelines` |
| | *Model registry and pipeline references in description.* |
| Scrum Team | — (not assigned) |
| | *Areas map to conflicting teams: Green (model-registry), Razzmatazz (pipelines).* |
| Status | New → Backlog |
```

**Example -- issue with blocked-by link and blocked field:**

```markdown
### AI Triage

| Field | Change |
| --- | --- |
| Priority | (unset) → Major |
| | *Backend dependency with customer-facing impact.* |
| Labels | +`dashboard-area-pipelines` |
| | *Pipeline server configuration references in description.* |
| Blocked By | +blocked by [`RHOAIENG-54596`](https://redhat.atlassian.net/browse/RHOAIENG-54596) |
| | *Description states dependency on backend API in [`RHOAIENG-54596`](https://redhat.atlassian.net/browse/RHOAIENG-54596).* |
| Blocked | (unset) → Blocked: Waiting on z-stream 2.25 to ship the backend fix |
| | *External release dependency — cannot proceed until z-stream ships.* |
| Scrum Team | +`dashboard-razzmatazz-scrum` |
| | *Area 'dashboard-area-pipelines' maps to Razzmatazz.* |
```

Post the comment using `jira_add_comment` with `visibility: '{"type":"group","value":"Red Hat Employee"}'` (see § Comment Visibility). This comment is posted after all other operations have been executed for the issue -- it summarizes the final state, not intermediate steps.

#### Step 7: Report Results

After all operations are attempted, report:

```text
Results: 11 succeeded, 2 failed

Failed operations:
  [RHOAIENG-12346](https://redhat.atlassian.net/browse/RHOAIENG-12346): TRANSITION -> "Backlog" -- Transition 'Backlog' not available (available: New, In Progress, Closed)
  [RHOAIENG-12360](https://redhat.atlassian.net/browse/RHOAIENG-12360): SET_FIELDS priority=Major -- Permission denied
```

Then provide a JQL query targeting the specific issue keys that had at least one successful operation, along with a clickable Jira link:

```jql
key in (RHOAIENG-12345, RHOAIENG-12346, RHOAIENG-12350) ORDER BY key ASC
```

Build the link as `https://redhat.atlassian.net/issues/?jql=` followed by the URL-encoded JQL. **Encode parentheses** as `%28` / `%29` — unencoded `()` in the URL breaks markdown link syntax. Present it as a markdown link so the user can click through to verify the changes in the Jira web interface.

For consistency, **every issue key shown in Step 7 output must be a clickable markdown link** (`https://redhat.atlassian.net/browse/<ISSUE-KEY>`), including issue-group headers and failed operation lines.

#### Step 8: Verify File State

After all operations are attempted and triage summary comments are posted, the operations file already reflects the final state (each operation annotated in-place during Step 5). No separate results file is written.

Verify the file is consistent: every operation that was attempted should have a `status` field. Report the file path so the user can review.

**Example of an annotated operations file after partial execution:**

```json
{
  "metadata": {
    "generated": "2026-03-11",
    "query": "...",
    "issueCount": 4
  },
  "issues": {
    "RHOAIENG-12345": "Issue title",
    "RHOAIENG-12346": "Another issue",
    "RHOAIENG-12348": "Operator webhook error",
    "RHOAIENG-12350": "Third issue"
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-12345",
      "action": "ADD_LABEL",
      "params": { "labels": ["needs-info"] },
      "reason": "No reproduction steps",
      "status": "success"
    },
    {
      "issueKey": "RHOAIENG-12345",
      "action": "ADD_COMMENT",
      "params": { "comment": "### AI Triage\n\n..." },
      "reason": "Requesting missing details from reporter",
      "status": "success",
      "commentId": "16601820"
    },
    {
      "issueKey": "RHOAIENG-12346",
      "action": "TRANSITION",
      "params": { "transitionName": "Backlog" },
      "reason": "Triaged, moving to backlog",
      "status": "failed",
      "error": "Transition 'Backlog' not available for current status 'In Progress'"
    },
    {
      "issueKey": "RHOAIENG-12348",
      "action": "NO_OP",
      "params": {},
      "reason": "Not a dashboard issue — operator-only component with no UI/BFF scope",
      "status": "success"
    },
    {
      "issueKey": "RHOAIENG-12350",
      "action": "ADD_LABEL",
      "params": { "labels": ["dashboard-area-pipelines"] },
      "reason": "Pipeline references in description"
    }
  ]
}
```

In this example, two operations succeeded, one failed, one is a NO_OP (auto-succeeded), and one has not been attempted yet (no `status` field). Note that `issueCount` is 4 (the query result size) and every issue in the `issues` map has at least one entry in `operations`.

### Resume

Re-applying the same operations file automatically resumes where you left off. Step 1 excludes `status: "success"` operations and retries everything else — failed and unannotated operations are all candidates.

---

## Capability 3: Full Triage

End-to-end orchestration of the analysis pipeline for issues in the `New` status. Fetches untriaged issues, runs every applicable analysis skill, aggregates operations, and applies them.

### When to Use

Use Full Triage when the user asks to "triage new issues", "run triage", or wants to process the incoming queue. For ad-hoc or selective operations (e.g., "check priority on these 3 bugs"), use individual skills with Fetch/Apply directly.

**Transition opt-in:** By default, Full Triage does **not** transition issues from New to Backlog. Issues remain in New so a human can review AI triage results first. To enable transitions, the user must explicitly request them (e.g., "triage and transition", "triage with transitions", "move to backlog", "auto-transition"). See Step 2c for details.

### Target JQL

Full Triage always uses this JQL to select its issue set:

```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND status = New
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND (Team is EMPTY OR Team = {jql_team_id})
  AND (labels is EMPTY OR labels != Security)
  AND (labels is EMPTY OR labels not in (Cross-Team))
  AND (labels is EMPTY OR labels not in ({scrum_labels_list}))
  AND (labels is EMPTY OR labels not in ({needs_labels_list}))
  AND Blocked != "True"
ORDER BY key ASC
```

This is the standard Untriaged issues query (see Common JQL Patterns). Uses `(Team is EMPTY OR Team = ...)` because incoming issues may not yet have a team assigned. All values come from `jira-project-reference.md`. The existing status, label, and blocked filters are sufficient to exclude already-triaged issues — no `ai-reviewed` guard is needed.

#### Scrum-specific triage

When the user asks to triage a **specific scrum team** (e.g., "triage Zaffre", "triage Razzmatazz issues"), modify the Target JQL as follows:

1. **Remove** the scrum label exclusion line: `AND (labels is EMPTY OR labels not in ({scrum_labels_list}))`
2. **Insert** a positive label match for the requested scrum team: `AND labels = "{scrum_label}"`

The resulting query:

```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND status = New
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND (Team is EMPTY OR Team = {jql_team_id})
  AND (labels is EMPTY OR labels != Security)
  AND (labels is EMPTY OR labels not in (Cross-Team))
  AND labels = "{scrum_label}"
  AND (labels is EMPTY OR labels not in ({needs_labels_list}))
  AND Blocked != "True"
ORDER BY key ASC
```

All other query filters remain unchanged. The rest of the pipeline runs normally — the assign-scrum-team skill (Step 2b, skill 6) will naturally skip these issues since they already have a scrum label.

### Context Management

Full Triage is designed to minimize context window usage so it can process large issue queues without running out of context. Four mechanisms work together:

1. **Complete issue inventory (CRITICAL).** Step 1 fetches all pages and builds a **verified inventory** of every issue before processing begins. The inventory count must match the total returned by the API. See top-level § Context Management for the full inventory protocol. **No issue may be skipped, estimated, or lost in large search responses.**
2. **Lightweight list fetch.** Step 1 fetches all issues with minimal fields (no descriptions). This builds the issue queue cheaply.
3. **Per-issue detail fetch.** Each issue's full details (description, reporter, etc.) are loaded only when that issue is being processed, via a `jira_get_issue` call at the start of each iteration.
4. **Incremental file writes.** After each issue is fully processed, its operations are written to the output file on disk immediately. The agent does not need to retain previous issues' descriptions or operations in working memory.

This means context at any point holds roughly: one issue's full data + one sub-skill's reference material + the triage infrastructure. This is bounded and constant regardless of queue size.

### Sub-Agent Delegation ("Think Deep")

Sub-agent delegation gives each issue a completely fresh context window, allowing deeper analysis without accumulated tool call history from previous issues.

#### When to delegate

Sub-agent delegation is **opt-in only**. The default is always inline processing — no sub-agents. Use sub-agents only when the user explicitly requests it:

- "think deep" / "deep triage" — user wants maximum analysis depth per issue
- "use sub-agents" / "triage with sub-agents" — user explicitly requests delegation

When the user does not request delegation, process all issues inline using the per-issue pattern in Steps 2.0–2e regardless of queue size. **Never** enable sub-agents without user confirmation. **Never** suggest sub-agents proactively.

#### Coordinator role

When delegating, the parent agent becomes a lightweight coordinator:

1. **Step 1** (Fetch + Initialize) — runs in the coordinator as normal
2. **Step 2** — coordinator dispatches one sub-agent per issue instead of processing inline
3. **Step 3** (Apply) — runs in the coordinator after all sub-agents complete

The coordinator does **not** read sub-skill files, fetch issue details, or run the analysis pipeline. It holds only the verified inventory (issue keys + summaries) and the operations file path.

#### Worker sub-agent prompt

Each sub-agent receives a self-contained prompt — sub-agents have no access to the parent conversation. Use the `Task` tool with `subagent_type: "generalPurpose"`. Do **not** set `readonly: true` (sub-agents need MCP access for Jira API calls and write access for the operations file).

**Template** (substitute `{placeholders}` from the inventory):

```text
Process one Jira issue through the Full Triage analysis pipeline.

**Issue:** {issueKey}
**Operations file:** {operations_file_path}
**Position:** [{current}/{total}]
**Transitions enabled:** {yes|no}

**Steps:**
1. Read these files in order:
   - `.claude/skills/jira-triage/persona.md` — execution protocol, follow strictly
   - `.claude/skills/jira-triage/jira-project-reference.md` — all Jira field IDs, labels, values
   - `.claude/skills/jira-triage/SKILL.md` — read Capability 3, Steps 2.0 through 2e

2. Execute Steps 2.0–2e for {issueKey}:
   - 2.0: Fetch full details via jira_get_issue (use the detail fields listed in § Fields)
   - 2.0a: Template gate — if summary/labels/description indicate a template issue, write NO_OP + ai-reviewed and return
   - 2a: Team gate — evaluate dashboard ownership; if not owned, write NO_OP with reason
   - 2b: Analysis pipeline — read each sub-skill SKILL.md and run in documented order:
          validate-issue-type → validate-description → validate-priority-severity →
          evaluate-blockers (Tag) → validate-area-label (Tag) → assign-scrum-team
   - 2c: Status transition — ONLY if "Transitions enabled = yes": TRANSITION to Backlog if no blocking signals. If "Transitions enabled = no", skip this step entirely.
   - 2d: Finalize — ADD_LABEL ai-reviewed
   - 2e: Write operations to {operations_file_path}

3. Return a one-line progress summary in this format:
   "{issueKey} -- {summary}: {result}"
   Examples:
     "RHOAIENG-12345 -- Widget crashes: type OK, severity=Moderate, priority=Major, area=model-serving, scrum=Zaffre → Backlog"
     "RHOAIENG-12345 -- Widget crashes: type OK, severity=Moderate, priority=Major, area=model-serving, scrum=Zaffre"
     "RHOAIENG-12346 -- Operator webhook error: skipped (not a dashboard issue)"
   If the issue was skipped at the team gate, return:
     "RHOAIENG-12346 -- Operator webhook error: skipped ({reason})"
```

The sub-agent reads the full SKILL.md and follows Steps 2.0–2e as documented — the prompt does not duplicate the step logic, it references it. This ensures the sub-agent always follows the current version of the pipeline.

#### Dispatch pattern

Dispatch one sub-agent at a time in key-ascending order. After each completes:

1. Read its returned progress line
2. Report to user: `[3/9] {progress_line}`
3. Dispatch the next sub-agent

#### Error handling

If a sub-agent fails (returns an error, times out, or produces no file update):

1. Report: `[3/9] RHOAIENG-12345 -- FAILED: {error summary}`
2. Continue to the next issue — do not retry automatically
3. After all issues, list failed issues for the user to retry or handle manually

### Fields

Full Triage uses two field sets to manage context efficiently:

**List fields** (Step 1 — bulk fetch for the issue queue):

`summary, status, priority, labels, assignee, issuetype, created, updated, customfield_10001, components`

This is a lightweight set for building the issue queue. It includes Team (`customfield_10001`) and Components for the Step 2a team gate (which can skip issues without reading their description). It excludes `description` and other large fields to keep the bulk fetch small.

**Detail fields** (Step 2 — per-issue fetch via `jira_get_issue`):

`summary, status, priority, labels, assignee, issuetype, created, updated, description, reporter, comment, customfield_10840, customfield_10517, customfield_10483, customfield_10001, customfield_10464, issuelinks, components`

Use `comment_limit=20` on the `jira_get_issue` call to cap comment volume. The `comment` field **must** be explicitly included in the `fields` parameter for the API to return comments.

This is the full field set required by all analysis skills. Fetched once per issue at the start of processing, used for the duration of that issue's pipeline, then no longer needed.

### Procedure

#### Step 1: Fetch and Initialize

1. Use the Fetch capability with the Target JQL above and the **list fields**. Fetch **all pages** of results.
2. Build a **verified inventory**: extract every issue key and summary from every page of results. Read the entire response for each page -- do not skip or skim sections of large responses. Verify the inventory count matches the total returned by the API. If they don't match, re-read the search results until they do.
3. If there are no matching issues, report "No untriaged issues found" and stop.
4. Choose the operations file name per § Operations File Path (check for existing files, append `_(N)` if needed). Create the file with the **complete** initial skeleton — `issueCount` and `issues` are populated now, not incrementally:
   ```json
   {
     "metadata": {
       "generated": "<today's date>",
       "query": "<the JQL used>",
       "issueCount": <total issues from verified inventory>
     },
     "issues": {
       "<every issue key>": "<summary from inventory>",
       ...
     },
     "operations": []
   }
   ```
   `issueCount` is set to the total number of issues in the verified inventory and **never changes** after this point. The `issues` map contains **every** issue from the query result with its summary. This persists the authoritative inventory to disk before any processing begins — if context compacts, the file is the source of truth.
5. Report the verified issue count: "Found N untriaged issues (verified). Processing one at a time..." If the user opted into sub-agent delegation, add: "Using sub-agent delegation (think deep)." If the user opted into transitions, add: "Transitions enabled (New → Backlog)." If they did not, add: "Transitions disabled (issues remain in New)."

#### Step 2: Process Each Issue

**Delegation check:** If the user opted into sub-agent delegation ("think deep"), use the sequential dispatch pattern from § Sub-Agent Delegation. The coordinator dispatches one sub-agent per issue using the prompt template (setting "Transitions enabled" to yes/no based on whether the user opted in); each sub-agent follows Steps 2.0–2e below autonomously. The rest of this section documents what happens per issue — whether executed inline or by a delegated sub-agent.

Process issues **one at a time** in key-ascending order. Complete all sub-steps for a single issue before moving to the next, then **write that issue's operations to the file on disk** before proceeding. This bounds context usage: only one issue's full details are in working memory at any point, and completed issues are persisted to disk rather than accumulated in session.

For each issue in the fetched set:

**Step 2.0: Fetch issue details.** Call `jira_get_issue` with the **detail fields** for this single issue. This loads the description, reporter, severity, blocked state, issue links, and other fields needed by the analysis pipeline. Only this one issue's details are in context at a time.

Then perform sub-steps 2a through 2e:

##### Step 2.0a: Template Gate

Template issues are recurring task templates (e.g., "TEMPLATE - Learning Activities", "Nightly build analysis - TEMPLATE") that serve as blueprints for cloning actual work items. They should not be triaged, transitioned, or modified by the pipeline. See `jira-project-reference.md` § Template Issues for detection signals.

**Detection signals** (any one is sufficient):

- Summary contains the word "TEMPLATE" (case-insensitive), typically as a prefix ("TEMPLATE - ...") or suffix ("... - TEMPLATE")
- Labels include a template-related label (e.g., `template`)
- Description consists primarily of placeholder/boilerplate text with fill-in markers (e.g., `[replace this]`, `TODO:`, repeating placeholder sections)

**If detected:** Produce a single `NO_OP` with reason citing the template signal. **Skip Steps 2a–2d entirely** — do not assign Team, run the analysis pipeline, transition, or add `ai-reviewed`. Templates are not work items and should not be touched at all. Proceed directly to Step 2e (write to disk).

```json
{
  "issueKey": "RHOAIENG-12345",
  "action": "NO_OP",
  "params": {},
  "reason": "Template issue — summary contains 'TEMPLATE'; not a real work item"
}
```

##### Step 2a: Team Gate

This is the entry gate. Full Triage only processes issues that belong to the **RHOAI Dashboard** program team. The `component = "AI Core Dashboard"` JQL filter only ensures **that component appears on the issue**; it does **not** mean the dashboard team owns the work (issues may have **multiple** components for relationship tracking). This step evaluates Jira **Components**, labels, and description together.

**Hard rule — no triage for other teams:** If you conclude the issue is **owned by or belongs to another program team** (not RHOAI Dashboard), **stop for this issue immediately**. Do **not** run Step 2b (analysis pipeline) or Step 2c–2d (transition and finalize). Do **not** emit operations meant to dashboard-triage a non-dashboard issue (including type, priority, area, scrum, blockers, or comments). Report the issue as skipped with a one-line reason. The Dashboard triage skills are not a substitute for the owning team's intake.

**Read first:** `jira-project-reference.md` § **When *not* to treat an issue as dashboard-owned (team gate)** for multi-component handling, labels outside `dashboard-area-*`, and descriptions dominated by backend/API/automation vs dashboard UI.

1. **Team field set to a non-dashboard team:** If the Team field (`customfield_10001`) is set to **any value other than** RHOAI Dashboard (see `jira-project-reference.md` § Project Constants), **skip this issue** -- the issue is already attributed elsewhere; do not override Team to pull it into dashboard triage. Produce a `NO_OP` with reason (e.g., "Team already set to {team name} — not dashboard-owned"). (This case is rare when using the default Full Triage JQL, but can appear if the issue set came from a custom query.)
2. **Strong "not dashboard" composite (apply before positive evidence):** If **all** of the following hold, **skip** — do not assign Team, do not run 2b–2d. This applies **even if** Team is already RHOAI Dashboard (mis-attribution); do not emit dashboard operations. See **Skip outcome** below for whether to emit `ADD_LABEL Cross-Team` or `NO_OP`.
   - The issue has **more than one** Jira component and at least one component is **not** `AI Core Dashboard`; **and**
   - Labels suggest **another subsystem, CI/pipeline, or team-local categorization** (not `dashboard-area-*`); infer from wording — do **not** rely on a hardcoded list of product names; **and**
   - The description is dominated by **backend/API or contract-test/automation** (e.g. service error codes, OpenAPI/spec mismatch, cluster test jobs, automated tests hitting a service) with **no** dashboard UI, PatternFly, or `opendatahub-io/odh-dashboard` repo/BFF scope.  
   *Pattern:* secondary component points at a non-UI service or platform; narrative never ties work to dashboard delivery — **skip**.
3. **Team already set to dashboard:** If the issue was **not** skipped in step 2 and the Team field is already set to RHOAI Dashboard, the issue passes the gate. Proceed to Step 2b.
4. **Team empty -- evaluate content:** Read components, summary, description, and labels. Look for positive evidence that this is a dashboard team issue:
   - **Dashboard area identifiable:** The issue's content maps to a known `dashboard-area-*` (see `jira-project-reference.md` § Content Signals). This is the strongest signal -- if you can identify which area of the dashboard is affected, it belongs to the dashboard team.
   - **UI / frontend references:** Description mentions a web UI change, page, form, table, modal, sidebar, or other interface element in the dashboard.
   - **BFF / Node.js backend references:** Description mentions the dashboard's backend-for-frontend layer, Express routes, or Node.js API endpoints.
   - **Dashboard-specific terms:** References to PatternFly components, dashboard routes, dashboard configuration, or dashboard-specific Kubernetes resources (OdhDashboardConfig, AcceleratorProfile, etc.).
5. **Confirmed dashboard issue:** If positive evidence is found and the Team field is empty, produce a SET_FIELDS operation to assign the team, then proceed to Step 2b:
   ```json
   {
     "issueKey": "RHOAIENG-12345",
     "summary": "Issue title",
     "action": "SET_FIELDS",
     "params": { "fields": { "customfield_10001": "ec74d716-af36-4b3c-950f-f79213d08f71-1809" } },
     "reason": "<one-sentence citing the positive signal, e.g., 'Model serving deployment wizard UI — dashboard-area-model-serving'>"
   }
   ```
6. **Not a dashboard issue (including "clearly another team's work"):** If no positive dashboard evidence is found, **or** content clearly indicates ownership outside the dashboard (e.g., operator-only, unrelated product surface, backend service with no UI/BFF/dashboard scope per gate criteria, or § **When *not* to treat an issue as dashboard-owned** applied), **skip this issue** -- do not run the analysis pipeline. See **Skip outcome** below for whether to emit `ADD_LABEL Cross-Team` or `NO_OP`. Proceed to Step 2e to write the operation to disk. Move to the next issue.

**Skip outcome — `Cross-Team` label vs `NO_OP`:**

When the team gate determines the issue is not dashboard-owned (items 2 or 6), the output depends on whether the AI Core Dashboard component is **legitimately** on the issue:

- **Component is legitimate → `ADD_COMMENT` + `ADD_LABEL Cross-Team`:** The other component corresponds to a service the dashboard **consumes through a package or BFF** in this repo (e.g., `AI Evaluations` → `packages/eval-hub/`, `Model Registry` → `packages/model-registry/`). The AI Core Dashboard component correctly reflects the dashboard's integration interest — it should stay. Apply `Cross-Team` to acknowledge cross-component coordination and exclude the issue from future dashboard triage queries. The label signals that the work belongs to the other component's team while the dashboard has a stake.

  Produce two operations (comment before label per canonical ordering):

  1. **`ADD_COMMENT`** explaining the routing decision — why the issue is not dashboard-owned, which component/team owns the work, and why the AI Core Dashboard component is legitimate (the dashboard package/BFF that consumes the service). This is the only change triage makes to the issue, so the comment is the sole record of the decision. Follow the `### AI Triage` header and comment visibility rules.
  2. **`ADD_LABEL Cross-Team`** to exclude the issue from future dashboard triage queries.

  ```json
  {
    "issueKey": "RHOAIENG-12345",
    "action": "ADD_COMMENT",
    "params": { "comment": "### AI Triage\n\nThis issue is owned by the **{owning component}** team. The AI Core Dashboard component is valid — the dashboard consumes this service through `{dashboard package/BFF path}` — but the described work ({brief description of why it's not dashboard scope}) does not involve the dashboard UI or BFF.\n\nLabeled `Cross-Team` to reflect the cross-component relationship." },
    "reason": "<one-sentence summary of the routing decision>"
  },
  {
    "issueKey": "RHOAIENG-12345",
    "action": "ADD_LABEL",
    "params": { "labels": ["Cross-Team"] },
    "reason": "<cite the dashboard package/BFF that consumes the service, why the component is valid, and which other component owns the work>"
  }
  ```
- **Component is incorrect or incidental → `NO_OP`:** The dashboard has no package, BFF, or integration relationship with the other component. The AI Core Dashboard component is likely a mis-filing or cross-reference. Produce a `NO_OP` with reason (e.g., "Not a dashboard issue — operator-only component with no UI/BFF scope").

See `jira-project-reference.md` § Project Constants for the Team field ID and value.

##### Step 2b: Analysis Pipeline

Run the analysis skills in order **only for issues that passed Step 2a**. Each skill reads the issue data already in session and produces operations. **Read each skill's SKILL.md** before executing it.

If during Step 2b you determine the issue belongs to **another team** (not RHOAI Dashboard), **stop the pipeline for this issue**: do not run remaining analysis skills, do not run Step 2c or 2d, and **discard any operations already drafted for it in this run**. Produce a single `NO_OP` with reason (e.g., "Late team-gate: not a dashboard issue — {reason}") and write it to the file in Step 2e. Step 2a should prevent most cases; this catches late realizations.

**Pipeline order:**

| Order | Skill | Path | Why this order |
|---|---|---|---|
| 1 | validate-issue-type | `../jira-validate-issue-type/SKILL.md` | May change issue type and **Activity Type** (`customfield_10464`) together. Downstream skills should use the **proposed** type. **Cypress/CI flake Tasks** are not promoted to Bug (see `jira-project-reference.md` § Issue Type Classification Criteria) |
| 2 | validate-description | `../jira-validate-description/SKILL.md` | Checks description completeness. May add `needs-info`. Runs before priority/severity because a missing description limits severity assessment confidence |
| 3 | validate-priority-severity | `../jira-validate-priority-severity/SKILL.md` | Bugs only. Assesses severity from description content and enforces the severity-to-priority floor |
| 4 | evaluate-blockers (Tag mode) | `../jira-evaluate-blockers/SKILL.md` | Checks for blocking conditions, needs-\* labels, and dependency links. Runs after earlier skills that may have changed the type or flagged missing info |
| 5 | validate-area-label (Tag mode) | `../jira-validate-area-label/SKILL.md` | Assigns `dashboard-area-*` labels based on multi-signal analysis. Runs after blockers because it benefits from the corrected issue type and enriched context from earlier skills. Area labels are independent of blocking state. |
| 6 | assign-scrum-team | `../jira-assign-scrum-team/SKILL.md` | Maps area labels to a scrum team label. Runs after area labels are assigned so it can use proposed labels as input. |

**Important:** When validate-issue-type produces a type change for an issue (e.g., Story → Bug), downstream skills must use the **proposed** type, not the original. For example, if an issue is reclassified from Story to Bug, validate-priority-severity should evaluate it as a bug even though the type hasn't been changed in Jira yet. The same applies to **Activity Type** when emitted in the same `SET_FIELDS` batch — treat the proposed Activity value as the intended program classification after Apply.

##### Step 2c: Status Transition (Opt-In)

**By default, Full Triage does NOT transition issues from New to Backlog.** Issues remain in New after triage so a human can review the AI triage results before moving them to the backlog. This step is **skipped entirely** unless the user explicitly opts in.

**Opt-in triggers** (user must include one of these phrases):
- "triage and transition" / "triage with transitions"
- "move to backlog" / "transition to backlog"
- "auto-transition"

When the user does not opt in, skip this step — produce no TRANSITION operations. All other triage steps (type validation, description, priority/severity, blockers, area labels, scrum team, `ai-reviewed`) still run normally.

**When opted in**, decide whether **this issue** should be transitioned from New to Backlog or left in New.

**Transition to Backlog** if the issue has **none** of the following blocking signals in its accumulated operations:

- `ADD_LABEL` with any `needs-*` label (`needs-info`, `needs-ux`, `needs-pm`, `needs-advisor`)
- `LINK_BLOCKED_BY` (dependency on another issue)
- `SET_FIELDS` setting the Blocked field to True (`customfield_10517`)
- `ADD_LABEL` with `feature-request` (requires RFE/epic handling before backlog)

**Leave in New** if any of the above are present. The issue needs input or resolution before it is ready for the backlog.

If the issue qualifies, produce a TRANSITION operation:

```json
{
  "issueKey": "RHOAIENG-12345",
  "summary": "Issue title",
  "action": "TRANSITION",
  "params": { "transitionName": "Backlog" },
  "reason": "Triage complete, no blocking conditions — ready for backlog"
}
```

##### Step 2d: Finalize

Add the `ai-reviewed` label as the final operation for this issue. This is a **passive marker** for human reference and reporting — no skill, query, or JQL filter depends on this label.

```json
{
  "issueKey": "RHOAIENG-12345",
  "summary": "Issue title",
  "action": "ADD_LABEL",
  "params": { "labels": ["ai-reviewed"] },
  "reason": "Marking as processed by AI triage pipeline"
}
```

This label is added to **every** issue in the query result — regardless of what other operations were produced, whether the issue was transitioned, or whether the issue was skipped at the team gate — **except template issues** (detected at Step 2.0a), which receive no operations at all. For non-template `NO_OP` issues, `ai-reviewed` prevents reprocessing in future triage runs. If the label is already present, skip the operation.

**Per-issue operation order:** The complete set of operations for this issue is ordered as:

1. **SET_FIELDS Team** (from Step 2a, if Team was empty)
2. **Analysis operations** (from Step 2b, skills 1-6) — or **`NO_OP`** if skipped at gate / no changes needed
3. **TRANSITION to Backlog** (from Step 2c, only if user opted in to transitions and no blocking signals)
4. **ADD_LABEL `ai-reviewed`** (this step — always, unless already present)

##### Step 2e: Write to Disk and Report

After completing all sub-steps for this issue, **immediately persist its operations to the file** on disk:

1. Read the current operations file from disk
2. Append this issue's operations to the `operations` array (including `NO_OP` for skipped issues)
3. Write the updated file back to disk

The `issues` map and `metadata.issueCount` are already populated from Step 1 — do not modify them here.

**Every issue must produce at least one operation.** If the issue passed the full pipeline, it will have analysis operations + `ai-reviewed` + possibly a TRANSITION (only if the user opted in to transitions). If the analysis produced no changes (everything already correct), it will have `NO_OP` + `ai-reviewed`. If the issue was skipped at the team gate (Step 2a) or during analysis (Step 2b late realization), it will have `NO_OP` + `ai-reviewed`. If the issue was detected as a **template** (Step 2.0a), it will have only `NO_OP` — no `ai-reviewed`, no other operations. This ensures the operations file accounts for every issue in the query result.

Then report a one-line progress summary to the user:

```text
[3/9] RHOAIENG-12345 -- Widget crashes on save: type OK, severity=Moderate, priority=Major, area=model-serving, scrum=Zaffre
```

or when transitions are opted in and the issue qualifies:

```text
[3/9] RHOAIENG-12345 -- Widget crashes on save: type OK, severity=Moderate, priority=Major, area=model-serving, scrum=Zaffre → Backlog
```

or for skipped issues:

```text
[4/9] RHOAIENG-12346 -- Operator webhook validation error: skipped (not a dashboard issue)
```

After writing, move to the next issue. The completed issue's description and detailed field data are no longer needed in working memory.

#### Step 3: Apply

The operations file was built incrementally during Step 2 — it is already on disk with all issues' operations and the root `issues` map. No assembly step is needed.

Pass the file path to the Apply capability. Apply defaults to **dry-run mode**: it reads the file, validates, presents the summary, and stops. The user reviews the output and then explicitly applies from file when ready.

If the user requested immediate execution (e.g., "triage and apply"), Apply runs in execute mode instead: read file, validate, summarize, confirm, execute, and annotate results in-place.

The dry-run summary groups all operations by issue key. The user reviews the full picture and then approves or aborts the entire batch.

### Full Triage Example Flow

**Default (no transitions):**

```text
User: "Triage new issues"

1. Fetch (lightweight) + Initialize:
   9 issues in New status. Operations file created at
   .artifacts/triage/operations-2026-03-26.json
   "Found 9 untriaged issues. Processing one at a time..."

2. Process each issue (fetch details → analyze → write to disk):

   [1/9] RHOAIENG-12340 -- Widget crashes on save
     2.0 Fetch full details (description, reporter, etc.)
     2.0a Template gate: not a template → continue
     2a. Team gate: Team empty → content confirms dashboard → SET_FIELDS team
     2b. Pipeline: type OK → description OK → severity=Moderate, priority=Major
         → no blockers → area=model-serving → scrum=Zaffre
     2c. Skipped (transitions not requested)
     2d. ADD_LABEL ai-reviewed
     2e. Write 5 operations to file
     → "type OK, severity=Moderate, priority=Major, area=model-serving, scrum=Zaffre"

   [2/9] RHOAIENG-12341 -- Pipeline run table wrong status
     2.0 Fetch full details
     2a. Team gate: Team empty → content confirms dashboard → SET_FIELDS team
     2b. Pipeline: type Story→Bug → description incomplete (ADD_COMMENT + needs-info)
         → skip severity (needs-info) → needs-info blocker → area=pipelines → scrum=Razzmatazz
     2c. Skipped (transitions not requested)
     2d. ADD_LABEL ai-reviewed
     2e. Write 7 operations to file
     → "Story→Bug, needs-info, area=pipelines, scrum=Razzmatazz (blocked)"

   ... (6 more issues processed the same way) ...

   [9/9] RHOAIENG-12348 -- Operator webhook validation error
     2.0 Fetch full details
     2a. Team gate: no dashboard evidence → NO_OP
     2e. Write NO_OP to file
     → "skipped (not a dashboard issue)"

   Summary: 8 processed, 1 skipped (NO_OP)
   Operations file: .artifacts/triage/operations-2026-03-26.json

3. Apply (dry-run):
   Read operations file, validate, present summary:

     RHOAIENG-12340 -- Widget crashes on save
       - Team = RHOAI Dashboard
       - Severity = Moderate, Priority = Major
       - +`dashboard-area-model-serving`, +`dashboard-zaffre-scrum`
       - +`ai-reviewed`

     RHOAIENG-12341 -- Pipeline run table wrong status
       - Team = RHOAI Dashboard
       - **Story → Bug**, Activity Type = Tech Debt & Quality
       - Comment to @reporter requesting repro steps
       - +`needs-info`, +`dashboard-area-pipelines`, +`dashboard-razzmatazz-scrum`
       - +`ai-reviewed`

     ...

     RHOAIENG-12348 -- Operator webhook validation error
       - NO_OP: Not a dashboard issue — operator-only component with no UI/BFF scope

   "Review and apply with: apply operations from
    .artifacts/triage/operations-2026-03-26.json"

User: "Apply operations from .artifacts/triage/operations-2026-03-26.json"
   → Validate, summarize, confirm, execute, post triage comments, report results
```

**With transitions (opt-in):**

```text
User: "Triage new issues and transition to backlog"

   (same as above, but Step 2c is active)

   [1/9] RHOAIENG-12340 -- Widget crashes on save
     ...
     2c. No blocking signals → TRANSITION to Backlog
     ...
     → "type OK, severity=Moderate, priority=Major, area=model-serving, scrum=Zaffre → Backlog"

   [2/9] RHOAIENG-12341 -- Pipeline run table wrong status
     ...
     2c. Has needs-info → remain in New
     ...
     → "Story→Bug, needs-info, area=pipelines, scrum=Razzmatazz (blocked)"
```

---

## What This Skill Does NOT Cover

- **Analysis logic** -- deciding what to do with each issue belongs in the separate analysis skills listed in the pipeline above
- **Issue creation** -- use `.claude/rules/jira-creation.md` for creating new issues
- **Reporting / dashboards** -- the agent presents results directly; no HTML report generation

## Reference Files

| File | Purpose |
|---|---|
| [`persona.md`](persona.md) | Execution protocol: thoroughness, verification, no assumptions -- applies to all triage skills |
| [`jira-project-reference.md`](jira-project-reference.md) | All Jira-specific values (project constants, field IDs, labels, mappings) |
| [`operations-schema.json`](operations-schema.json) | Formal JSON Schema for the operations format |
