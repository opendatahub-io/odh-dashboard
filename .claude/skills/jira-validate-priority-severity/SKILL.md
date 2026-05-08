---
name: jira-validate-priority-severity
description: Analyze issues for missing or incorrect priority (all types) and severity (bugs only), producing SET_FIELDS operations in the standard triage format.
---

# Validate Priority & Severity

Analysis skill for the [jira-triage infrastructure](../jira-triage/SKILL.md). Evaluates all issue types for missing or misaligned priority, and bugs specifically for severity, producing SET_FIELDS operations that flow into the Apply capability.

Implements [RHOAIENG-52416](https://redhat.atlassian.net/browse/RHOAIENG-52416).

**Before running this skill, read [`persona.md`](../jira-triage/persona.md) and [`jira-project-reference.md`](../jira-triage/jira-project-reference.md).** The persona defines the execution protocol (thoroughness, verification, no assumptions). The project reference provides severity criteria (bugs), priority criteria (all types), the severity-to-priority floor (bugs), and the severity field ID.

## Dashboard ownership prerequisite

This skill applies only to issues **owned by the RHOAI Dashboard** program team. **Full Triage:** run only after `jira-triage` Step 2a passes. If the issue **belongs to another team**, produce **no operations** for that issue. See `jira-project-reference.md` § Dashboard ownership (triage scope).

## Scope

**All issue types.** Severity assessment is bugs only. Priority assessment applies to all types with different rules per type:

| Type | Severity | Priority |
|---|---|---|
| Bug | Full assessment (Checks 1-3) | Content-based, full scale, severity floor applies (raise or lower) |
| Task | Skip | Content-based, full scale; **respect existing — raise only, never lower** |
| Story | Skip | Default Normal, promote to Major on urgency signals only; respect existing |

## Required Fields

When fetching issues (via the triage Fetch capability or directly), request these fields:

| Field | ID | Why |
|---|---|---|
| Issue type | `issuetype` | Determines which checks apply |
| Priority | `priority` | Priority assessment for all types |
| Severity | `customfield_10840` | Severity checks (bugs only) |
| Description | `description` | Content-based assessment |

**Comments (recommended):** If the issue data includes a `comments` field, use them for deeper signal. If comments are not present in the issue data, that means they **were not fetched** — it does NOT mean zero comments exist. When running standalone (not via Full Triage), fetch comments via per-issue `jira_get_issue` calls with `fields=comment` and `comment_limit=20` when the added signal justifies the cost (e.g., small targeted sets, or ambiguous descriptions where comment context could change the assessment).

## Bug Pre-Check: Nightly E2E Test Failures

Before running severity/priority checks on a bug, check whether it is a **nightly E2E test failure** (see `jira-project-reference.md` § Bug Priority, nightly E2E exception). If the bug has the `cypress_found_bug` label or the summary or description references a nightly job (e.g., `dashboard-e2e-tests`), and a valid priority is already set (not `Undefined`), **respect the reporter's priority** — do not lower it. If priority is missing or `Undefined`, apply normal priority-setting logic. Severity assessment still proceeds normally. Priority cascade from severity (Check 1 step 5, Check 3 step 5) may still **raise** priority above the reporter's value if the severity floor demands it, but never lower.

## Bug Checks

Process each bug through three checks in order. Each check produces zero or more SET_FIELDS operations.

### Check 1: Severity missing

**Condition:** severity (`customfield_10840`) is null or empty.

**Procedure:**

1. Read the bug's description (and comments if fetched).
2. Evaluate against the severity criteria in `jira-project-reference.md` § Severity. Look for impact signals:
   - Crashes, error screens, data loss → Critical
   - Security concerns, RBAC, performance degradation impeding workflow → Important
   - Silent failures (empty pages, missing data, truncated results, features that quietly stop working without an obvious error) → Important
   - Validation issues, accessibility, functional problems where the failure is visible and a workaround exists → Moderate
   - Cosmetic (alignment, layout, color), micro copy → Low
   - Console output, React warnings → Informational
3. Regressions increase severity but do not automatically make an issue Critical.
4. Produce a SET_FIELDS operation:
   ```json
   {
     "action": "SET_FIELDS",
     "params": { "fields": { "customfield_10840": { "value": "<suggested severity>" } } },
     "reason": "<one-sentence justification citing the impact signal>"
   }
   ```
5. **Cascade to priority:** look up the floor for the suggested severity in `jira-project-reference.md` § Severity-to-priority floor. If the bug's current priority is below that floor, emit an additional SET_FIELDS:
   ```json
   {
     "action": "SET_FIELDS",
     "params": { "fields": { "priority": { "name": "<floor priority>" } } },
     "reason": "Priority raised to floor: <severity> severity requires minimum <priority> priority"
   }
   ```

### Check 2: Severity-to-priority floor violation

**Condition:** severity and priority are both set, and priority is below the floor defined in `jira-project-reference.md` § Severity-to-priority floor.

The floor (for reference -- always read the canonical values from `jira-project-reference.md`):

| Severity | Minimum Priority |
|---|---|
| Critical | Critical |
| Important | Major |
| Moderate | Normal |
| Low | Normal |
| Informational | Minor |

Priority ordering from highest to lowest: Blocker > Critical > Major > Normal > Minor.

**Procedure:**

1. Look up the floor for the bug's current severity.
2. If current priority is below the floor, produce a SET_FIELDS operation:
   ```json
   {
     "action": "SET_FIELDS",
     "params": { "fields": { "priority": { "name": "<floor priority>" } } },
     "reason": "Priority raised to floor: <severity> severity requires minimum <priority> priority"
   }
   ```
3. If priority meets or exceeds the floor, no operation.

**Note:** if Check 3 also fires on the same issue, both checks may produce priority operations based on different severities (Check 2 uses the current severity; Check 3's cascade uses the suggested severity). The dry-run conflict detection in the base infrastructure surfaces this for user review.

### Check 3: Severity content mismatch

**Condition:** severity is set, but the described impact does not match the assigned severity.

**Procedure:**

1. Read the bug's description (and comments if fetched).
2. Evaluate against the severity criteria in `jira-project-reference.md` § Severity, using the same impact signals as Check 1.
3. Compare the assessed severity against the assigned severity.
4. If they match, no operation. If they differ, produce a SET_FIELDS operation:
   ```json
   {
     "action": "SET_FIELDS",
     "params": { "fields": { "customfield_10840": { "value": "<suggested severity>" } } },
     "reason": "<one-sentence justification explaining why the current severity is too high/low>"
   }
   ```
5. **Cascade to priority:** same as Check 1 -- evaluate the floor for the suggested severity and emit an additional priority SET_FIELDS if the current priority is below that floor.

## Task Priority Checks

Tasks use the same content-based priority criteria as bugs (see `jira-project-reference.md` § Task Priority). Severity does not apply to tasks. **Key difference from bugs: respect existing task priority.** Task authors typically have context about urgency not captured in the description. When priority is already set, evaluate independently but only raise — do not lower.

### Check T1: Priority missing or Undefined

**Condition:** priority is null, empty, or `Undefined`.

**Procedure:**

1. Read the task's description (and comments if fetched).
2. Evaluate against the priority criteria in `jira-project-reference.md` § Task Priority. Look for urgency signals:
   - Blocks a release or other team → Blocker
   - High-impact, must be resolved soon → Critical
   - Related to active development, recently released features → Major
   - No specific urgency → Normal
   - Low urgency, can wait → Minor
3. Produce a SET_FIELDS operation:
   ```json
   {
     "action": "SET_FIELDS",
     "params": { "fields": { "priority": { "name": "<assessed priority>" } } },
     "reason": "<one-sentence justification citing the urgency signal>"
   }
   ```

### Check T2: Priority raise check (raise only)

**Condition:** priority is set (not Undefined).

**Procedure:**

1. Read the task's description (and comments if fetched).
2. Evaluate against the priority criteria, using the same urgency signals as Check T1.
3. Compare the assessed priority against the assigned priority.
4. If the content supports a **higher** priority than assigned, produce a SET_FIELDS operation:
   ```json
   {
     "action": "SET_FIELDS",
     "params": { "fields": { "priority": { "name": "<assessed priority>" } } },
     "reason": "<one-sentence justification explaining why the current priority should be raised>"
   }
   ```
5. If the assessed priority matches or is **lower** than the assigned priority, **no operation** — respect the existing value.

## Story Priority Checks

Stories use a simplified priority model. See `jira-project-reference.md` § Story Priority for the criteria. Severity does not apply to stories.

### Check S1: Priority missing or Undefined

**Condition:** priority is null, empty, or `Undefined`.

**Procedure:**

1. Read the story's description.
2. Look for urgency signals that warrant Major:
   - Customer-facing pain with no workaround
   - Time-sensitive dependency on an upcoming release
   - Explicitly flagged as urgent by PM or leadership
   - Regression workaround that needs a permanent fix soon
3. If urgency signals are present, set to Major. Otherwise, set to Normal.
4. Produce a SET_FIELDS operation:
   ```json
   {
     "action": "SET_FIELDS",
     "params": { "fields": { "priority": { "name": "<Normal or Major>" } } },
     "reason": "<one-sentence justification>"
   }
   ```

### Respect existing Story priority

If a story already has a valid priority set (anything other than `Undefined`), **do not override it**. The reporter or team may have context that justifies the level. Produce no operations.

**Never set a story above Major.** Blocker and Critical are reserved for bugs and operational issues.

## Content-Based Assessment Guidelines

Severity checks (bugs) and priority checks (all types) require reading issue content. Follow these guidelines:

- **Read the full description.** Look for concrete impact: what breaks, who is affected, is there a workaround.
- **Silent failures are Important.** If the bug causes something to quietly not work — empty pages, missing data, truncated results, features that stop working without an error message — classify as Important. The user may not realize something is wrong, which makes the impact worse than an obvious error.
- **Do not assume workarounds.** Only credit a workaround if the issue description explicitly states one or the workaround is trivially obvious with no security, data, or workflow ramifications. Do not invent workarounds by assuming the user can use a different configuration, skip a feature, or change their deployment — the user may have requirements that make the affected path necessary.
- **If comments are available**, scan them for additional context: customer reports, workaround discoveries, scope clarifications.
- **Do not accept the author's severity/priority claim as fact.** Evaluate independently against the criteria (exception: story priority is respected when already set).
- **Regressions** (something that previously worked) are a factor that may increase severity but do not automatically make an issue Critical.
- **When ambiguous**, lean toward Moderate (the default severity) and Normal (the default priority). Avoid over-escalating based on vague descriptions.
- **Keep reasons concise** -- one sentence citing the specific impact or urgency signal that drives the assessment.

## Output

Output MUST validate against [`operations-schema.json`](../jira-triage/operations-schema.json). This skill emits only `SET_FIELDS` operations.

Wrap the operations in the standard metadata envelope:

```json
{
  "metadata": {
    "generated": "<ISO-8601 timestamp>",
    "query": "<JQL or description of how issues were selected>",
    "issueCount": "<total issues in the evaluated set (static, set from initial query)>"
  },
  "operations": [ ... ]
}
```

The output flows into the Apply capability of the triage infrastructure. When invoked standalone (outside Full Triage), Apply defaults to **dry-run mode**: it validates, presents the summary, writes the operations file to `.artifacts/triage/`, and stops. The user reviews the file and explicitly applies it later. To execute immediately, the user must request it (e.g., "validate priority and apply").

## Examples

### Bug: severity missing, priority cascade

Given a bug RHOAIENG-12345 ("Widget crashes on save") with severity=null, priority=Normal:

```json
{
  "metadata": {
    "generated": "2026-03-25T10:00:00Z",
    "query": "project = RHOAIENG AND component = \"AI Core Dashboard\" AND issuetype = Bug AND Severity is EMPTY",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-12345",
      "summary": "Widget crashes on save",
      "action": "SET_FIELDS",
      "params": { "fields": { "customfield_10840": { "value": "Critical" } } },
      "reason": "Crash on save with no workaround — core workflow completely unusable"
    },
    {
      "issueKey": "RHOAIENG-12345",
      "summary": "Widget crashes on save",
      "action": "SET_FIELDS",
      "params": { "fields": { "priority": { "name": "Critical" } } },
      "reason": "Priority raised to floor: Critical severity requires minimum Critical priority"
    }
  ]
}
```

### Task: priority Undefined

Given a task RHOAIENG-55577 ("Cypress flake in globalDistributedWorkloads.cy.ts") with priority=Major:

Priority is already set and plausible for a test flake — no operations produced.

Given a task RHOAIENG-55600 ("Update webpack config for module federation") with priority=Undefined:

```json
{
  "operations": [
    {
      "issueKey": "RHOAIENG-55600",
      "summary": "Update webpack config for module federation",
      "action": "SET_FIELDS",
      "params": { "fields": { "priority": { "name": "Normal" } } },
      "reason": "Build tooling update with no urgency signal — default priority"
    }
  ]
}
```

### Story: priority Undefined, default to Normal

Given a story RHOAIENG-53778 ("Add helper text for Allowed Org in Admin settings") with priority=Undefined:

```json
{
  "operations": [
    {
      "issueKey": "RHOAIENG-53778",
      "summary": "Add helper text for Allowed Org in Admin settings of model catalog",
      "action": "SET_FIELDS",
      "params": { "fields": { "priority": { "name": "Normal" } } },
      "reason": "UX improvement with no urgency signal — default story priority"
    }
  ]
}
```

### Story: priority Undefined, promoted to Major

Given a story RHOAIENG-55700 ("Add timeout field to deployment wizard — customer workaround") with priority=Undefined and description mentioning customer-facing pain:

```json
{
  "operations": [
    {
      "issueKey": "RHOAIENG-55700",
      "summary": "Add timeout field to deployment wizard — customer workaround",
      "action": "SET_FIELDS",
      "params": { "fields": { "priority": { "name": "Major" } } },
      "reason": "Customer-facing workaround for timeout failures with no alternative — promotes above default"
    }
  ]
}
```

### Story: priority already set — respected

Given a story RHOAIENG-47760 ("Support Timeout in KServe Raw Deployment Wizard") with priority=Critical:

Priority is already set (Critical). Even though stories normally cap at Major, the existing value is respected — the reporter or team may have context. No operations produced.
