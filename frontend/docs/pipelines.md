# Pipelines

## Overview

- Manage Kubeflow Pipelines (KFP) v2 workflows in a Data Science Project: import definitions, create and schedule runs, inspect DAGs and outputs, compare metrics, and browse MLMD artifacts and executions.
- Namespace-scoped; requires a ready pipeline server (`DSPipelineKind` CR) before operations are available.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Pipeline definitions | `/develop-train/pipelines/definitions` | `disablePipelines: false` + `DS_PIPELINES` component |
| Pipeline runs | `/develop-train/pipelines/runs` | same as above |
| Experiments | `/develop-train/experiments` | same as above |
| Artifacts | `/develop-train/pipelines/artifacts` | same as above |
| Executions | `/develop-train/pipelines/executions` | same as above |
| Project detail — Pipelines tab | `/projects/:namespace` (Pipelines tab) | same as above |

- Global routes live under `develop-train`; each embeds `/:namespace`, resolved by `GlobalPipelineCoreLoader`.
- If the URL has no namespace, the user is redirected to their preferred project.
- Gating uses `SupportedArea.DS_PIPELINES` (dashboard config + DSC).
- From a project, the Pipelines section is rendered under `frontend/src/pages/projects/screens/detail/pipelines/PipelinesSection.tsx`.

## Design Intent

- Every global pipeline route mounts through `GlobalPipelineCoreLoader`, which reads the namespace, aligns with `ProjectsContext`, and wraps children in `PipelineContextProvider`.
  - That provider owns pipeline state for the namespace; child routes do not construct their own API clients.
- Dominant pattern: **discover infra, then bind typed clients**.
  - Provider watches the `DSPipelineKind` CR until the server route is ready, then builds a typed KFP REST surface against `/api/service/pipelines/:namespace/:dspaName`.
- MLMD (artifacts, executions) is a **parallel path**: gRPC-web to `/api/service/mlmd/:namespace/:dspaName`, not the same transport as KFP REST.
- Secondary contexts (`MlmdListContext`, selection/compare contexts) cache MLMD lists or UI selection state—not to replace the main provider.
- Dashboard backends for both paths are pass-through proxies; they forward the user token and do not implement pipeline business logic.

## Key Concepts

| Term | Definition |
|------|-----------|
| **Pipeline** | A versioned KFP v2 DAG definition in the KFP API; one or more **PipelineVersions** per pipeline. |
| **PipelineVersion** | Immutable revision; runs are created against a version, not the pipeline root. |
| **PipelineRun** | Single execution of a version; status and outputs; may produce **Artifacts**. |
| **RecurringRun** | Scheduled (cron/periodic) configuration that creates runs; labeled “schedule” in the UI. |
| **Experiment** | KFP grouping for runs; every run belongs to one experiment (default when unspecified). |
| **Artifact** | Typed pipeline output; metadata in **MLMD** (ML Metadata). |
| **Execution** | MLMD record for a component step; linked to artifacts via MLMD events. |
| **DSPipeline CR** | `DSPipelineKind` in the project namespace; provisions KFP API + MLMD. Must be ready before the UI can operate. |
| **MLMD** | gRPC MetadataStore (proxied at `/api/service/mlmd/…`); accessed via `MetadataStoreServicePromiseClient`. |
| **Pipeline server** | The in-project KFP instance represented by the DSPipeline CR; configured via “Configure pipeline server”. |
| **Model Customization** | LAB/iLab fine-tune flow under `global/modelCustomization/`; submits a pipeline run using the same infrastructure. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Backend proxy `/api/service/pipelines/:ns/:dspa/*` | Backend route | KFP REST (pipelines, versions, runs, experiments, recurring runs); bearer token |
| Backend proxy `/api/service/mlmd/:ns/:dspa` | Backend route | gRPC-web to MLMD for artifacts and executions |
| `DSPipelineKind` CR | Kubernetes | Readiness and timeouts drive empty/starting/error UI |
| `concepts/projects/ProjectsContext` | Frontend | Namespace resolution and preferred-project redirect |
| `packages/automl` / `packages/autorag` | Package | Same KFP/MLMD stack; runs and artifacts surface in Pipelines |
| `frontend/src/pages/projects` | Frontend | `PipelinesSection` embeds list + server configuration; reuses pipeline concepts |
| `OdhDashboardConfig` / DSC | Kubernetes | `disablePipelines` and `DS_PIPELINES` gate the area |

**Data flow:** UI → dashboard proxy → in-cluster KFP API. MLMD uses the separate gRPC-web proxy. Both are token-forwarding proxies.

## Known Issues / Gotchas

- **Tables:** Use the shared `Table` override under `frontend/src/components/pf-overrides/` for pipeline/run/experiment/artifact lists. Do **not** import `TableComposable` directly in new pipeline tables.
- **Argo v1 YAML:** Argo-format (KFP v1) uploads show a warning banner; they will not run as v2. Fixture `argo-workflow-pipeline.yaml` illustrates the problematic format.
- **Server startup:** After configuring a server, the CR may stay non-ready; `isStarting` vs `hasServerTimedOut` drives starting modal vs `PipelineServerTimedOut` (may require delete/recreate).
- **Import file size:** Client-side limit before upload (see `not-a-pipeline-2-megabytes.yaml` fixture).
- **MLMD in dev:** With `DEV_MODE`, [grpc-web-devtools](https://github.com/SafetyCulture/grpc-web-devtools) helps inspect gRPC-web; otherwise network tab is opaque.
- **DSPipeline spec:** Context checks `spec.dspVersion === 'v2'` for `hasCompatibleVersion`; older spec can warn even if reachable.
- **Bookmarking:** Namespace-less `/develop-train/pipelines/...` redirects to preferred (or first) project—bookmarks without `/:namespace` can surprise users.
