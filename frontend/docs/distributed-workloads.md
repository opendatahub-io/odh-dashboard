[Guidelines]: ../../docs/guidelines.md
[BOOKMARKS]: ../../docs/BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[DistributedWorkloadsContext]: ../src/concepts/distributedWorkloads/DistributedWorkloadsContext.tsx
[utils.tsx]: ../src/concepts/distributedWorkloads/utils.tsx
[useDistributedWorkloadsTabs]: ../src/pages/distributedWorkloads/global/useDistributedWorkloadsTabs.tsx
[GlobalDistributedWorkloads]: ../src/pages/distributedWorkloads/global/GlobalDistributedWorkloads.tsx
[GlobalDistributedWorkloadsTabs]: ../src/pages/distributedWorkloads/global/GlobalDistributedWorkloadsTabs.tsx

# Distributed Workloads

**Last Updated**: 2026-03-09 | **Template**: frontend-template v1

## Overview

The Distributed Workloads area lets data scientists and ML engineers monitor queued batch and
training jobs that are managed by Kueue, the Kubernetes workload queueing controller. Users select
a project (namespace) and view live workload queue status and per-project resource consumption
metrics across two tabs: "Distributed workload status" and "Project metrics".

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Distributed Workloads | `/observe-monitor/workload-metrics/workload-status/:namespace?` | `SupportedArea.DISTRIBUTED_WORKLOADS` |
| Distributed Workloads | `/observe-monitor/workload-metrics/project-metrics/:namespace?` | `SupportedArea.DISTRIBUTED_WORKLOADS` |

The nav item "Distributed Workloads" appears in the left navigation under the Observe/Monitor
section. It is hidden when `useIsAreaAvailable(SupportedArea.DISTRIBUTED_WORKLOADS)` returns
`false`, which is gated on the `disableDistributedWorkloads` flag in `OdhDashboardConfig` and
requires Kueue to be present in the Data Science Cluster (DSC). Navigating to the root path
redirects to the first available tab for the user's preferred or first available project.

Legacy camelCase paths (`workloadStatus/:namespace?`, `projectMetrics/:namespace?`) are handled by
`v2Redirects.ts` and redirect to the current kebab-case paths automatically.

## Architecture

```text
frontend/src/pages/distributedWorkloads/
├── GlobalDistributedWorkloadsRoutes.tsx   # Route definitions; tab-aware redirects
├── v2Redirects.ts                         # Legacy path → current path redirect map
├── components/
│   ├── LoadingState.tsx                   # Shared spinner placeholder
│   ├── NoWorkloadState.tsx                # Empty state when no workloads exist
│   ├── WorkloadResourceUsageBar.tsx       # Progress bar for CPU/memory usage
│   └── WorkloadStatusLabel.tsx           # PF Label with status color and icon
└── global/
    ├── GlobalDistributedWorkloads.tsx     # Project validation; wraps context providers
    ├── GlobalDistributedWorkloadsTabs.tsx # Tab shell; gate on queue availability
    ├── useDistributedWorkloadsTabs.tsx    # Tab config driven by feature availability
    ├── DistributedWorkloadsNoProjects.tsx # Empty state when user has no projects
    ├── workloadStatus/
    │   ├── GlobalDistributedWorkloadsWorkloadStatusTab.tsx  # Tab root
    │   ├── DWStatusOverviewDonutChart.tsx                   # Donut chart by status
    │   ├── DWWorkloadsTable.tsx                             # Sortable workloads table
    │   ├── DWWorkloadsTableRow.tsx                          # Row with status label
    │   └── columns.ts                                       # Column definitions
    └── projectMetrics/
        ├── GlobalDistributedWorkloadsProjectMetricsTab.tsx  # Tab root
        └── sections/
            ├── DWSectionCard.tsx                  # Titled card wrapper
            ├── RequestedResources.tsx             # CPU + memory bullet charts
            ├── RequestedResourcesBulletChart.tsx  # ChartBullet per resource type
            ├── TopResourceConsumingWorkloads.tsx  # Top-5 consuming workloads
            ├── WorkloadResourceMetricsTable.tsx   # Per-workload metrics table
            └── WorkloadResourceMetricsTableRow.tsx

frontend/src/concepts/distributedWorkloads/
├── DistributedWorkloadsContext.tsx        # Central context provider
├── useClusterQueues.ts                    # Fetches ClusterQueue CRDs (cluster-wide)
├── useLocalQueues.ts                      # Fetches LocalQueue CRDs (namespace-scoped)
├── useWorkloads.ts                        # Fetches Workload CRDs for a namespace
├── useWorkloadPriorityClasses.ts          # Fetches WorkloadPriorityClass resources
├── useDistributedWorkloadsEnabled.ts      # Feature-flag guard
├── utils.tsx                              # Status derivation, resource math helpers
├── PermissionsNotSet.tsx                  # 403 fallback UI
└── __tests__/                             # Unit tests for hooks and utils
```

`GlobalDistributedWorkloadsRoutes` wraps all routes in `ProjectsRoutes`, which supplies the
`ProjectsContext`. On load, `GlobalDistributedWorkloads` validates the namespace URL param against
known projects; if absent it redirects to the preferred project. Once a valid namespace is
confirmed, it mounts `MetricsCommonContextProvider` (for the refresh-interval selector) and
`DistributedWorkloadsContextProvider`, which starts polling all Kueue CRDs. The tab shell
(`GlobalDistributedWorkloadsTabs`) gates on whether at least one ClusterQueue with resource groups
and at least one LocalQueue exist for the namespace; if either is missing it renders a configuration
prompt rather than the tabs.

## State Management

**Contexts used**:
- [`DistributedWorkloadsContext`][DistributedWorkloadsContext] — holds `clusterQueues`,
  `localQueues`, `workloads` (all `FetchStateObject<T[]>`), `projectCurrentMetrics`
  (`DWProjectCurrentMetrics`), `refreshAllData`, `namespace`, `projectDisplayName`, and
  `cqExists` (whether any ClusterQueue with resource groups exists).
- `MetricsCommonContext` (`frontend/src/concepts/metrics/MetricsCommonContext.tsx`) — holds
  `currentRefreshInterval` used to derive the polling `refreshRate` passed to every fetch hook.
- `ProjectsContext` (`frontend/src/concepts/projects/ProjectsContext.tsx`) — provides the project
  list and `preferredProject` used for default navigation.

**Key hooks**:
- `useClusterQueues(refreshRate)` in `concepts/distributedWorkloads/useClusterQueues.ts` — calls
  `listClusterQueues()` against the Kueue `ClusterQueue` CRD; cluster-scoped (no namespace).
- `useLocalQueues(namespace, refreshRate)` in `concepts/distributedWorkloads/useLocalQueues.ts` —
  calls `listLocalQueues(namespace)` for the selected project's `LocalQueue` resources.
- `useWorkloads(namespace, refreshRate)` in `concepts/distributedWorkloads/useWorkloads.ts` —
  calls `listWorkloads(namespace)` for the `Workload` CRDs in the selected namespace.
- `useDWProjectCurrentMetrics(workloads, namespace, refreshRate)` in `frontend/src/api` — queries
  Prometheus for live CPU/memory usage per workload owner.
- `useDistributedWorkloadsEnabled()` — reads `SupportedArea.DISTRIBUTED_WORKLOADS` availability;
  all data hooks short-circuit with `NotReadyError` when `false`.
- `useDistributedWorkloadsTabs()` in [useDistributedWorkloadsTabs] — returns the two tab configs;
  `isAvailable` on each tab is driven by `useDistributedWorkloadsEnabled()`.

**Data flow**: Each fetch hook wraps `useFetchState`, which polls at `refreshRate` milliseconds
(derived from the user-selected refresh interval in `MetricsCommonContext`). The context provider
aggregates all fetch objects and exposes a single `refreshAllData` callback. Tab content components
read directly from `DistributedWorkloadsContext` via `React.useContext` — no Redux or Zustand store
is used. Status derivation (`getStatusInfo`, `getStatusCounts`) runs client-side in [utils.tsx]
by inspecting `WorkloadCondition` entries on each `WorkloadKind` object.

## PatternFly Component Usage

| Component | Usage in this area |
|-----------|--------------------|
| `Tabs`, `Tab`, `TabContent`, `TabContentBody` | Two-tab shell in `GlobalDistributedWorkloadsTabs` |
| `Card`, `CardTitle`, `CardBody` | Section cards on both tabs (`DWSectionCard`, status overview) |
| `Stack`, `StackItem` | Vertical layout of cards within each tab |
| `EmptyState`, `EmptyStateBody`, `EmptyStateFooter` | Queue-not-configured and no-workload states |
| `Label` | `WorkloadStatusLabel` — colored status badge with icon per `WorkloadStatusType` |
| `ChartDonut`, `ChartLegend`, `ChartContainer` | Status overview donut chart (`DWStatusOverviewDonutChart`) from `@patternfly/react-charts/victory` |
| `ChartBullet` | Requested-resources bullet chart per resource type (`RequestedResourcesBulletChart`) from `@patternfly/react-charts/victory` |
| `Progress` / custom bar | `WorkloadResourceUsageBar` — CPU and memory usage bars in the metrics table |
| `PageSection` | Wraps the tab bar and the tab content area |
| `Alert`, `Bullseye`, `Spinner` | Error and loading states in `DistributedWorkloadsContext` |

No PatternFly overrides from `frontend/src/concepts/dashboard/` are applied specifically to this
area; it relies on the standard PF v6 theme.

## Key Concepts

| Term | Definition |
|------|-----------|
| **Kueue** | Kubernetes controller that queues and schedules batch/ML workloads across shared resource pools. Must be installed and configured in the DSC for this area to activate. |
| **ClusterQueue** | Cluster-scoped Kueue CRD that defines a resource pool (CPU, memory quotas split across resource flavors). One or more LocalQueues refer to it. |
| **LocalQueue** | Namespace-scoped Kueue CRD that links a project to a ClusterQueue. A workload submitted in a namespace must reference a LocalQueue in that namespace. |
| **Workload** | Namespace-scoped Kueue CRD representing a queued job request (owns the pod specs and resource requirements). Created automatically by Kueue for each submitted PyTorchJob, RayJob, or batch Job. |
| **WorkloadStatusType** | Client-derived enum (`Pending`, `Inadmissible`, `Admitted`, `Running`, `Evicted`, `Succeeded`, `Failed`) computed by `getStatusInfo()` from `WorkloadCondition` entries. |
| **DWProjectCurrentMetrics** | Prometheus-sourced live usage data (CPU cores, memory bytes) grouped by workload owner, fetched via `useDWProjectCurrentMetrics`. |
| **ResourceFlavor** | A named hardware profile within a ClusterQueue's resource group; nominalQuota per flavor determines total shared quota shown in the bullet chart. |
| **cqExists** | Boolean in context indicating whether any ClusterQueue with at least one resource group is present. Controls the non-admin empty-state message. |
| **MetricsCommonContext** | Shared context from `concepts/metrics/` that manages the user-selected refresh interval (30 s to 30 min) for all polling in this area. |

## Quick Start

```bash
# Log in to a cluster that has Kueue installed and configured in the DSC
oc login <cluster-url>

# Enable the feature flag if not already set
oc patch odhdashboardconfig odh-dashboard-config -n redhat-ods-applications \
  --type=merge -p '{"spec":{"dashboardConfig":{"disableDistributedWorkloads":false}}}'

# Start the frontend dev server
cd frontend
npm run start:dev:ext

# Navigate to the area
open http://localhost:4010/observe-monitor/workload-metrics/workload-status
```

To see meaningful data locally, apply ClusterQueue, LocalQueue, and Workload CRs to the cluster.
Sample manifests are available in the Kueue project repository. The E2E Cypress test setup helpers
in `packages/cypress/cypress/utils/oc_commands/distributedWorkloads.ts` (`createKueueResources`,
`deleteKueueResources`) show the minimum resource set required.

> **Note**: The E2E tests require Kueue set to `Unmanaged` in the DSC. Managed mode has Kueue
> controlled by RHOAI operators; changes applied manually may be overwritten.

## Testing

### Unit Tests

Location: `frontend/src/concepts/distributedWorkloads/__tests__/`

Tests cover `useClusterQueues`, `useLocalQueues`, `useWorkloads` (hook behavior with
`NotReadyError` guards), and `utils` (status derivation, resource math).

```bash
cd frontend
npm run test:unit -- --testPathPattern="distributedWorkloads"
```

### Cypress Mock Tests

Location: `packages/cypress/cypress/tests/mocked/distributedWorkloads/`

The file `globalDistributedWorkloads.cy.ts` intercepts k8s API calls and returns mock
`ClusterQueue`, `LocalQueue`, `Workload`, and Prometheus response fixtures. It exercises tab
rendering, empty states (no queues, no workloads), status label colors, table sorting, and
the project selector redirect behavior.

```bash
npm run test:cypress-ci -- --spec "**/distributedWorkloads/**"
```

### Cypress E2E Tests

Location: `packages/cypress/cypress/tests/e2e/distributedWorkloadMetrics/`

The file `testWorkloadMetricsDefaultPageContents.cy.ts` runs against a live cluster. It
creates a real project, applies Kueue resources via `oc`, navigates to the page, and verifies
requested-resources values and the refresh-interval selector. Requires Kueue in Unmanaged mode.

```bash
npm run cypress:run -- --spec "**/distributedWorkloadMetrics/**"
```

## Cypress Test Coverage

The mock test suite covers the following flows:

- Landing on the page with no projects (empty state).
- Landing with projects but no ClusterQueue configured (admin vs. non-admin message variants).
- Landing with queues present but no workloads (no-workload empty state per tab).
- Workload status tab: donut chart legend entries per `WorkloadStatusType`, table rows with correct
  status labels, table sorting by name / priority / status / created.
- Project metrics tab: bullet chart rendering for CPU and memory, top-5 consuming workloads list,
  workload resource metrics table rows.
- Project selector: switching projects navigates to the correct namespaced URL.
- Refresh interval: the `MetricsPageToolbar` refresh selector is present and functional.

E2E coverage is narrower — it validates the default page load and `RequestedResources` section
values against real Kueue data. There is no E2E coverage for workload status tab interactions or
error states.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Kueue (ClusterQueue, LocalQueue, Workload CRDs) | Backend Route / k8s proxy | Dashboard backend proxies `GET /apis/kueue.x-k8s.io/v1beta1/clusterqueues` and namespaced `/localqueues`, `/workloads` to the cluster. |
| Prometheus | Backend Route | `useDWProjectCurrentMetrics` calls the dashboard backend's Prometheus proxy for CPU/memory usage grouped by workload owner label. |
| `ProjectsContext` | Frontend Concept | Supplies the project list and preferred project for navigation and namespace validation. |
| `MetricsCommonContext` | Frontend Concept | Provides the refresh interval that all polling hooks consume. |
| `concepts/areas` (`SupportedArea.DISTRIBUTED_WORKLOADS`) | Frontend Concept | Feature-flag gate; reads `OdhDashboardConfig` and DSC status to determine availability. |
| `concepts/metrics/MetricsPageToolbar` | Frontend Component | Renders the refresh-interval dropdown above the tab content. |

All k8s calls in this area are read-only (`GET`/`LIST`). There are no mutations — users cannot
create, update, or delete Kueue resources from this UI.

## Known Issues / Gotchas

- ClusterQueue filtering: the context filters `allClusterQueues` down to only those referenced by
  at least one LocalQueue in the selected namespace AND that have at least one resource group. A
  ClusterQueue that exists but has no `spec.resourceGroups` is silently excluded, which can make
  the queue appear unconfigured even when it exists.
- Lazy loading not yet implemented: the context provider fetches all three resource types
  (ClusterQueues, LocalQueues, Workloads) on mount regardless of which tab is active. A `// TODO`
  comment in `DistributedWorkloadsContext.tsx` tracks this.
- The `cqExists` flag reflects whether any valid ClusterQueue exists cluster-wide, not specifically
  for the selected project. A non-admin user who sees "Configure the cluster queue" may be looking
  at a namespace that has a LocalQueue but no matching ClusterQueue, not a global absence.
- Status derivation is entirely client-side: `getStatusInfo` evaluates `WorkloadCondition` entries
  in a fixed priority order. If Kueue writes conditions in an unexpected order or omits a condition,
  the displayed status may differ from what the Kueue controller considers current.
- E2E tests require manual cluster pre-configuration (Kueue installed, set to Unmanaged in DSC).
  The test file guards with `isKueueUnmanaged()` and skips if the check fails, so CI environments
  without Kueue will silently skip the suite.

## Related Docs

- [Guidelines] — documentation style guide
- [BOOKMARKS] — full doc index
- [Backend Overview] — backend architecture reference
