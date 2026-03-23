[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../docs/BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Distributed Workloads]: ../../../frontend/docs/distributed-workloads.md
[Model Registry]: ../../model-registry/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md

# Model Training

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

`@odh-dashboard/model-training` provides the training job management UI for ODH Dashboard.
It lets users create, monitor, pause, scale, and delete ML training jobs running on Kubernetes
via the Kubeflow Training Operator. This package is frontend-only with no BFF.

**Package path**: `packages/model-training/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Federated | `make dev-start-federated` + run main dashboard | `http://localhost:4010` |

This package is frontend-only and ships no standalone server. It is always loaded as a
federated extension by the main ODH Dashboard. Local development requires the main dashboard
to be running alongside.

## BFF Architecture

Not applicable.

## OpenAPI Specification

Not applicable.

## Module Federation

**Config file**: `packages/model-training/frontend/config/webpack.config.js`

**Remote entry name**: `plugin-model-training`

**Exposed modules**:
- `./ModelTrainingRoutes` — top-level route component; loaded by the main dashboard when
  the user navigates to `/develop-train/training-jobs/*`

**Main dashboard registration**: `packages/model-training/extensions.ts`

The extension declares three entries:

- `app.area` — gated by `SupportedArea.MODEL_TRAINING` and the `trainingJobs` feature flag
- `app.navigation/href` — adds "Training jobs" under the "Develop and train" nav section
- `app.route` — maps `/develop-train/training-jobs/*` to `ModelTrainingRoutes`

```bash
# Start in federated mode (also requires main dashboard running)
cd packages/model-training
make dev-start-federated
# Then in repo root:
npm run dev
```

## Architecture

```text
packages/model-training/
├── extensions.ts               # Extension point declarations (area, nav, route)
├── src/
│   ├── ModelTrainingRoutes.tsx # Top-level router; lazy-loaded by Module Federation
│   ├── const.ts                # Shared label/annotation constants (Kueue, Trainer)
│   ├── k8sTypes.ts             # TypeScript types for TrainJob, ClusterTrainingRuntime CRDs
│   ├── types.ts                # Internal domain types
│   ├── api/                    # Kubernetes API calls (trainJobs, events, pods, queue, etc.)
│   ├── components/             # Shared UI components (project selector, empty state)
│   ├── global/
│   │   ├── ModelTraining.tsx           # Root component; sets up context
│   │   ├── ModelTrainingContext.tsx    # React context for jobs and cluster state
│   │   ├── trainingJobList/            # List view, table, toolbar, modals
│   │   └── trainingJobDetailsDrawer/   # Detail drawer with tabs (details, logs, pods, resources)
│   └── hooks/                  # Data-fetching hooks (logs, pods, runtimes, queues, scaling)
├── docs/
│   └── overview.md             # This file
└── package.json
```

The package calls the Kubernetes API directly through `@odh-dashboard/internal` utilities —
there is no intermediate BFF. Kueue scheduling data is fetched via the `queue.ts` and
`workloads.ts` API modules. Training runtimes (`ClusterTrainingRuntime` CRD) are resolved
via `useClusterTrainingRuntime`.

## Key Concepts

| Term | Definition |
|------|-----------|
| **TrainJob** | The primary Kubernetes CRD managed by this package; represents a single training run |
| **ClusterTrainingRuntime** | Cluster-scoped CRD defining reusable runtime configurations (framework, image, resource defaults) |
| **TrainingOperator** | Kubeflow component that reconciles TrainJob CRDs into framework-specific jobs (PyTorchJob, TFJob) |
| **PyTorchJob / TFJob** | Framework-specific job CRDs created by the Training Operator from a TrainJob |
| **ResourceSpec** | Per-node resource request/limit structure (CPU, memory, GPU) attached to a TrainJob |
| **TrainingLog** | Pod log stream surfaced in the details drawer's Logs tab via `useFetchLogs` |
| **Kueue** | Kubernetes batch-scheduling system; TrainJobs carry a `kueue.x-k8s.io/queue-name` label to join a ClusterQueue |
| **ClusterQueue** | Kueue resource that governs quota and scheduling for training workloads |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Access to an OpenShift / Kubernetes cluster with the Kubeflow Training Operator installed
- `trainingJobs` feature flag enabled in `OdhDashboardConfig`

### Environment setup

```bash
cp packages/model-training/.env.local.example packages/model-training/.env.local
# Edit .env.local with your cluster API server URL and token
```

### Start in federated mode

```bash
cd packages/model-training
make dev-start-federated
# In a second terminal, from the repo root:
npm run dev
# Navigate to http://localhost:4010/develop-train/training-jobs
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `DEPLOYMENT_MODE` | Must be `federated` for this package | `federated` | No |
| `DEV_MODE` | Enable development-only UI features | `false` | No |

## Testing

### Frontend unit tests

```bash
npx turbo run test:unit --filter=@odh-dashboard/model-training
```

Unit tests live alongside source files in `__tests__/` directories. Key coverage areas:
- `api/__tests__/` — API call construction for trainJobs, events, pods, queue, workloads
- `global/trainingJobList/__tests__/` — list utilities and status helpers
- `global/trainingJobDetailsDrawer/__tests__/` — drawer utilities
- `hooks/__tests__/` — queue resolution, runtime lookup, node scaling

### Cypress tests

```bash
npm run test:cypress-ci -- --spec "**/model-training/**"
```

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Loads this package via Module Federation; provides auth, routing, and `OdhDashboardConfig` feature flags |
| Kubeflow Training Operator | Kubernetes CRDs | CRUD on `TrainJob`, read on `ClusterTrainingRuntime`; pods and events fetched per job |
| Kueue | Kubernetes CRDs | Reads `ClusterQueue` and `LocalQueue` for scheduling metadata; uses `kueue.x-k8s.io/queue-name` label |
| `packages/model-registry` | Package | Users can register a trained model artifact after a job completes |
| `frontend/docs/distributed-workloads.md` | Frontend area | Shared Kueue scheduling concepts; training jobs appear in the Distributed Workloads queue view |

## Known Issues / Gotchas

- The `trainingJobs` feature flag must be set in `OdhDashboardConfig` or the nav entry and
  route will not appear — even if the Training Operator CRDs are present on the cluster.
- `ClusterTrainingRuntime` is cluster-scoped; users without cluster-level read access will
  see no runtimes in the create form.
- Log streaming (`useFetchLogs`) requires direct pod access; environments with strict network
  policies may block the pod log endpoint.
- Kueue integration is optional: jobs without the `kueue.x-k8s.io/queue-name` label bypass
  scheduling and run immediately. The `TrainingJobClusterQueue` column will be empty.

## Related Docs

- [Guidelines] — documentation style guide
- [Distributed Workloads] — Kueue scheduling context shared with this package
- [Model Registry] — downstream target for registering trained model artifacts
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main dashboard backend reference
- [BOOKMARKS] — full doc index
