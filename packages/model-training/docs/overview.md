# Model Training

## Overview

- `@odh-dashboard/model-training` is the training job UI for ODH Dashboard: create, monitor, pause, scale, and delete ML training jobs on Kubernetes via the Kubeflow Training Operator.
- Frontend-only (no BFF).

## Design Intent

- **Kubernetes APIs**: Training job data is read and written through K8s using `@odh-dashboard/internal` helpers — no dedicated model-training backend.
- **Kueue and runtimes**: Kueue scheduling metadata from `ClusterQueue` / `LocalQueue` and related modules; `ClusterTrainingRuntime` supplies create-form defaults.
- **List and detail**: **TrainJob** and **RayJob** rows with separate drawers and scaling flows where applicable.
- **Module Federation**: Remote `plugin-model-training` exposes `./ModelTrainingRoutes` for `/develop-train/training-jobs/*`.
- **extensions.ts**: Registers `app.area` (gated by `SupportedArea.MODEL_TRAINING` and the `trainingJobs` flag), nav href under “Develop and train”, and the route mapping.

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
| Distributed Workloads (frontend) | Related area | Shared Kueue concepts; jobs surface in queue views — see [Distributed Workloads](../../../frontend/docs/distributed-workloads.md). |

## Known Issues / Gotchas

- Without `trainingJobs` in `OdhDashboardConfig`, nav and routes stay hidden even if CRDs exist on-cluster.
- `ClusterTrainingRuntime` is cluster-scoped; users without cluster read see empty runtime lists in create flow.
- Pod log streaming needs pod log access; strict network policies may block it.
- Kueue is optional: jobs without `kueue.x-k8s.io/queue-name` run without queue assignment; the cluster-queue column may be empty.
