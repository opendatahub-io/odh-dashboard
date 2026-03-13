[Guidelines]: ../../docs/guidelines.md
[BOOKMARKS]: ../../docs/BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[Architecture]: ../../docs/architecture.md

# Gen AI

**Last Updated**: 2026-03-09 | **Template**: frontend-template v1

## Overview

The Gen AI area covers LLM evaluation workflows in the ODH Dashboard. It enables data scientists
to run LM-Eval-Harness benchmark jobs against deployed vLLM inference endpoints, track evaluation
status in real time, and inspect per-task metric scores. The main chatbot and inference UI lives
in the `packages/gen-ai` federated package — this doc covers only the main dashboard integration
for LLM evaluation (the `lmEval` page group).

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Evaluations | `/develop-train/evaluations` | `SupportedArea.LM_EVAL` (`disableLMEval` flag in `OdhDashboardConfig`) |
| Evaluations (namespace) | `/develop-train/evaluations/:namespace` | `SupportedArea.LM_EVAL` |
| Start evaluation run | `/develop-train/evaluations/:namespace/evaluate` | `SupportedArea.LM_EVAL` |
| Evaluation result detail | `/develop-train/evaluations/:namespace/:evaluationName` | `SupportedArea.LM_EVAL` |

The nav entry "Evaluations" appears under the "Develop and Train" section of the left navigation.
It is registered in `frontend/src/plugins/extensions/navigation.ts` and is hidden entirely when
`SupportedArea.LM_EVAL` is not satisfied. A redirect from the legacy path `/modelEvaluations/*`
to `/develop-train/evaluations/*` is registered in `frontend/src/plugins/extensions/routes.ts`.

`LMEvalCoreLoader` handles the project-scoping gate: if the URL contains no namespace it redirects
to the user's preferred project; if the namespace is invalid it renders `InvalidProject`; if no
projects exist it renders `LMEvalNoProjects`.

## Architecture

```text
frontend/src/pages/lmEval/
├── LMEvalRoutes.tsx              # React Router route tree for the area
├── types.ts                      # LmEvalFormData, LmModelArgument, LMEvalState enum
├── components/
│   ├── LMEvalApplicationPage.tsx # Shared page wrapper (breadcrumb + header layout)
│   ├── LMEvalNoProjects.tsx      # Empty state when user has no projects
│   └── LMEvalProjectSelector.tsx # Project-namespace switcher in the page header
├── global/
│   ├── LMEval.tsx                # Evaluations list page (ApplicationsPage wrapper)
│   ├── LMEvalContext.tsx         # Context provider: lmEval watch + project state
│   ├── LMEvalCoreLoader.tsx      # Project-scope gate; mounts LMEvalContextProvider
│   ├── LMEvalLoading.tsx         # Full-cluster loading state with cancel
│   ├── consts.ts                 # Page title and description strings
│   └── lmEvalList/
│       ├── LMEvalListView.tsx    # Toolbar + table composition
│       ├── LMEvalTable.tsx       # Paginated sortable table of LMEvalKind CRs
│       ├── LMEvalTableRow.tsx    # Row renderer; kebab menu with Delete action
│       ├── LMEvalToolbar.tsx     # Filter toolbar (Name, Model filters)
│       ├── DeleteLMEvalModal.tsx # Confirm-delete modal for an LMEvalJob
│       ├── const.ts              # Column definitions, filter option enums
│       ├── utils.ts              # getLMEvalState, getLMEvalStatusColor helpers
│       └── lmEvalStatus/
│           ├── LMEvalStatus.tsx      # Composite status: label + message + progress bar
│           ├── LMEvalStatusLabel.tsx # PatternFly Label chip (Pending/In Progress/…)
│           └── LMEvalProgressBar.tsx # Progress bar shown during active API requests
├── lmEvalForm/
│   ├── LMEvalForm.tsx            # "Start an evaluation run" page and form
│   ├── LMEvalFormFooter.tsx      # Submit / cancel footer actions
│   ├── LMEvalTaskSection.tsx     # Benchmark task multi-select
│   ├── LMEvalModelArgumentSection.tsx  # Advanced model args (URL, tokenizer)
│   ├── LMEvalSecuritySection.tsx # allowRemoteCode / allowOnline toggles
│   ├── const.ts                  # modelTypeOptions (local-chat-completions, local-completions)
│   ├── data.ts                   # Static task/benchmark catalogue
│   ├── useTrustyAIConfigMap.ts   # Fetches trustyai-service-operator-config ConfigMap
│   └── utils.ts                  # Form submission helpers; LMEvalJob CR builder
├── lmEvalResult/
│   ├── LMEvalResult.tsx          # Result detail page; download-JSON action
│   ├── LMEvalResultTable.tsx     # Compact PF table: Task / Metric / Value / Error
│   ├── useLMEvalResult.tsx       # useFetch wrapper around getModelEvaluationResult
│   └── utils.ts                  # parseEvaluationResults; SearchColumn helpers
└── utilities/
    ├── modelUtils.ts             # filterVLLMInference, generateModelOptions, selection handlers
    ├── useLMDashboardNamespace.ts # Redux selector for dashboardNamespace
    └── useLMGenericObjectState.ts # Generic typed object state hook (key-value setter)
```

The area follows a loader-then-context pattern. `LMEvalCoreLoader` resolves the project namespace
from URL params and renders `LMEvalContextProvider`, which starts a k8s watch for `LMEvalJob` CRs
in that namespace. Child routes (`LMEval`, `LMEvalForm`, `LMEvalResult`) consume the context via
`useContext(LMEvalContext)`. The form page is decoupled from the context's watch — it reads
inference services and serving runtimes independently to populate the model selector.

## State Management

**Contexts used**:
- [`LMEvalContext`](../src/pages/lmEval/global/LMEvalContext.tsx) — holds the k8s watch result
  for `LMEvalJob` CRs (`lmEval: CustomWatchK8sResult<LMEvalKind[]>`), the resolved `project`,
  the user's `preferredProject`, and the full `projects` list from `ProjectsContext`.

**Key hooks**:
- `useLMEvalJob(namespace)` in `frontend/src/api/index.ts` — k8s list-watch for `LMEvalJob` CRs
  in the given namespace; drives real-time status updates on the evaluations list page.
- `useLMEvalResult(evaluationName, namespace)` in `lmEvalResult/useLMEvalResult.tsx` — one-shot
  `useFetch` call to `getModelEvaluationResult`; used on the result detail page.
- `useTrustyAIConfigMap()` in `lmEvalForm/useTrustyAIConfigMap.ts` — fetches the
  `trustyai-service-operator-config` ConfigMap from the dashboard namespace; used by the form to
  determine TrustyAI integration settings.
- `useLMGenericObjectState<T>` in `utilities/useLMGenericObjectState.ts` — lightweight typed
  key-value setter for form state; wraps `React.useState` with a memoized per-key setter.
- `useLMDashboardNamespace()` in `utilities/useLMDashboardNamespace.ts` — Redux selector that
  returns `dashboardNamespace` (the operator namespace) from the global store.
- `useInferenceServices()` / `useServingRuntimes()` (from `pages/modelServing/`) — fetched in
  `LMEvalForm` to populate the model selector; filtered to vLLM-compatible endpoints only via
  `filterVLLMInference` in `utilities/modelUtils.ts`.

**Data flow**: `LMEvalContextProvider` calls `useLMEvalJob(namespace)` which opens a k8s watch
via the backend proxy. The watch result (`[data, loaded, error]`) is stored in `LMEvalContext`
and consumed by `LMEval.tsx` to render `LMEvalListView`. Status changes on the cluster surface
automatically without manual refresh. On the result detail page, `LMEvalResult.tsx` calls
`useLMEvalResult` on mount; the returned `LMEvalKind` CR's `status.results` JSON string is parsed
by `parseEvaluationResults` into `EvaluationResult[]` rows for `LMEvalResultTable`.

## PatternFly Component Usage

| Component | Usage in this area |
|-----------|--------------------|
| `Table` (dashboard wrapper) | Paginated, sortable list of `LMEvalJob` CRs in `LMEvalTable`; columns: Name, Model, Started, Status |
| `Table` / `Thead` / `Tbody` / `Td` (PF `@patternfly/react-table`) | Compact results table in `LMEvalResultTable` showing Task, Metric, Value, Error |
| `EmptyState` / `EmptyStateBody` / `EmptyStateFooter` | No-runs empty state in `LMEval.tsx`; no-models empty state inside the model selector dropdown |
| `Form` / `FormGroup` / `FormSection` | Evaluation configuration form in `LMEvalForm`; max width 800 px |
| `Select` / `SelectList` / `SelectOption` / `MenuToggle` | Model name picker and endpoint interaction type picker in `LMEvalForm` |
| `Breadcrumb` / `BreadcrumbItem` | Two-level breadcrumb (Evaluations → current page) on form and result pages |
| `Label` | Status chip in `LMEvalStatusLabel` (Pending / In Progress / Complete / Failed) |
| `Skeleton` | Placeholder rows in the model selector while `useInferenceServices` loads |
| `SearchInput` / `Toolbar` / `ToolbarContent` / `ToolbarItem` | Filter toolbar in `LMEvalListView` (Name / Model filters) and result table search |
| `Popover` | Inline help popover on the evaluation run name field |

The `Table` used in `LMEvalTable` is the shared dashboard wrapper at
`frontend/src/components/table/`, not the raw PatternFly table, and brings in built-in pagination
and sort support. `LMEvalResultTable` uses the raw `@patternfly/react-table` `Table` with
`TableVariant.compact`.

## Key Concepts

| Term | Definition |
|------|-----------|
| **LMEvalJob** | Kubernetes custom resource (`kind: LMEvalJob`) created by the LM-Eval operator. Each CR represents one evaluation run against a deployed model. The dashboard reads and creates these CRs via the backend k8s proxy. |
| **LMEvalKind** | TypeScript type in `frontend/src/k8sTypes.ts` that mirrors the `LMEvalJob` CRD schema; carries `spec.modelArgs`, `spec.taskList`, `status.state`, `status.results`, and `status.progressBars`. |
| **Benchmark / Task** | An evaluation dataset (e.g., MMLU, TruthfulQA, HellaSwag) registered with LM-Eval-Harness. Users select one or more tasks when creating an evaluation run. The static catalogue lives in `lmEvalForm/data.ts`. |
| **LMEvalState** | Enum (`Pending`, `In Progress`, `Complete`, `Failed`) derived from the CR's `status.state` field by `getLMEvalState()` in `lmEvalList/utils.ts`. |
| **Endpoint interaction type** | Controls which OpenAI-compatible endpoint LM-Eval uses: `local-chat-completions` (`/v1/chat/completions`) for free-form generation tasks, or `local-completions` (`/v1/completions`) for multiple-choice and chat-template tasks. |
| **SupportedArea.LM_EVAL** | Feature-area token declared in `frontend/src/concepts/areas/types.ts`. Controlled by the `disableLMEval` flag in `OdhDashboardConfig`. Both the nav entry and the route are gated on this area via `conditionalArea`. |
| **TrustyAI ConfigMap** | `trustyai-service-operator-config` ConfigMap in the dashboard namespace; read by `useTrustyAIConfigMap` to determine integration options exposed in the form. |
| **vLLM inference endpoint** | Only vLLM-backed `InferenceService` CRs are eligible for evaluation. `filterVLLMInference` in `utilities/modelUtils.ts` filters `useInferenceServices()` results to this subset. |

## Quick Start

```bash
# Log in to an OpenShift cluster with the LM-Eval operator installed
oc login <cluster-url>

# Ensure the disableLMEval flag is false in OdhDashboardConfig
oc patch odhdashboardconfig odh-dashboard-config -n redhat-ods-applications \
  --type=merge -p '{"spec":{"dashboardConfig":{"disableLMEval":false}}}'

# Start the frontend dev server
cd frontend
npm run start:dev:ext

# Navigate to the Evaluations page
open http://localhost:4010/develop-train/evaluations
```

To create test data, deploy a vLLM `InferenceService` in a project the logged-in user can access.
The model selector in the "Start an evaluation run" form will only show vLLM-backed endpoints.

## Testing

### Unit Tests

Location: `frontend/src/pages/lmEval/**/__tests__/`

Key test files:
- `lmEvalList/__tests__/utils.spec.ts` — tests for `getLMEvalState` and filter helpers
- `lmEvalForm/__tests__/LMEvalForm.spec.tsx` — form rendering and model selection behaviour
- `lmEvalForm/__tests__/useTrustyAIConfigMap.spec.ts` — hook unit test with mocked `getConfigMap`
- `lmEvalForm/__tests__/utils.spec.ts` — CR builder and form utility functions
- `lmEvalResult/__tests__/LMEvalResult.spec.tsx` — result page rendering and download action
- `lmEvalResult/__tests__/LMEvalResultTable.spec.tsx` — table rendering and filter behaviour
- `lmEvalResult/__tests__/utils.spec.ts` — `parseEvaluationResults` parsing logic

```bash
cd frontend
npm run test:unit -- --testPathPattern="lmEval"
```

### Cypress Mock Tests

No Cypress mock tests exist for this area at the time of writing. The `packages/cypress` directory
contains no `lmEval` or `evaluations` test files. This is a known coverage gap (see
Known Issues / Gotchas).

### Cypress E2E Tests

No Cypress E2E tests exist for this area at the time of writing.

## Cypress Test Coverage

The evaluations area has no Cypress mock or E2E test coverage yet. All current automated
coverage is via the unit tests listed above. Flows that lack coverage include: creating an
evaluation run end-to-end, observing real-time status transitions, viewing and downloading
result JSON, and deleting an `LMEvalJob`. Adding Cypress mock tests under
`packages/cypress/cypress/tests/mocked/lmEval/` is a tracked gap.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `packages/gen-ai` | Package (federated) | Full chatbot and LLM inference UI; loaded by Module Federation. This frontend area doc covers only the `lmEval` pages. See the gen-ai package doc for chatbot architecture. |
| `packages/model-serving` | Package | Provides `useInferenceServices` and `useServingRuntimes` hooks consumed by `LMEvalForm` to enumerate vLLM endpoints available for evaluation. |
| `packages/llmd-serving` | Package | LLM-specific serving endpoints; may surface additional model metadata used in `modelUtils.ts`. |
| `packages/maas` | Package | Model as a Service; relevant when models are sourced from a catalog rather than a user-deployed endpoint. |
| Backend k8s proxy | Backend Route | `LMEvalJob` CRD operations (list, watch, get, create, delete) flow through the dashboard backend's k8s proxy. `useLMEvalJob` opens a watch; `getModelEvaluationResult` does a single GET. |
| `ProjectsContext` | Frontend Area | Provides the project list and `preferredProject`; consumed by `LMEvalCoreLoader` and `LMEvalContextProvider` for namespace resolution. |
| `OdhDashboardConfig` (k8s CR) | Backend / Config | The `disableLMEval` flag in this CR enables or disables the entire area via `SupportedArea.LM_EVAL`. |
| `trustyai-service-operator-config` ConfigMap | Backend Route | Fetched by `useTrustyAIConfigMap` from the dashboard namespace; gates TrustyAI-specific form options. |

The primary data flow for the list page: `LMEvalContextProvider` → `useLMEvalJob(namespace)` →
backend k8s watch proxy → `LMEvalKind[]` → `LMEvalContext` → `LMEval.tsx` → `LMEvalListView` →
`LMEvalTable` → `LMEvalTableRow` / `LMEvalStatus`.

For the form submission flow: `LMEvalForm` collects `LmEvalFormData` → `LMEvalFormFooter`
calls the CR builder in `lmEvalForm/utils.ts` → POST to the backend k8s proxy → new `LMEvalJob`
CR appears in the watch stream → list page updates automatically.

## Known Issues / Gotchas

- No Cypress mock or E2E tests exist for this area. Any change to the evaluations pages should
  be verified manually against a cluster with the LM-Eval operator installed until tests are added.
- The model selector in `LMEvalForm` only shows vLLM-backed `InferenceService` CRs. If a user's
  project has no vLLM deployments, the dropdown renders an inline `EmptyState` ("No vLLM models
  available") rather than a disabled control, which may be surprising.
- `LMEvalContext` is gated by `conditionalArea(SupportedArea.LM_EVAL, true)`. If the feature is
  disabled at the config level, the provider renders nothing and navigating to the route results
  in a blank page rather than an explicit "feature unavailable" message.
- The result detail page (`LMEvalResult`) uses a one-shot `useFetch` rather than a watch. Status
  shown on the detail page does not update in real time; the user must navigate back to the list
  and re-enter to see an updated result once a run completes.
- The legacy route `/modelEvaluations/*` redirects to `/develop-train/evaluations/*`. Deep links
  using the old path continue to work but generate a redirect in browser history, which can cause
  double-back-button behaviour.
- `SupportedArea.LM_EVAL` declares `reliantAreas: [MODEL_REGISTRY, MODEL_SERVING]`. If either of
  those areas is disabled the LM_EVAL area is also disabled, even if `disableLMEval` is `false`.

## Related Docs

- [Guidelines] — documentation style guide for this repo
- [BOOKMARKS] — full doc index
- [Backend Overview] — backend architecture and k8s proxy patterns
- [Architecture] — overall ODH Dashboard architecture
