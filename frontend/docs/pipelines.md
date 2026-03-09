[Guidelines]: ../../docs/guidelines.md
[BOOKMARKS]: ../../docs/BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[Architecture]: ../../docs/architecture.md
[Projects]: ./projects.md

# Pipelines

**Last Updated**: 2026-03-09 | **Template**: frontend-template v1

## Overview

The Pipelines area lets data scientists manage Kubeflow Pipelines (KFP) v2 workflows within a
Data Science Project. Users can import pipeline definitions, create and schedule runs, inspect
run DAGs and step-level outputs, compare run metrics across experiments, and browse ML metadata
artifacts and executions. The area is scoped to a project namespace and requires a configured
pipeline server (DSPipeline CR) before any pipeline operations are available.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Pipeline definitions | `/develop-train/pipelines/definitions` | `disablePipelines: false` + `DS_PIPELINES` component |
| Pipeline runs | `/develop-train/pipelines/runs` | same as above |
| Experiments | `/develop-train/experiments` | same as above |
| Artifacts | `/develop-train/pipelines/artifacts` | same as above |
| Executions | `/develop-train/pipelines/executions` | same as above |
| Project detail — Pipelines tab | `/projects/:namespace` (Pipelines tab) | same as above |

All global Pipelines routes live under the `develop-train` top-level nav group. Each route
embeds a project-namespace segment (`/:namespace`) resolved by `GlobalPipelineCoreLoader`; if
no namespace is present in the URL the user is redirected to their preferred project. The
feature is gated by `SupportedArea.DS_PIPELINES` (feature flag `disablePipelines`, plus the
`DS_PIPELINES` DataScienceStack component being enabled in the DSC).

Users can also reach pipeline content from inside a Data Science Project: the project detail
page (`/projects/:namespace`) exposes a Pipelines section rendered by
`frontend/src/pages/projects/screens/detail/pipelines/PipelinesSection.tsx`.

## Architecture

```text
frontend/src/pages/pipelines/
├── GlobalPipelinesRoutes.tsx          — pipeline definitions route tree
├── GlobalPipelineRunsRoutes.tsx       — runs + schedules route tree
├── GlobalPipelineExperimentsRoutes.tsx — experiments route tree
├── GlobalArtifactsRoutes.tsx          — artifacts route tree
├── GlobalPipelineExecutionsRoutes.tsx — executions route tree
├── GlobalModelCustomizationRoutes.tsx — model customization (LAB/iLab) route tree
└── global/
    ├── GlobalPipelineCoreLoader.tsx   — resolves namespace; wraps in PipelineContextProvider
    ├── PipelineCoreApplicationPage.tsx — shared ApplicationsPage shell with project selector
    ├── PipelineCoreProjectSelector.tsx — project dropdown in page header
    ├── PipelineCoreNoProjects.tsx      — empty state when user has no projects
    ├── GlobalPipelineCoreDetails.tsx   — breadcrumb detail shell for version/run detail pages
    ├── pipelines/                      — pipeline list and version detail
    ├── runs/                           — active/archived runs, schedules, run detail
    ├── experiments/                    — experiment list, run-within-experiment views,
    │   │                                 compare-runs, artifacts, executions
    │   └── artifacts/                  — artifact list and detail pages
    └── modelCustomization/             — LAB-method fine-tune form (uses pipeline infra)

frontend/src/concepts/pipelines/
├── context/
│   ├── PipelinesContext.tsx           — main provider: DSPipeline CR, API state, MLMD client
│   ├── usePipelineAPIState.ts         — builds the typed KFP API object from host path
│   ├── usePipelineNamespaceCR.ts      — watches the DSPipelineKind CR in the namespace
│   └── usePipelinesAPIRoute.ts        — resolves the KFP API route once the CR is ready
├── apiHooks/                          — per-resource useFetchState hooks (pipelines, runs, …)
│   └── mlmd/                          — gRPC-web hooks against the MLMD MetadataStore service
└── content/                           — shared UI: import modals, run form, compare-runs, DAG
```

`GlobalPipelineCoreLoader` is the entry point for every global route. It reads the current
namespace from the URL, looks up the project in `ProjectsContext`, and renders a
`PipelineContextProvider` that owns all pipeline state for that namespace. Child routes receive
API access and MLMD client access exclusively through that context. The data flow is:
`PipelineContextProvider` discovers the DSPipeline CR → resolves the proxy host path
(`/api/service/pipelines/:namespace/:dspaName`) → constructs typed API methods via
`usePipelineAPIState` → those methods are consumed by per-resource hooks in `apiHooks/`.

## State Management

**Contexts used**:
- [`PipelinesContext`](../src/concepts/pipelines/context/PipelinesContext.tsx) — holds the
  DSPipeline CR status, the typed `PipelineAPIState` (all KFP REST methods), a
  `MetadataStoreServicePromiseClient` for gRPC-web MLMD calls, the current namespace and
  project, and helpers such as `getRecurringRunInformation` and `refreshState`.
- [`MlmdListContext`](../src/concepts/pipelines/context/MlmdListContext.tsx) — provides
  cached MLMD list results (executions, artifacts) to avoid redundant gRPC calls within a
  single page.
- [`PipelineAndVersionContext`](../src/concepts/pipelines/content/PipelineAndVersionContext.tsx)
  — tracks selected pipeline and version within multi-select table interactions.
- [`CompareRunsContext`](../src/concepts/pipelines/content/compareRuns/CompareRunsContext.tsx)
  — holds the set of runs selected for side-by-side comparison.

**Key hooks**:
- `usePipelinesAPI` in `context/PipelinesContext.tsx` — primary consumer hook; returns the
  full API surface, MLMD client, and server status.
- `usePipelines` / `usePipelineById` in `apiHooks/usePipelines.ts` — fetch pipeline lists or
  a single pipeline via `useFetchState`.
- `usePipelineRuns` / `usePipelineRunById` in `apiHooks/usePipelineRuns.ts` — fetch run
  lists or individual run detail.
- `usePipelineRecurringRuns` / `usePipelineRecurringRunById` in `apiHooks/` — fetch scheduled
  (recurring) run configurations.
- `useExperiments` / `useExperimentById` in `apiHooks/useExperiments.ts` — fetch experiment
  list or detail.
- `useGetArtifactsList` / `useGetArtifactById` in `apiHooks/mlmd/` — query the MLMD service
  for artifact metadata via gRPC-web.
- `useGetExecutionsList` / `useGetExecutionById` in `apiHooks/mlmd/` — query MLMD for
  execution metadata.
- `usePipelineNamespaceCR` in `context/usePipelineNamespaceCR.ts` — watches the
  `DSPipelineKind` CR and exposes readiness state (`isDspaAllReady`, `dspaLoaded`,
  `hasServerTimedOut`).

**Data flow**: `PipelineContextProvider` polls `usePipelineNamespaceCR` to determine when the
CR and its associated route are ready. Once ready, `usePipelineAPIState` builds a typed API
object bound to `/api/service/pipelines/:namespace/:dspaName`. Individual page components call
resource-specific hooks (e.g., `usePipelineRuns`) that wrap `useFetchState` with the API
method. MLMD data (artifacts, executions) is fetched through the
`MetadataStoreServicePromiseClient` bound to `/api/service/mlmd/:namespace/:dspaName` using
gRPC-web — a separate proxy path from the KFP REST API.

## PatternFly Component Usage

| Component | Usage in this area |
|-----------|--------------------|
| `Table` (PF override) | Pipeline list, run list, experiment list, artifact list — all use the `frontend/src/components/pf-overrides/` Table override for layout correctness |
| `Page` / `PageSection` | `PipelineCoreApplicationPage` wraps every global pipeline page in the standard PF page shell |
| `Drawer` | Run detail and pipeline version detail pages use a PF Drawer for the DAG + side-panel detail layout |
| `Tabs` | `GlobalPipelineRunsTabs` uses PF Tabs to switch between Active, Archived, and Scheduled run views |
| `EmptyState` | `GlobalNoPipelines`, `PipelineCoreNoProjects`, and `PipelineServerTimedOut` all render PF EmptyState with contextual actions |
| `Toolbar` / `ToolbarFilter` | `GlobalPipelinesTableToolbar` and runs toolbars use PF Toolbar with filter chips for name, status, and date-range filtering |
| `Modal` | Import pipeline modal, configure pipeline server modal, archive/delete/restore confirmation modals |
| `Breadcrumb` | `GlobalPipelineCoreDetails` composes PF Breadcrumb for drill-down pages (version detail, run detail, artifact detail) |

The `Table` override from `frontend/src/components/pf-overrides/` is used in preference to
the raw PatternFly `TableComposable` throughout this area to address known layout issues. Do
not import `TableComposable` directly in new pipeline table components.

## Key Concepts

| Term | Definition |
|------|-----------|
| **Pipeline** | A versioned KFP v2 DAG definition, stored as a pipeline resource in the KFP API. Each pipeline has one or more PipelineVersions. |
| **PipelineVersion** | A specific, immutable revision of a pipeline definition. Runs are always created against a PipelineVersion, not the pipeline root. |
| **PipelineRun** | A single execution instance of a PipelineVersion. Has status (running, succeeded, failed, cancelled) and produces Artifacts. |
| **RecurringRun** | A scheduled run configuration (cron or periodic) that automatically creates PipelineRuns on a defined schedule. Called a "schedule" in the UI. |
| **Experiment** | A KFP grouping construct for organising runs. Every run belongs to exactly one experiment; a "Default" experiment is used when none is specified. |
| **Artifact** | A typed output produced by a pipeline component (e.g., a trained model, dataset, metrics blob). Metadata is stored in the ML Metadata (MLMD) service. |
| **Execution** | An MLMD record representing a single component step within a run. Linked to input/output Artifacts via MLMD Events. |
| **DSPipeline CR** | The `DSPipelineKind` custom resource in the project namespace that provisions the KFP API server and MLMD store. Must exist and be ready before any pipeline operations are available. |
| **MLMD** | ML Metadata — the gRPC service (proxied at `/api/service/mlmd/…`) that stores artifact and execution lineage records. Accessed via `MetadataStoreServicePromiseClient`. |
| **Pipeline server** | The deployed KFP API server instance within a project, represented by the DSPipeline CR. Users configure it once per project via the "Configure pipeline server" flow. |
| **Model Customization** | A LAB-method fine-tuning workflow (`global/modelCustomization/`) that surfaces as a guided form; it submits an iLab pipeline run using the same pipeline infrastructure. |

## Quick Start

```bash
# From the repo root, log in to a cluster with the DS_PIPELINES component enabled
oc login <cluster-url>

# Start the frontend dev server proxied to the remote cluster
cd frontend
npm run start:dev:ext

# Navigate to the pipeline definitions page for any project
# http://localhost:4010/develop-train/pipelines/definitions
```

Ensure the target cluster has the `DS_PIPELINES` DataScienceStack component enabled in the
`DataScienceCluster` CR and that `disablePipelines` is `false` (or absent) in the
`OdhDashboardConfig` CR. Without these, the nav item and routes will not render. You also need
at least one Data Science Project with a configured pipeline server (DSPipeline CR) in its
namespace; use the "Configure pipeline server" button on the Pipelines tab of any project if
one does not exist.

To run the area in isolation with mocked API responses, use the Cypress dev server:

```bash
cd packages/cypress
npm run cypress:open -- --spec "**/pipelines/**"
```

## Testing

### Unit Tests

Location: `frontend/src/pages/pipelines/global/experiments/artifacts/__tests__/` and
`frontend/src/concepts/pipelines/` (per-subdirectory `__tests__/` folders).

```bash
cd frontend
npm run test:unit -- --testPathPattern="pipelines"
```

Unit tests cover artifact detail rendering (`ArtifactDetails.spec.tsx`,
`ArtifactsTable.spec.tsx`), MLMD hook behaviour (all files under
`concepts/pipelines/apiHooks/mlmd/__tests__/`), pipeline context logic
(`context/__tests__/PipelinesContext.spec.tsx`), run form utilities
(`content/createRun/contentSections/__tests__/utils.spec.ts`), and import/configure-server
utilities.

### Cypress Mock Tests

Location: `packages/cypress/cypress/tests/mocked/pipelines/`

```bash
npm run test:cypress-ci -- --spec "**/mocked/pipelines/**"
```

### Cypress E2E Tests

Location: `packages/cypress/cypress/tests/e2e/pipelines/` (if present; check the directory
before running — E2E coverage for pipelines requires a live cluster with KFP deployed).

```bash
npm run cypress:run -- --spec "**/e2e/pipelines/**"
```

## Cypress Test Coverage

The mocked test suite covers the following flows:

- `pipelines.cy.ts` / `pipelinesList.cy.ts` — pipeline list rendering, import dialog
  (URL and file upload paths), version management, delete pipeline/version.
- `runs/pipelineRuns.cy.ts` — active and archived run list, status filtering, run detail
  breadcrumb navigation.
- `runs/pipelineCreateRuns.cy.ts` — create-run form: experiment selection, version picker,
  parameter inputs, schedule configuration.
- `runs/pipelineDeleteRuns.cy.ts` — archive and restore run flows, bulk delete.
- `runs/compareRuns.cy.ts` — compare-runs page: metric tables, confusion matrix, ROC curve
  rendering with mocked MLMD data.
- `runs/manageRuns.cy.ts` — manage-runs selection table within experiments.
- `experiments.cy.ts` — experiment list, create, archive, restore, delete.
- `artifacts.cy.ts` — artifact list and detail page with MLMD property rendering.
- `executions.cy.ts` — execution list and detail pages.
- `topology/pipelinesTopology.cy.ts` — DAG topology view for a pipeline version.
- `argoAlert.cy.ts` — warning banner shown when an Argo-format (v1) pipeline is detected.
- `modelCustomizationLandingPage.cy.ts` — model customization landing page prerequisites and
  accordion interactions.

Gaps: end-to-end recurring run trigger verification (requires a live KFP scheduler), and
compare-runs ROC AUC computation are not covered by mocked tests.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Dashboard backend proxy — `/api/service/pipelines/:ns/:dspa/*` | Backend Route | All KFP REST API calls (list/get/create/delete pipelines, versions, runs, experiments, recurring runs) are proxied through this path using the user's bearer token |
| Dashboard backend proxy — `/api/service/mlmd/:ns/:dspa` | Backend Route | gRPC-web calls to the MLMD MetadataStore service for artifact and execution metadata; consumed by `MetadataStoreServicePromiseClient` |
| `DSPipelineKind` CR (`dspa`) | Kubernetes Resource | `usePipelineNamespaceCR` watches this CR to determine server readiness; absence of the CR triggers the "Configure pipeline server" empty state |
| `concepts/projects/ProjectsContext` | Frontend Area — Projects | `GlobalPipelineCoreLoader` reads `ProjectsContext` to resolve the current namespace and redirect to the preferred project when none is specified |
| `packages/automl` | Package | AutoML workflows submit runs via the same KFP infrastructure; the Pipelines area shares the `PipelineContextProvider` and `usePipelinesAPI` hook |
| `packages/autorag` | Package | AutoRAG similarly uses KFP pipeline runs; artifacts produced by AutoRAG runs appear in the Pipelines artifacts list |
| `frontend/src/pages/projects` | Frontend Area — Projects | The project detail page (`PipelinesSection`) embeds pipeline list and server configuration UI, reusing `concepts/pipelines/` hooks and the `PipelineContextProvider` |
| `OdhDashboardConfig` CR | Kubernetes Resource | The `disablePipelines` feature flag on this CR gates the entire area; checked via `SupportedArea.DS_PIPELINES` in `conditionalArea` |
| `DataScienceCluster` CR (DSC) | Kubernetes Resource | The `DS_PIPELINES` component must be enabled in the DSC for the `SupportedArea.DS_PIPELINES` check to pass |

The primary data path for pipeline operations is: frontend → dashboard backend proxy →
KFP API server running in the project namespace. MLMD metadata follows a parallel path via
gRPC-web through a separate proxy endpoint. Neither path involves the dashboard backend
performing custom business logic; both are pass-through proxies that forward the user's token.

## Known Issues / Gotchas

- **Argo v1 pipeline detection**: If a user uploads a pipeline YAML that is Argo-format (KFP
  v1 / Argo Workflows), the area detects this and renders a warning banner
  (`argoAlert.cy.ts`). The pipeline will not execute correctly; users must re-upload a KFP v2
  compatible YAML. The test fixture `argo-workflow-pipeline.yaml` documents this format.
- **Pipeline server startup delay**: After a user configures a new pipeline server the DSPipeline
  CR takes time to reach a ready state. `usePipelineNamespaceCR` exposes `isStarting` for this
  window; the UI renders a starting-state modal. If the server never becomes ready,
  `hasServerTimedOut` triggers `PipelineServerTimedOut`, which requires deleting and
  recreating the server.
- **File size limit on pipeline import**: The import-by-file path enforces a maximum size
  (see `not-a-pipeline-2-megabytes.yaml` fixture). Uploads exceeding the limit are rejected
  client-side before the API call is made.
- **MLMD gRPC-web in development**: The `MetadataStoreServicePromiseClient` supports the
  [grpc-web-devtools](https://github.com/SafetyCulture/grpc-web-devtools) browser extension
  when `DEV_MODE` is active. Without the extension, gRPC-web traffic is opaque in the browser
  network tab.
- **DSPipeline CR version compatibility**: The context checks `spec.dspVersion === 'v2'` to
  set `hasCompatibleVersion`. A CR provisioned with an older spec version will show a
  compatibility warning even if the server is otherwise reachable.
- **Namespace redirect on direct URL access**: Navigating directly to
  `/develop-train/pipelines/definitions` without a namespace segment redirects to the
  preferred project. If no preferred project exists the first project in the list is used.
  This can surprise users who bookmark a namespace-less URL.

## Related Docs

- [Guidelines] — documentation style guide
- [BOOKMARKS] — full doc index
- [Backend Overview] — backend proxy and authentication architecture
- [Architecture] — overall ODH Dashboard architecture including proxy/pass-through patterns
- [Projects] — Projects frontend area doc (shares `ProjectsContext` and embeds pipeline UI)
