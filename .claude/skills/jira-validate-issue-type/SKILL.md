---
name: jira-validate-issue-type
description: Validate whether issues have the correct type (Bug, Story, Task), align Activity Type with classification, and label standalone stories as enhancement.
---

# Validate Issue Type

Analysis skill for the [jira-triage infrastructure](../jira-triage/SKILL.md). Evaluates issues to determine whether the assigned type (Bug, Story, Task) matches the content, aligns **Activity Type** with the resolved classification, and produces SET_FIELDS and ADD_LABEL operations that flow into the Apply capability. Issues that are too large for a standalone Story are left as-is for a human to decide next steps.

Implements [RHOAIENG-52420](https://redhat.atlassian.net/browse/RHOAIENG-52420).

**Before running this skill, read [`persona.md`](../jira-triage/persona.md) and [`jira-project-reference.md`](../jira-triage/jira-project-reference.md).** The persona defines the execution protocol (thoroughness, verification, no assumptions). The project reference provides issue type classification criteria, classification label definitions, and field IDs.

## Dashboard ownership prerequisite

This skill applies only to issues **owned by the RHOAI Dashboard** program team. **Full Triage:** run only after `jira-triage` Step 2a passes. If the issue **belongs to another team** (or the Jira Team field is not Dashboard and was not cleared by the gate), produce **no operations** for that issue. See `jira-project-reference.md` § Dashboard ownership (triage scope).

## Scope

All issue types. Every issue in the input set is evaluated.

## Required Fields

When fetching issues (via the triage Fetch capability or directly), request these fields:

| Field | ID | Why |
|---|---|---|
| Issue type | `issuetype` | Current type to validate |
| Activity Type | `customfield_10464` | Strong classification signal; set or correct alongside issue type |
| Summary | `summary` | Content analysis + readability in output |
| Description | `description` | Content analysis for classification |
| Labels | `labels` | Check for existing classification labels |

## Activity Type as a classification signal

Read `jira-project-reference.md` § **Activity Type** for option names and semantics. Jira values are **exactly**: `Tech Debt & Quality`, `Learning & Enablement`, `New Features`.

**Reporter value is a hint, not ground truth.** Always validate against summary and description. When Activity Type is **already set** and **matches** what the text supports, treat that as **high confidence** — require **clearer contradictory evidence** than you would on an unset field before changing issue type. When Activity Type **conflicts** with content (e.g. **New Features** on a reproducible defect narrative), **trust content** and fix both issue type and Activity Type together.

**Mapping after you resolve issue type** (apply the checks below first; Activity informs tie-breaks, not a bypass):

| Resolved issue type | Activity Type to set |
|---|---|
| **Bug** | `Tech Debt & Quality` |
| **Story** (Path A — qualifies as Story, including with `enhancement`) | `New Features` |
| **Story** left as-is (Path B — too large, type unchanged) | `New Features` if Activity Type is empty and the work is user-facing; otherwise leave unchanged |
| **Task** | `Learning & Enablement` if enablement/onboarding/training is the primary purpose; else `Tech Debt & Quality` (default for refactors, CI, tests, flake fixes, dev docs) |

**Constraints from the program field:** **Learning & Enablement** implies **Task**; **New Features** implies **Story**. If the reporter set **New Features** but the issue is clearly a Bug or Task by content, reclassify the type and set Activity accordingly. If **Learning & Enablement** is set but the issue is user-facing enhancement work that should be a Story, reclassify to Story + `New Features`.

**Emitting operations:** Prefer a **single** `SET_FIELDS` per issue that includes every field being updated. When you change `issuetype`, include `customfield_10464` in the **same** `params.fields` object whenever Activity Type should change or was empty. Use separate `SET_FIELDS` only when Activity alone needs correction.

## Checks

Process each issue through the checks below in order. The first match determines the classification. Each check produces zero or more operations.

### Check 1: Bug misclassification

**Condition:** Content describes a defect in existing functionality but the type is not Bug.

**Procedure:**

1. Read the issue's summary and description. Consider **Activity Type**: **New Features** with defect-like content is a strong mismatch signal; **Tech Debt & Quality** aligns with bugs. If Activity is unset but text is clearly a defect, classify as Bug regardless.
2. **Cypress / CI flake — do not promote to Bug:** If the type is **Task** or **Story** and the issue matches the **flaky Cypress / CI tests (keep Task)** exception in `jira-project-reference.md` § Issue Type Classification Criteria (flake wording, `dashboard-cypress-flake` or similar labels, spec-focused intermittent failure without a user-visible product defect narrative), produce **no** operation here and **continue to Check 2**. Triage must **not** reclassify these as **Bug** merely because a test fails or times out; **Check 2** may reclassify a misfiled **Story** to **Task**.
3. Otherwise evaluate against the Bug signals in `jira-project-reference.md` § Issue Type Classification Criteria:
   - Regression, broken behavior, error/crash, incorrect output, data loss
   - Security vulnerability in existing code
   - Behavior contradicting documented or expected functionality
4. If the content clearly describes a defect and the type is not Bug, produce a SET_FIELDS operation that sets **Bug** and **Activity Type** `Tech Debt & Quality` (unless Activity is already correct — then omit `customfield_10464`):
   ```json
   {
     "action": "SET_FIELDS",
     "params": {
       "fields": {
         "issuetype": { "name": "Bug" },
         "customfield_10464": { "value": "Tech Debt & Quality" }
       }
     },
     "reason": "<one-sentence justification citing the defect signal; mention Activity if correcting a prior New Features>"
   }
   ```
5. Stop processing further checks for this issue.

### Check 2: Task misclassification

**Condition:** Content describes non-user-facing technical work but the type is not Task.

**Procedure:**

1. Read the issue's summary and description. **Activity Type:** **Learning & Enablement** strongly supports Task — give it extra weight when the text matches enablement/training. **New Features** with purely internal work is a mismatch; set Activity to `Tech Debt & Quality` or `Learning & Enablement` per content when you set Task.
2. Evaluate against the Task signals in `jira-project-reference.md` § Issue Type Classification Criteria:
   - Refactoring, code cleanup, infrastructure, CI/CD, build changes
   - Dev tooling, test improvements, documentation updates, dependency updates
3. If the content clearly describes non-user-facing work and the type is not Task, produce a SET_FIELDS operation with **Task** and the appropriate Activity Type (`Learning & Enablement` vs `Tech Debt & Quality` per `jira-project-reference.md` § Activity Type):
   ```json
   {
     "action": "SET_FIELDS",
     "params": {
       "fields": {
         "issuetype": { "name": "Task" },
         "customfield_10464": { "value": "Tech Debt & Quality" }
       }
     },
     "reason": "<one-sentence justification citing the technical work signal and, if non-obvious, why Tech Debt & Quality vs Learning & Enablement>"
   }
   ```
4. Stop processing further checks for this issue.

### Check 3: Story qualification

**Condition:** Content describes user-facing work (not a Bug or Task).

Evaluate whether the work qualifies as a Story. Use the criteria in `jira-project-reference.md` § Issue Type Classification Criteria → "Is it user-facing work?"

#### Path A: Qualifies as a Story

The work meets ALL of:
- Relevant to an existing feature (not a net-new product area)
- Minor in scope (single component, limited UI surface, no new pages/sections)
- Clear enough to act on without an epic or product discovery

**Positive signals** that an issue qualifies as a Story (not sufficient alone, but strengthen the case):
- Triggered by or linked to a RHOAIUX issue (UX department work with design direction)
- Labeled `ux-debt` (small UX improvements with known scope)
- Has Figma/design links, specific component references, or clear acceptance criteria

**Procedure:**

1. If the type is not already Story, produce a SET_FIELDS operation with **Story** and **Activity Type** `New Features` when Activity is unset or wrong (omit `customfield_10464` only if already `New Features`):
   ```json
   {
     "action": "SET_FIELDS",
     "params": {
       "fields": {
         "issuetype": { "name": "Story" },
         "customfield_10464": { "value": "New Features" }
       }
     },
     "reason": "<see reason text requirements below>"
   }
   ```
2. If the type is already Story but Activity Type is empty or incorrect, produce a SET_FIELDS with only `customfield_10464` → `New Features` (or merge with other fields if emitted in the same batch).
3. If the `enhancement` label is not already present, produce an ADD_LABEL operation:
   ```json
   {
     "action": "ADD_LABEL",
     "params": { "labels": ["enhancement"] },
     "reason": "<see reason text requirements below>"
   }
   ```

**Reason text for Story classifications** must explain why the issue qualifies as a standalone Story. Cover these points in 2-3 sentences:
- What existing feature this extends (not net-new)
- Why the scope is minor (what is the bounded UI surface)
- What makes it clear enough to act on (design refs, explicit AC, backend already exists, etc.)

#### Path B: Too large for a Story — leave as-is

Any of the following disqualify the issue from being a Story:
- Introduces a net-new product area, page, or section
- Requires significant workflow changes across multiple components
- Needs new integrations or backend capabilities that don't exist yet
- Scope is unclear or requires product discovery
- Multi-sprint effort that should be tracked under an epic
- No obvious fit with any existing feature area

**Procedure:**

1. Do NOT change the issue type or add labels. A human decides next steps for these issues.
2. If the type is **Story** and Activity Type is empty, produce `SET_FIELDS` with `customfield_10464` → `New Features` so the card reflects user-facing scope. Otherwise produce no operations.

### Already correct

If the issue type matches the content, required labels are satisfied, and Activity Type matches the § Activity Type mapping for that type, produce **no** operations.

**Backfill / correction only:** If the issue type is already correct but Activity Type is **empty** or **wrong** (e.g. Story with `Tech Debt & Quality`), produce a single `SET_FIELDS` updating only `customfield_10464` — no duplicate issue-type change.

## Content-Based Assessment Guidelines

- **Read the full description.** The summary alone is often insufficient -- a summary like "Add export button" could be a minor Story or a major feature depending on the description.
- **Use Activity Type with the confidence rules in § Activity Type as a classification signal** — stronger prior when set and consistent; override when it conflicts with clear content.
- **Do not over-classify.** Only produce operations when there is clear evidence of a mismatch. If the type is plausible, leave it alone.
- **When ambiguous between Story (Path A) and too-large (Path B), lean toward Path B (leave as-is).** It is safer to leave a large issue for human review than to prematurely classify it as a small Story.
- **UX department issues** with clear scope and design direction typically qualify as Stories. Look for Figma/design links, specific component references, or clear acceptance criteria as positive signals. Issues triggered by RHOAIUX issues or labeled `ux-debt` are often standalone stories because they represent scoped UX improvements with known design direction.
- **Story classification reasons must be detailed.** Unlike other checks where one sentence suffices, Story qualification is the highest-judgment call in this skill. The reason must explain which existing feature is being extended, why the scope is minor, and what evidence makes it actionable. See the reason text requirements under Path A.
- **Do not evaluate priority or severity.** Those are handled by the validate-priority-severity skill.

## Output

Output MUST validate against [`operations-schema.json`](../jira-triage/operations-schema.json). This skill emits `SET_FIELDS` and `ADD_LABEL` operations.

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

The output flows into the Apply capability of the triage infrastructure. When invoked standalone (outside Full Triage), Apply defaults to **dry-run mode**: it validates, presents the summary, writes the operations file to `.artifacts/triage/`, and stops. The user reviews the file and explicitly applies it later. To execute immediately, the user must request it (e.g., "validate issue types and apply").

## Examples

### Type change: Story filed as Bug

Given issue RHOAIENG-55000 ("Add dark mode toggle to cluster settings") with type=Bug:

```json
{
  "metadata": {
    "generated": "2026-03-25T10:00:00Z",
    "query": "project = RHOAIENG AND component = \"AI Core Dashboard\" AND status = New",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-55000",
      "summary": "Add dark mode toggle to cluster settings",
      "action": "SET_FIELDS",
      "params": {
        "fields": {
          "issuetype": { "name": "Story" },
          "customfield_10464": { "value": "New Features" }
        }
      },
      "reason": "Describes a minor UI addition to existing cluster settings page, not a defect"
    },
    {
      "issueKey": "RHOAIENG-55000",
      "summary": "Add dark mode toggle to cluster settings",
      "action": "ADD_LABEL",
      "params": { "labels": ["enhancement"] },
      "reason": "Standalone user-facing enhancement"
    }
  ]
}
```

### Type change: Bug filed as Story

Given issue RHOAIENG-55002 ("Pipeline run table shows wrong status after cancellation") with type=Story:

```json
{
  "metadata": {
    "generated": "2026-03-25T10:00:00Z",
    "query": "project = RHOAIENG AND component = \"AI Core Dashboard\" AND status = New",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-55002",
      "summary": "Pipeline run table shows wrong status after cancellation",
      "action": "SET_FIELDS",
      "params": {
        "fields": {
          "issuetype": { "name": "Bug" },
          "customfield_10464": { "value": "Tech Debt & Quality" }
        }
      },
      "reason": "Describes incorrect display behavior after cancellation — defect in existing pipeline run table; Activity aligned to Tech Debt & Quality"
    }
  ]
}
```
