---
name: jira-validate-area-label
description: Validate and assign dashboard-area-* labels on Jira issues using multi-signal analysis. Tag mode assigns missing labels; Validate mode audits existing labels for correctness.
---

# Validate Area Label

Analysis skill for the [jira-triage infrastructure](../jira-triage/SKILL.md). Operates in two modes: **Tag** (assign area labels to unlabeled issues) and **Validate** (audit existing area labels for correctness). Produces operations that flow into the triage Apply capability.

Implements [RHOAIENG-52417](https://redhat.atlassian.net/browse/RHOAIENG-52417).

**Before running this skill, read [`persona.md`](../jira-triage/persona.md) and [`jira-project-reference.md`](../jira-triage/jira-project-reference.md).** The persona defines the execution protocol (thoroughness, verification, no assumptions). The project reference provides the Area Label Signal Mapping section, which defines keywords, K8s kinds, code paths, and matching notes for each area.

## Dashboard ownership prerequisite

This skill applies only to issues **owned by the RHOAI Dashboard** program team. **Full Triage:** run only after `jira-triage` Step 2a passes. If the issue **belongs to another team**, produce **no operations** for that issue — do not assign `dashboard-area-*` labels to reroute another team's work. See `jira-project-reference.md` § Dashboard ownership (triage scope).

## Scope

All issue types except excluded types (Epic, Sub-task, Initiative, Vulnerability).

---

## Required Fields

When fetching issues (via the triage Fetch capability or directly), request these fields:

| Field | ID | Why |
|---|---|---|
| Summary | `summary` | Primary content for keyword matching |
| Description | `description` | Content analysis for signal extraction |
| Labels | `labels` | Detect existing area and scrum labels |
| Issue type | `issuetype` | Context for area assessment |
| Issue Links | `issuelinks` | Check linked issue area labels |

**Note:** Description is excluded from the triage Fetch default field list because it can be large. This skill must explicitly add it. Issue links are already included in the Full Triage required fields.

---

## Signal Dimensions

The skill uses six signal dimensions to determine area labels. No single dimension is sufficient alone -- area association requires corroboration from multiple signals.

1. **Keywords** -- Feature names, UI text, and domain terms matched against issue summary and description. Source: Content Signals table in `jira-project-reference.md`.
2. **K8s resource kinds** -- Kubernetes CRD/resource type names referenced in descriptions. Source: Content Signals table.
3. **Code paths** -- Repository file/directory paths from linked PRs, stack traces, or description references. **When a file name is mentioned without its full path** (common in test failure/flake issues that reference a spec like `someTest.cy.ts`), **resolve the file name to its full repository path** using workspace search tools (e.g., `Glob` with `**/<filename>`). The resolved full path is then matched against the Code Path Signals table. Intermediate directory names in the resolved path also contribute as keyword signals (e.g., resolving `featureDataSources.cy.ts` to `packages/cypress/cypress/tests/mocked/featureStore/featureDataSources.cy.ts` surfaces `featureStore` as a keyword hit). Source: Code Path Signals table in `jira-project-reference.md`.
4. **Jira labels** -- Non-area labels already on the issue (e.g., `AutoML`, `AutoRAG`, `gen-ai`, `ai-pipelines`) that serve as product/feature identifiers. Source: Jira Label Signals table in `jira-project-reference.md`. Treated as keyword-equivalent signals with the same confidence as a keyword match in the summary.
5. **Linked issues** -- Area labels on linked Jira issues (parent, blocks/blocked-by, relates-to). If linked issues already have `dashboard-area-*` labels, those are a confirming signal. Fetch linked issue labels via `issuelinks` field data (inward/outward issue keys and their labels).
6. **Scrum team label** -- If the issue has a `dashboard-*-scrum` label, use the Area-to-Scrum Default Mapping in `jira-project-reference.md` in reverse as a **weak confirming signal**. Not definitive: a scrum team may pick up issues outside their default areas.

### Confidence Rule

An area label must be supported by **at least two signal dimensions**, OR by a **single high-confidence signal**:

- K8s kind match (e.g., `InferenceService` = model serving)
- Code path match (e.g., `packages/model-registry/` = model registry)
- Unambiguous multi-word keyword phrase unique to one area (e.g., "serving runtime" = model serving)

A Jira label match (e.g., `AutoML` label on the issue) combined with a keyword match in the summary or description satisfies the two-dimension requirement. A Jira label alone does not meet the threshold unless the label itself is an unambiguous product identifier that uniquely maps to one area (e.g., `AutoML` maps only to `dashboard-area-automl`).

A single generic keyword match alone (e.g., "deployment", "connection", "storage") is **never sufficient** to assign an area label.

---

## Shared Matching Procedure

Used by both modes:

1. **Extract signals** from summary, description, Jira labels (non-area labels), linked issues, and scrum team labels. Check issue labels against the Jira Label Signals table in `jira-project-reference.md` to identify product/feature label matches.
2. **Resolve file references.** Scan the summary and description for file names — look for patterns like `*.cy.ts`, `*.test.ts`, `*.spec.ts`, `*.tsx`, `*.ts`, `*.go`, or any identifiable source file name. For each file name found, search the repository using workspace tools (e.g., `Glob` with `**/<filename>`) to locate matching paths. Add every resolved path as a Code Path signal and treat each path's intermediate directory names as keyword signals. If no matches are found, continue without a Code Path signal. This step is critical for test failure and flake issues where the spec file name is often the strongest — or only — content signal pointing to a feature area.
3. **Score each area** against the Content Signals, Jira Label Signals, and Code Path Signals tables in `jira-project-reference.md`. For each area, check all six dimensions (including any resolved file paths from step 2) and compute a match score.
4. **Rank areas** by score. The top-scoring area(s) with sufficient confidence become candidates.
5. **Apply disambiguation rules** (below) to resolve conflicts
6. **Multiple area labels are expected.** An issue can genuinely span multiple areas. Produce an `ADD_LABEL` for each area that independently meets the confidence threshold. Do not cap at one.

### Disambiguation Rules

When multiple areas match on the same keywords, apply these rules in order:

#### Feature area beats cross-cutting area

If a feature area (e.g., `model-serving`) and a cross-cutting area (e.g., `performance`, `security`, `consistencies`, `infrastructure`, `patternfly`) both match, assign the feature area. Only assign the cross-cutting area if the issue is specifically *about* that concern itself.

- "Model serving table loads slowly" = `model-serving` (not `performance`)
- "Improve overall app load time" = `performance`
- "OAuth token issue in pipeline auth" = `pipelines` (not `security`)
- "Add CSRF protection to backend" = `security`

#### Feature-owned manifest paths vs generic manifests

When the issue references **YAML under `manifests/`**, kustomize overlays, or operator packaging:

- If **concrete paths, overlays, CRDs, or package names** clearly align with a **feature** Code Path or Content Signal (e.g. model serving / KServe, `packages/maas`, pipelines, gen-ai), **prefer labeling that feature area** (`dashboard-area-model-serving`, `dashboard-area-maas`, etc.) — it may be the **primary** label or paired with `dashboard-area-manifests`, depending on confidence.
- Use **`dashboard-area-manifests`** for **repo-wide** install bases, shared RBAC/operator plumbing, cross-cutting directory layout, or when the scope is **not** attributable to a single feature subtree.

Do not assign **only** `dashboard-area-manifests` when a high-confidence feature path is stated in the description or linked PRs. See `jira-project-reference.md` § **Manifests area and scrum routing** and § Matching Notes (**Manifest paths**).

#### Specific area beats container area

`dashboard-area-projects` is only for the project selector, project list, and project-level actions (create, delete, rename). Each tab in project details maps to a different area:

| Project Detail Tab | Area Label |
|---|---|
| Workbenches | `dashboard-area-workbenches` |
| Pipelines | `dashboard-area-pipelines` |
| Connections | `dashboard-area-connection-types` |
| Cluster storage | `dashboard-area-cluster-storage` |
| Deployments | `dashboard-area-model-serving` |
| Permissions | `dashboard-area-user-management` |
| Feature Store | *(no area label yet)* |
| Settings | `dashboard-area-projects` |

If feature-specific keywords are present alongside "project", assign the feature area, not `projects`.

#### Contextual keywords resolve ambiguous single keywords

Some keywords appear in multiple areas. Co-occurring keywords disambiguate:

| Ambiguous keyword | + Context keyword | Resolves to |
|---|---|---|
| "notebook" | + "spawner", "environment variable", "deployment size" | `workbenches` |
| "notebook" | + "BYON", "image stream", "notebook controller" | `notebooks` |
| "notebook" | + "Jupyter", "JupyterHub", "JupyterLab" | `jupyter` |
| "storage" | + "class", "default storage class" | `storage-classes` |
| "storage" | + "PVC", "persistent volume", "cluster storage" | `cluster-storage` |
| "model" | + "serving", "inference", "deploy", "runtime" | `model-serving` |
| "model" | + "registry", "registered", "version" | `model-registry` |
| "model" | + "catalog", "card" | `model-catalog` |
| "permissions" | + "project sharing", "project permissions" | `user-management` |
| "deployment" | + "model", "inference", "serving" | `model-serving` |
| "subscription" | + "playground", "Gen AI", "chatbot", "AAE" | `genai` |
| "subscription" | + "admin", "auth policy", "rate limit" | `maas` |
| "API key" | + "playground", "Gen AI", "chatbot" | `genai` |
| "API key" | + "admin", "subscription management", "revoke" | `maas` |
| "vector store" | + "playground", "RAG", "Gen AI" | `genai` |
| "vector store" | + "AutoRAG", "autorag", "pattern evaluation" | `autorag` |
| "experiment" | + "AutoML", "automl", "tabular", "timeseries", "classification", "regression" | `automl` |
| "experiment" | + "AutoRAG", "autorag", "RAG pattern", "faithfulness", "answer correctness" | `autorag` |
| "leaderboard" | + "AutoML", "automl", "model details", "confusion matrix" | `automl` |
| "leaderboard" | + "AutoRAG", "autorag", "pattern details", "RAG pattern" | `autorag` |
| "S3 file" | + "AutoML", "automl", "CSV", "tabular" | `automl` |
| "S3 file" | + "AutoRAG", "autorag", "knowledge", "documents" | `autorag` |
| "pipeline" | + "AutoML", "automl", "tabular pipeline", "timeseries pipeline" | `automl` |
| "pipeline" | + "AutoRAG", "autorag", "RAG pipeline", "text extraction" | `autorag` |

### Near-duplicate Area Labels

- **Deprecated labels**: Check the **Deprecated Labels** table in `jira-project-reference.md`. Do not assign deprecated labels. If encountered in Validate mode, replace with the canonical label.
- **`e2e` vs `cypress`**: `dashboard-area-e2e` is for end-to-end test cases and test automation. `dashboard-area-cypress` is for the Cypress framework itself -- mocks, config, test infrastructure, `packages/cypress/` plumbing. Both share the same code path, so keywords must disambiguate.
- **`genai` vs `maas`**: `dashboard-area-genai` covers the Gen AI Studio UX (`packages/gen-ai/`): playground, chatbot, LlamaStack, RAG/vector stores, guardrails, AAE, EvalHub, prompt management. `dashboard-area-maas` covers MaaS admin (`packages/maas/`): subscription CRUD, API key management, auth policies. The gen-ai BFF *calls* MaaS for model/token access, so issues about **consuming** MaaS data within Gen AI Studio (e.g., "MaaS model not appearing in playground") are `genai`; issues about **managing** subscriptions or auth policies are `maas`. Both labels may apply when an issue spans both surfaces.
- **`automl` vs `autorag`**: `dashboard-area-automl` covers the AutoML experiment experience (`packages/automl/`): tabular classification (binary, multiclass), regression, timeseries forecasting, AutoGluon, model leaderboard, confusion matrix, feature importance, model registration. `dashboard-area-autorag` covers the AutoRAG experiment experience (`packages/autorag/`): RAG pattern evaluation, vector stores, chunking, embedding, retrieval, generation, optimization metrics (faithfulness, answer correctness, context correctness), pattern leaderboard. Both share S3 file browsing and pipeline topology UI patterns. Use the summary prefix (`[AutoML]` vs `[AutoRAG]`), Jira labels (`AutoML`/`automl` vs `AutoRAG`/`autorag`), or domain-specific keywords to disambiguate. Issues affecting both (e.g., shared UI components) can have both labels. "AutoX" is an umbrella term covering both.
- **Feature-area spec flake vs Cypress framework**: When the issue is a **flake or failure in a feature-oriented spec** (RBAC/permissions, distributed workloads, model serving, etc.) and you assign a **feature** `dashboard-area-*` with sufficient confidence, **do not** also add `dashboard-area-cypress` only because the file extension is `.cy.ts`. Reserve `dashboard-area-cypress` for work **about** Cypress as framework (shared helpers, config, intercepts, commands). This keeps routing aligned with the **owning feature team** and avoids inconsistent “cypress on one flake, not the other” outcomes for the same class of issue.

---

## Mode A: Tag

Given a set of issues (typically from triage Fetch), analyze each issue and produce operations to assign area labels where missing.

### Use Cases

- **Full Triage pipeline step 5**: Runs on all New issues alongside other analysis skills
- **Standalone backlog labeling**: Find backlog issues missing area labels. Includes the standard filters from `jira-project-reference.md` § Standard Query Filters:

```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND Team = {jql_team_id}
  AND status = Backlog
  AND (labels is EMPTY OR labels not in ({area_labels_list}))
```

### Procedure

For each issue:

1. **Skip** if the issue already has any `dashboard-area-*` label
2. Run the **shared matching procedure**
3. For each area that meets the confidence threshold, produce an `ADD_LABEL` operation
4. **Aim to assign at least one area when confidence supports it.** Multiple areas may be assigned if each independently meets the threshold. Do not force-assign a low-confidence best guess — if no area meets the confidence threshold, produce no operations.
5. If the issue is truly unclassifiable (vague summary with no description and no linked issues), produce no operations

---

## Mode B: Validate

Find issues with existing area labels and check whether the labels are correct. Used ad-hoc for backlog auditing.

### Discovery JQL Patterns

All values come from `jira-project-reference.md`. Include `resolution = Unresolved` by default.

**Issues with area labels (audit for correctness):**
```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND Team = {jql_team_id}
  AND labels in ({area_labels_list})
```

Can be further scoped by status, scrum team, or date range.

The user may also provide a pre-fetched issue set or specific issue keys to validate.

### Procedure

For each issue:

1. Run the **shared matching procedure**
2. If the existing label(s) match the top-scoring area(s), no operation
3. If additional areas should be added (high confidence), produce `ADD_LABEL` for each
4. If an existing label is clearly wrong (a different area scores much higher and the existing label scores low), produce `REMOVE_LABEL` + `ADD_LABEL` with the corrected label
5. If the mismatch is ambiguous (close scores), produce `ADD_COMMENT` flagging the potential mismatch for human review -- do NOT auto-change
6. If any deprecated label (per `jira-project-reference.md` § Deprecated Labels) is found, produce `REMOVE_LABEL` for the deprecated label and `ADD_LABEL` for its replacement

---

## Guidelines

- **Multi-signal confidence is mandatory.** Area labels must be supported by multiple signal dimensions, not keywords alone.
- **Feature areas take priority** over cross-cutting areas. Only assign cross-cutting areas when the issue is specifically about that concern.
- **Specific areas take priority** over container areas, especially `projects`.
- **Multiple area labels per issue are normal and expected.** Each area that independently meets the confidence threshold gets its own operation.
- **Keep reasons concise**, citing the specific signals across dimensions that drove the match (e.g., "Summary mentions 'workbench spawner', code path in linked PR matches `pages/projects/screens/spawner/`, confirmed by linked issue RHOAIENG-12345 having `dashboard-area-workbenches`").
- **Do not over-label.** Each area label must be a genuine match. An issue about model serving should not also get `performance` just because the word "slow" appears in passing.

---

## Output

Output MUST validate against [`operations-schema.json`](../jira-triage/operations-schema.json). Actions by mode:

| Mode | Actions produced |
|---|---|
| Tag | `ADD_LABEL` |
| Validate | `ADD_LABEL`, `REMOVE_LABEL`, `ADD_COMMENT` |

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

The output flows into the Apply capability of the triage infrastructure. When invoked standalone (outside Full Triage), Apply defaults to **dry-run mode**: it validates, presents the summary, writes the operations file to `.artifacts/triage/`, and stops. The user reviews the file and explicitly applies it later. To execute immediately, the user must request it (e.g., "validate area labels and apply").

---

## Examples

### Tag mode: single area assigned

Issue RHOAIENG-55100 ("InferenceService returns 500 after deploying model with custom serving runtime") has no area labels. Summary contains "InferenceService" (K8s kind = model serving) and "serving runtime" (multi-word phrase unique to model serving).

```json
{
  "metadata": {
    "generated": "2026-03-26T10:00:00Z",
    "query": "Triage batch of 6 new issues",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-55100",
      "summary": "InferenceService returns 500 after deploying model with custom serving runtime",
      "action": "ADD_LABEL",
      "params": { "labels": ["dashboard-area-model-serving"] },
      "reason": "K8s kind 'InferenceService' and keyword 'serving runtime' both map to model-serving"
    }
  ]
}
```

### Tag mode: multiple areas assigned

Issue RHOAIENG-55101 ("Pipeline run fails when workbench notebook uses GPU hardware profile") has no area labels. Description references pipelines (pipeline run), workbenches (workbench notebook), and hardware profiles (GPU hardware profile). Linked parent issue has `dashboard-area-pipelines`.

```json
{
  "metadata": {
    "generated": "2026-03-26T10:00:00Z",
    "query": "Triage batch of 6 new issues",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-55101",
      "summary": "Pipeline run fails when workbench notebook uses GPU hardware profile",
      "action": "ADD_LABEL",
      "params": { "labels": ["dashboard-area-pipelines"] },
      "reason": "Keyword 'pipeline run' in summary, confirmed by parent issue RHOAIENG-55050 having dashboard-area-pipelines"
    },
    {
      "issueKey": "RHOAIENG-55101",
      "summary": "Pipeline run fails when workbench notebook uses GPU hardware profile",
      "action": "ADD_LABEL",
      "params": { "labels": ["dashboard-area-hardware-profiles"] },
      "reason": "Keywords 'GPU hardware profile' in summary map uniquely to hardware-profiles"
    }
  ]
}
```

### Validate mode: mismatch corrected

Issue RHOAIENG-55102 ("Workbench spawner fails to set environment variables") has `dashboard-area-projects` but the content is clearly about the workbench spawner. Description references `frontend/src/pages/projects/screens/spawner/`.

```json
{
  "metadata": {
    "generated": "2026-03-26T10:00:00Z",
    "query": "Validate area labels on Backlog issues",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-55102",
      "summary": "Workbench spawner fails to set environment variables",
      "action": "REMOVE_LABEL",
      "params": { "labels": ["dashboard-area-projects"] },
      "reason": "Issue is about the workbench spawner (specific feature), not projects infrastructure"
    },
    {
      "issueKey": "RHOAIENG-55102",
      "summary": "Workbench spawner fails to set environment variables",
      "action": "ADD_LABEL",
      "params": { "labels": ["dashboard-area-workbenches"] },
      "reason": "Keywords 'workbench spawner' and 'environment variables' map to workbenches, code path 'pages/projects/screens/spawner/' confirms (longest prefix match)"
    }
  ]
}
```

### Validate mode: ambiguous, comment for review

Issue RHOAIENG-55103 ("Improve table performance for large datasets") has `dashboard-area-model-serving` but the description mentions both model serving tables and pipeline run tables. Cannot confidently determine which area the performance issue primarily affects.

```json
{
  "metadata": {
    "generated": "2026-03-26T10:00:00Z",
    "query": "Validate area labels on Backlog issues",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-55103",
      "summary": "Improve table performance for large datasets",
      "action": "ADD_COMMENT",
      "params": { "comment": "### AI Triage\n\nArea label review: this issue is labeled `dashboard-area-model-serving` but the description references both model serving and pipeline run tables. Should this also have `dashboard-area-pipelines`, or is the model serving label sufficient?" },
      "reason": "Keywords match both model-serving and pipelines with similar confidence; flagging for human review"
    }
  ]
}
```
