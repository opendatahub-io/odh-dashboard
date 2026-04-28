# Distributed Workloads

## Overview

- Monitor Kueue-managed batch and training work: pick a project namespace and inspect queue status and resource metrics.
- Two tabs: distributed workload status and project metrics.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Distributed Workloads | `/observe-monitor/workload-metrics/workload-status/:namespace?` | `SupportedArea.DISTRIBUTED_WORKLOADS` |
| Distributed Workloads | `/observe-monitor/workload-metrics/project-metrics/:namespace?` | `SupportedArea.DISTRIBUTED_WORKLOADS` |

- Left nav under Observe/Monitor.
- Visibility: `useIsAreaAvailable(SupportedArea.DISTRIBUTED_WORKLOADS)`—driven by `disableDistributedWorkloads` in `OdhDashboardConfig` and Kueue presence in the DSC.
- Root path redirects to the first tab for the preferred or first available project.
- Legacy camelCase paths (`workloadStatus`, `projectMetrics`) redirect via `v2Redirects.ts` to kebab-case routes.

## Design Intent

- Routes sit under `ProjectsRoutes` so `ProjectsContext` supplies the project list.
- `GlobalDistributedWorkloads` validates the namespace param and redirects to the preferred project when needed.
- Wraps `MetricsCommonContextProvider` (refresh interval for all polling) and `DistributedWorkloadsContextProvider` (Kueue data plane for the selected namespace).
- Tab shell shows tabs only when the cluster has at least one `ClusterQueue` with resource groups **and** the namespace has a `LocalQueue`; otherwise a configuration prompt (avoids empty charts when Kueue is not wired up for the project).
- `DistributedWorkloadsContext` aggregates polling for cluster queues, local queues, and workloads; exposes project display metadata, `refreshAllData`, and `cqExists`.
- Polling cadence from `MetricsCommonContext` (shared with other metrics UIs).
- Tab bodies read context directly—no Redux for this feature.
- Workload status labels and donut aggregates derived client-side from `WorkloadCondition` via status helpers.
- Prometheus backs live CPU/memory per workload owner through `useDWProjectCurrentMetrics`.
- Standard PatternFly v6 theming; no dashboard-specific PF overrides.

## Key Concepts

| Term | Definition |
|------|-----------|
| **Kueue** | Queueing controller for batch/ML workloads; must be installed/configured in the DSC for this area to activate. |
| **ClusterQueue** | Cluster-scoped Kueue CRD defining a resource pool (quotas, resource flavors). |
| **LocalQueue** | Namespace-scoped Kueue CRD linking a project to a ClusterQueue. |
| **Workload** | Namespace-scoped Kueue CRD for a queued job (PyTorchJob, RayJob, Job, etc.). |
| **WorkloadStatusType** | Client enum (`Pending`, `Inadmissible`, `Admitted`, `Running`, `Evicted`, `Succeeded`, `Failed`) from `getStatusInfo()` on conditions. |
| **DWProjectCurrentMetrics** | Prometheus-sourced usage (CPU, memory) grouped by workload owner. |
| **ResourceFlavor** | Named slice of quota inside a ClusterQueue resource group. |
| **cqExists** | Context flag: any ClusterQueue with at least one resource group exists (used for messaging). |
| **MetricsCommonContext** | Shared refresh-interval state (`concepts/metrics/`) driving poll `refreshRate` for all hooks. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Kueue APIs (ClusterQueue, LocalQueue, Workload) | Backend k8s proxy | Read-only list/get via dashboard backend. |
| Prometheus | Backend Route | CPU/memory usage for project metrics tab. |
| `ProjectsContext` | Frontend Concept | Projects list and preferred project for URLs and validation. |
| `MetricsCommonContext` | Frontend Concept | Refresh interval consumed by all fetch hooks. |
| `SupportedArea.DISTRIBUTED_WORKLOADS` | Frontend Concept | Feature availability from `OdhDashboardConfig` + DSC. |
| `MetricsPageToolbar` | Frontend Component | Refresh dropdown above tab content. |

All cluster interaction from this UI is read-only—no create/update/delete of Kueue objects here.
Hooks short-circuit with `NotReadyError` when the feature area is disabled.

## Known Issues / Gotchas

- **ClusterQueue filtering**: Context keeps only ClusterQueues referenced by a LocalQueue in the
  selected namespace **and** with at least one resource group; empty `spec.resourceGroups` queues
  are dropped, which can look like “not configured” even when a CR exists.
- **Eager fetch**: Provider loads ClusterQueues, LocalQueues, and Workloads on mount for both tabs
  (TODO in `DistributedWorkloadsContext.tsx` for tab-scoped loading).
- **`cqExists` scope**: Reflects cluster-wide valid ClusterQueues, not the current namespace
  alone—non-admin copy may mention cluster queue setup when the mismatch is local.
- **Status derivation**: Pure client ordering of conditions; unusual Kueue condition ordering can
  disagree with controller truth.
- **E2E**: Suites expect Kueue **Unmanaged** in DSC; they skip when not satisfied—easy to misread as
  “green” CI when skipped.
