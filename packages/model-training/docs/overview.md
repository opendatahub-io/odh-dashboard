[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Distributed Workloads]: ../../../frontend/docs/distributed-workloads.md
[Model Registry]: ../../model-registry/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md

# Model Training

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

`@odh-dashboard/model-training` is the training job UI for ODH Dashboard: create, monitor, pause, scale, and delete ML training jobs on Kubernetes via the Kubeflow Training Operator. The package is frontend-only (no BFF).

**Package path**: `packages/model-training/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Federated | `npm run dev` (repo root) | Host loads this package via Module Federation; navigate to `/develop-train/training-jobs`. |

No standalone dev server in-package; the main dashboard supplies auth, config, and API access patterns.

## Design Intent

Training job data is read and written through **Kubernetes APIs** using `@odh-dashboard/internal` helpers — there is no dedicated model-training backend. Kueue scheduling metadata comes from `ClusterQueue` / `LocalQueue` and related modules; `ClusterTrainingRuntime` supplies create-form defaults. The list and detail experiences cover **TrainJob** and **RayJob** rows with separate drawers and scaling flows where applicable.

The **Module Federation** remote is named `plugin-model-training`; it exposes `./ModelTrainingRoutes` for the `/develop-train/training-jobs/*` route. `extensions.ts` registers the `app.area` (gated by `SupportedArea.MODEL_TRAINING` and the `trainingJobs` flag), nav href under “Develop and train”, and the route mapping.

## Key Concepts

| Term | Definition |
|------|-----------|
| **TrainJob** | Primary CRD for a single training run. |
| **ClusterTrainingRuntime** | Cluster-scoped CRD for reusable runtime presets (image, resources). |
| **TrainingOperator** | Reconciles TrainJobs into framework jobs (e.g. PyTorchJob, TFJob). |
| **PyTorchJob / TFJob** | Operator-created framework CRDs from a TrainJob. |
| **ResourceSpec** | Per-node CPU/memory/GPU requests and limits on a TrainJob. |
| **TrainingLog** | Pod logs in the details drawer (via log-fetch hooks). |
| **Kueue** | Batch scheduler; TrainJobs use `kueue.x-k8s.io/queue-name` for queues. |
| **ClusterQueue** | Kueue quota/scheduling scope for training workloads. |
| **RayJob** | Ray-based training job resource surfaced alongside TrainJob in the UI where installed. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host | Federation, auth, routing, `OdhDashboardConfig` / feature flags. |
| Kubeflow Training Operator | Kubernetes | CRUD on `TrainJob`; read `ClusterTrainingRuntime`; pods and events per job. |
| Kueue | Kubernetes | ClusterQueue/LocalQueue for scheduling UI. |
| `packages/model-registry` | Package | Optional flow to register a trained artifact after a job completes. |
| Distributed Workloads (frontend) | Related area | Shared Kueue concepts; jobs surface in queue views — see [Distributed Workloads]. |

## Known Issues / Gotchas

- Without `trainingJobs` in `OdhDashboardConfig`, nav and routes stay hidden even if CRDs exist on-cluster.
- `ClusterTrainingRuntime` is cluster-scoped; users without cluster read see empty runtime lists in create flow.
- Pod log streaming needs pod log access; strict network policies may block it.
- Kueue is optional: jobs without `kueue.x-k8s.io/queue-name` run without queue assignment; the cluster-queue column may be empty.

## Related Docs

- [Guidelines] — documentation style guide
- [Distributed Workloads] — Kueue / workload context
- [Model Registry] — registering trained artifacts
- [Module Federation Docs] — federation in the monorepo
- [Backend Overview] — main dashboard backend
- [BOOKMARKS] — full doc index
