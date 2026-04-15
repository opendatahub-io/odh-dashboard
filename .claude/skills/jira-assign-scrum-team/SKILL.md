---
name: jira-assign-scrum-team
description: Assign a scrum team label to issues based on area-to-scrum mapping and team keyword associations, producing ADD_LABEL operations in the standard triage format.
---

# Assign Scrum Team

Analysis skill for the [jira-triage infrastructure](../jira-triage/SKILL.md). Maps area labels to scrum team labels using the Area-to-Scrum Default Mapping, with a keyword-based path for issues without area labels. Produces ADD_LABEL operations that flow into the Apply capability.

**Before running this skill, read [`persona.md`](../jira-triage/persona.md) and [`jira-project-reference.md`](../jira-triage/jira-project-reference.md).** The persona defines the execution protocol (thoroughness, verification, no assumptions). The project reference provides the Area-to-Scrum Default Mapping, Areas without a default team, and Team keyword / feature associations sections.

## Dashboard ownership prerequisite

This skill applies only to issues **owned by the RHOAI Dashboard** program team. **Full Triage:** run only after `jira-triage` Step 2a passes. If the issue **belongs to another team**, produce **no operations** for that issue — do not assign `dashboard-*-scrum` labels for non-dashboard ownership. See `jira-project-reference.md` § Dashboard ownership (triage scope).

## Scope

All issue types processed by the triage pipeline. Every issue in the input set is evaluated.

## Required Fields

When fetching issues (via the triage Fetch capability or directly), request these fields:

| Field | ID | Why |
|---|---|---|
| Summary | `summary` | Readability in output + keyword matching |
| Description | `description` | Keyword matching when no area labels |
| Labels | `labels` | Detect existing scrum and area labels |

## Constraint: Single Scrum Label

An issue must have at most **one** `dashboard-*-scrum` label. This skill never assigns more than one.

## Procedure

For each issue in the input set:

### Step 1: Skip checks

Skip the issue (produce no operations) if it already has any `dashboard-*-scrum` label. The scrum team has already been assigned, either by a human or a prior triage run.

### Step 2: Collect effective area labels

Build the set of area labels for this issue from two sources:

1. **Existing labels**: Any `dashboard-area-*` label already on the issue in Jira.
2. **Proposed labels**: Any `dashboard-area-*` label from ADD_LABEL operations produced by earlier pipeline steps (specifically validate-area-label). These labels have not been applied to Jira yet, but represent the pipeline's best assessment.

The union of these two sources is the **effective area set**.

### Step 3: Resolve scrum team

Follow the resolution path that matches the issue's state:

#### Path A: Area-based resolution (effective area set is non-empty)

1. Build the **mapping set** used for scrum resolution: start from the effective area set (existing + proposed `dashboard-area-*` labels).
2. **Cross-cutting test framework vs feature:** If the mapping set contains **`dashboard-area-cypress`** *and* at least **one other** `dashboard-area-*` label that maps to a **different** team in the Area-to-Scrum Default Mapping table, **remove `dashboard-area-cypress` from the mapping set** for this resolution only. Rationale: `dashboard-area-cypress` reflects shared **test-framework** ownership; a **feature** area identifies **which team owns the scenario under test** — that team gets the scrum label when it disagrees with the Cypress mapping. If removal leaves a single team, produce that scrum label (do not skip solely because the unfiltered set had two teams).
3. **Generic manifests vs feature:** If the mapping set contains **`dashboard-area-manifests`** *and* at least **one other** `dashboard-area-*` label that maps to a **different** team than **Monarch** in the Area-to-Scrum Default Mapping table, **remove `dashboard-area-manifests` from the mapping set** for this resolution only. Rationale: the manifests area label marks **cross-cutting** `manifests/` / install work that defaults to Monarch; a **feature** area (model serving, MaaS, pipelines, etc.) identifies **which team owns deployment assets** for that capability — use that team when it disagrees with the generic manifests mapping. If removal leaves a single team, produce that scrum label. See `jira-project-reference.md` § **Manifests area and scrum routing**.
4. Look up each remaining area label in the Area-to-Scrum Default Mapping table in `jira-project-reference.md`.
5. Collect the set of distinct teams that the areas map to. Areas listed under "Areas without a default team" produce no mapping and are ignored.
6. Evaluate the result:
   - **One team**: All mapped areas agree. Produce an `ADD_LABEL` operation with the corresponding `dashboard-*-scrum` label.
   - **Zero teams**: Every area in the mapped set is unmapped. Skip the issue.
   - **Multiple teams**: The areas map to different scrum teams. Skip the issue.

(Steps 2–3 above are **only** applied for scrum resolution; they do not remove labels from Jira — they adjust which area labels participate in the mapping-set lookup for this issue.)

#### Path B: Keyword-based resolution (no area labels at all)

When the effective area set is empty (no existing or proposed area labels), attempt resolution via the Team keyword / feature associations table in `jira-project-reference.md`.

1. Read the issue's summary and description.
2. Match content against each team's keywords in the associations table.
3. Evaluate the result:
   - **One team matches clearly**: Produce an `ADD_LABEL` operation with the corresponding `dashboard-*-scrum` label.
   - **Multiple teams match** or **no match**: Skip the issue.

Keyword matching follows the same principles as the area-label skill: multi-word phrases match first with higher weight, summary hits weigh more than description hits, and a single generic keyword alone is not sufficient.

## Assessment Guidelines

- **Do not force an assignment.** If the mapping is ambiguous or the keyword match is weak, skip. A skipped scrum assignment is surfaced in the triage summary comment for human review.
- **Area-based resolution is strongly preferred** over keyword-based. Path B exists only as a catch-all for issues that somehow have no area labels after the full pipeline runs.
- **Respect the mapping table.** Do not infer scrum team assignments beyond what the Area-to-Scrum Default Mapping and Team keyword / feature associations tables provide. If the tables don't cover a case, skip.
- **Prefer feature team over framework label for scrum** when Path A drops `dashboard-area-cypress` per the mapping-set rule above; the human-facing backlog owner is the feature team unless the issue is truly Cypress-plumbing work.
- **Prefer feature team over generic manifests for scrum** when Path A drops `dashboard-area-manifests` per step 3; deployment YAML tied to a feature routes to that feature’s team. Generic install-base / shared `manifests/` work with no feature area stays on **Monarch** via the manifests default mapping.
- **Keep reasons concise** -- one sentence citing the area label(s) and the team they map to, or the keyword signal for Path B.

## Output

Output MUST validate against [`operations-schema.json`](../jira-triage/operations-schema.json). This skill emits only `ADD_LABEL` operations.

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

The output flows into the Apply capability of the triage infrastructure. When invoked standalone (outside Full Triage), Apply defaults to **dry-run mode**.

## Examples

### Area-based: single area, direct mapping

Issue RHOAIENG-55100 ("InferenceService returns 500 after deploying model") has `dashboard-area-model-serving` (existing or proposed). Model serving maps to Zaffre.

```json
{
  "metadata": {
    "generated": "2026-03-27T10:00:00Z",
    "query": "Triage batch of 6 new issues",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-55100",
      "summary": "InferenceService returns 500 after deploying model",
      "action": "ADD_LABEL",
      "params": { "labels": ["dashboard-zaffre-scrum"] },
      "reason": "Area 'dashboard-area-model-serving' maps to Zaffre"
    }
  ]
}
```

### Area-based: multiple areas, same team

Issue RHOAIENG-55101 ("Pipeline run fails when workbench uses GPU hardware profile") has proposed labels `dashboard-area-pipelines` and `dashboard-area-hardware-profiles`. Both map to Razzmatazz.

```json
{
  "operations": [
    {
      "issueKey": "RHOAIENG-55101",
      "summary": "Pipeline run fails when workbench uses GPU hardware profile",
      "action": "ADD_LABEL",
      "params": { "labels": ["dashboard-razzmatazz-scrum"] },
      "reason": "Areas 'dashboard-area-pipelines' and 'dashboard-area-hardware-profiles' both map to Razzmatazz"
    }
  ]
}
```

### Area-based: multiple areas, conflicting teams -- skip

Issue RHOAIENG-55102 ("Model registry integration with pipeline artifacts") has proposed labels `dashboard-area-model-registry` (Green) and `dashboard-area-pipelines` (Razzmatazz). Conflicting teams -- no operations produced.

### Area-based: unmapped area only -- skip

Issue RHOAIENG-55103 ("Edge deployment configuration page") has proposed label `dashboard-area-edge`. Edge has no default team mapping -- no operations produced.

### Keyword-based: no area labels, keyword match

Issue RHOAIENG-55104 ("Fix shared auth middleware across BFF modules") has no area labels. Summary matches Monarch keywords "shared auth", "middleware", "BFF".

```json
{
  "operations": [
    {
      "issueKey": "RHOAIENG-55104",
      "summary": "Fix shared auth middleware across BFF modules",
      "action": "ADD_LABEL",
      "params": { "labels": ["dashboard-monarch-scrum"] },
      "reason": "Keywords 'shared auth', 'middleware', 'BFF' match Monarch team associations"
    }
  ]
}
```

### Already assigned -- skip

Issue RHOAIENG-55105 has `dashboard-green-scrum` already present. No operations produced regardless of area labels.
