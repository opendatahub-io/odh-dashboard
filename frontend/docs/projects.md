[Guidelines]: ../../docs/guidelines.md
[Architecture]: ../../docs/architecture.md
[BOOKMARKS]: ../../docs/BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[ProjectsContext]: ../src/concepts/projects/ProjectsContext.tsx
[ProjectDetailsContext]: ../src/pages/projects/ProjectDetailsContext.tsx
[ProjectViewRoutes]: ../src/pages/projects/ProjectViewRoutes.tsx
[ProjectDetails]: ../src/pages/projects/screens/detail/ProjectDetails.tsx
[ProjectView]: ../src/pages/projects/screens/projects/ProjectView.tsx
[accessChecks]: ../src/concepts/projects/accessChecks.tsx

# Data Science Projects

**Last Updated**: 2026-03-09 | **Template**: frontend-template v1

## Overview

The Data Science Projects area is the primary hub for users in ODH Dashboard. It maps
each Data Science Project to an OpenShift/Kubernetes namespace and provides a single
place to create and manage all project-scoped resources: workbenches, pipelines,
deployed models, cluster storage, connections, and access permissions.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Data Science Projects | `/projects` | `DS_PROJECTS_VIEW` (`SupportedArea.DS_PROJECTS_VIEW`) |
| Project detail | `/projects/:namespace` | `DS_PROJECTS_VIEW` |
| Create/edit workbench | `/projects/:namespace/spawner` | `WORKBENCHES` (`SupportedArea.WORKBENCHES`) |
| Edit workbench | `/projects/:namespace/spawner/:notebookName` | `WORKBENCHES` |
| Assign permissions | `/projects/:namespace/permissions/assign` | `DS_PROJECTS_PERMISSIONS` |
| Model metrics | `/projects/:namespace/metrics/model/:inferenceService` | Model metrics feature flag |

Users reach the area through "Data Science Projects" in the left navigation. From the
project list they click a project name to open the detail view. The detail view uses
`?section=<id>` query parameters (not sub-routes) to switch between tabs, keeping the
URL shareable without triggering a full navigation.

## Architecture

```text
frontend/src/pages/projects/
├── ProjectViewRoutes.tsx          # Top-level router: list + detail
├── ProjectDetailsContext.tsx      # Context provider wrapping all detail tabs
├── screens/
│   ├── projects/                  # Project list screen
│   │   ├── ProjectView.tsx        # Page shell; SSAR for create permission
│   │   ├── ProjectListView.tsx    # Table of all user-visible projects
│   │   ├── ManageProjectModal.tsx # Create/edit project modal
│   │   └── DeleteProjectModal.tsx
│   ├── detail/                    # Per-project detail screen
│   │   ├── ProjectDetails.tsx     # Tab host (GenericHorizontalBar)
│   │   ├── overview/              # Overview tab
│   │   ├── notebooks/             # Workbenches tab
│   │   ├── pipelines/             # Pipelines tab
│   │   ├── storage/               # Cluster storage tab
│   │   └── connections/           # Connections tab
│   └── spawner/                   # Create/edit workbench full-page form
│       ├── SpawnerPage.tsx
│       └── EditSpawnerPage.tsx
├── projectPermissions/            # Permissions tab (RBAC variant)
├── projectSharing/                # Permissions tab (legacy sharing variant)
├── projectSettings/               # Settings tab (bias metrics)
├── notebook/                      # Notebook state hooks and utilities
├── pvc/                           # PVC field components and utilities
├── dataConnections/               # AWS field components (legacy)
└── components/                    # Shared project-scoped components
```

`ProjectViewRoutes` defines the React Router tree. The `/:namespace/*` branch mounts
`ProjectDetailsContextProvider` as a layout route, which resolves the namespace param
to a `ProjectKind`, starts all polling hooks, and renders child routes via `<Outlet>`.
`ProjectDetails` is the index child; it renders a `GenericHorizontalBar` whose visible
tabs are computed at render time based on `SupportedArea` availability checks and SSAR
results. Tab switching updates `?section=` in the URL without re-mounting the context
provider or restarting any polls.

## State Management

**Contexts used**:
- [`ProjectsContext`][ProjectsContext] (`frontend/src/concepts/projects/ProjectsContext.tsx`)
  — holds the full list of `ProjectKind` objects visible to the user, the preferred
  project, and a `waitForProject` helper used after project creation to wait for the
  namespace to propagate before navigating.
- [`ProjectDetailsContext`][ProjectDetailsContext] (`frontend/src/pages/projects/ProjectDetailsContext.tsx`)
  — holds all resource lists scoped to the current project: notebooks, PVCs,
  connections, serving runtimes, inference services, server secrets, role bindings,
  hardware profiles, local queues, and Kueue workload statuses. Also exposes
  `filterTokens` for looking up model-serving secrets by runtime name.

**Key hooks**:
- `useProjectNotebookStates` in `notebook/useProjectNotebookStates.ts` — fetches
  `NotebookKind` resources and merges runtime state (running/stopped/starting) into
  `NotebookState[]`; polls at `POLL_INTERVAL`.
- `useProjectPvcs` in `screens/detail/storage/useProjectPvcs.ts` — calls
  `getDashboardPvcs(namespace)`; polls at `POLL_INTERVAL`.
- `useConnections` in `screens/detail/connections/useConnections.ts` — fetches
  `Secret` resources tagged as connections in the project namespace.
- `useProjectSharing` / `useProjectKueueInfo` — fetch role bindings and Kueue local
  queue objects respectively.
- `useProjectPermissionsTabVisible` in `concepts/projects/accessChecks.tsx` — runs an
  SSAR to determine whether the current user can see and interact with the Permissions
  tab.
- `useSyncPreferredProject` — keeps `ProjectsContext.preferredProject` in sync when
  the user navigates into a specific project.

**Data flow**: `ProjectsContextProvider` (mounted at app root) fetches all projects
once and re-fetches on demand. When the user navigates to `/:namespace`,
`ProjectDetailsContextProvider` resolves the project from the already-loaded list,
starts per-resource polling hooks, and provides results to every tab component via
`useContext(ProjectDetailsContext)`. Tab components read from context and do not issue
their own API calls for resources already held there.

## PatternFly Component Usage

| Component | Usage in this area |
|-----------|--------------------|
| `Tabs` / `Tab` (via `GenericHorizontalBar`) | Horizontal tab bar on the project detail page; active tab driven by `?section=` query param |
| `Table` / `Thead` / `Tr` / `Td` | Resource lists on Workbenches, Storage, and Connections tabs |
| `Modal` | Create project, delete project, manage connections, delete PVC, stop workbench, and permission-assignment modals |
| `Card` / `Gallery` | Overview tab; deployed model cards in `DeployedModelsGallery` |
| `Breadcrumb` | Project detail header: "Projects > <project name>" |
| `Alert` | Inline Kueue-disabled warning on the detail page; dismissable via `AlertActionCloseButton` |
| `Truncate` | Project display name in the page title and breadcrumb |
| `EmptyState` | Empty project list (`EmptyProjects`) and empty resource tables |
| `Label` | "Tech preview" label on the RBAC Permissions tab |

The `GenericHorizontalBar` wrapper in `frontend/src/pages/projects/components/` renders
a PatternFly `Tabs` component and maps each section definition to a `Tab`. It does not
use PF overrides from `src/components/pf-overrides`; the standard `Table` override from
`src/components/pf-overrides/Table.tsx` is used inside each resource list.

## Key Concepts

| Term | Definition |
|------|-----------|
| **DataScienceProject** | An OpenShift `Project` (namespace) annotated with `opendatahub.io/...` labels that make it visible to ODH Dashboard. Creating a project via the dashboard sets these annotations and provisions a service account. |
| **Connection** | A `Secret` in the project namespace typed with `opendatahub.io/connection-type` annotations. Connections hold credentials for external services (S3, databases, etc.) and can be attached to workbenches or model servers. |
| **PVC (cluster storage)** | A `PersistentVolumeClaim` in the project namespace. The dashboard filters for PVCs created by ODH (`getDashboardPvcs`) and presents them on the Cluster Storage tab. |
| **RoleBinding (permission)** | A Kubernetes `RoleBinding` granting a user or group `edit` or `admin` access to the project namespace. The Permissions tab manages these. |
| **NotebookState** | A combined object (`notebook/types.ts`) wrapping a `NotebookKind` with derived runtime status (running, stopped, starting, error) computed from the notebook's pod phase and annotations. |
| **GenericHorizontalBar** | The shared tab-host component used on the project detail page. Accepts a `sections` array and renders a PF `Tabs` component; active tab is the `?section=` query parameter. |
| **SSAR** | SelfSubjectAccessReview — a Kubernetes API used to check whether the current user can perform a specific verb on a resource, without relying on Group membership. Used to gate the Permissions tab and the "Create project" button. |
| **ProjectSectionID** | Enum (`screens/detail/types.ts`) defining the string IDs for each tab: `overview`, `workbenches`, `cluster-storages`, `connections`, `model-server`, `pipelines-projects`, `permissions`, `settings`, `feature-store-integration`. |
| **LocalQueue / Kueue** | If a project is configured for Kueue workload allocation, `useProjectKueueInfo` fetches `LocalQueue` objects. When Kueue is disabled at the cluster level, an inline alert prompts users to contact their administrator. |

## Quick Start

```bash
# Log in to a cluster with ODH installed
oc login <cluster-url>

# Start the frontend in dev mode against the remote cluster
cd frontend
npm run start:dev:ext

# Open the projects list
# http://localhost:4010/projects
```

To exercise the Permissions tab, ensure `DS_PROJECTS_PERMISSIONS` is enabled in the
cluster's `OdhDashboardConfig`. To see the RBAC variant (tech preview), also enable
`PROJECT_RBAC_SETTINGS`. To test pipeline tab rendering, a pipeline server must be
running in the target project namespace.

## Testing

### Unit Tests

Location: `frontend/src/pages/projects/__tests__/` and sub-directory `__tests__/`
folders (e.g., `notebook/__tests__/`, `projectPermissions/__tests__/`,
`screens/detail/**/__tests__/`).

```bash
npm run test:unit -- --testPathPattern="pages/projects"
```

Key unit test files:
- `projectPermissions/__tests__/ProjectPermissions.spec.tsx` — tab render and SSAR gating
- `projectPermissions/__tests__/roleBindingMutations.spec.ts` — RoleBinding CRUD logic
- `screens/detail/connections/__tests__/useConnections.spec.tsx` — connection fetch hook
- `screens/detail/storage/__tests__/useProjectPvcs.spec.ts` — PVC fetch hook
- `notebook/__tests__/useKueueStatusForNotebooks.spec.ts` — Kueue status merging

### Cypress Mock Tests

Location: `packages/cypress/cypress/tests/mocked/projects/`

```bash
npm run test:cypress-ci -- --spec "**/projects/**"
```

### Cypress E2E Tests

No dedicated E2E directory for projects; E2E coverage is handled through broader
cluster-level tests. Use mock tests for feature-level validation.

## Cypress Test Coverage

Mock tests cover the following flows:

- `projectList.cy.ts` — project list rendering, create project modal, delete project
  modal, empty state when no projects exist.
- `projectDetails.cy.ts` — project detail page loading, tab visibility based on feature
  flags, Kueue-disabled alert rendering.
- `tabs/workbench.cy.ts` — workbench table, start/stop workbench, create workbench
  navigation, Kueue status badge.
- `tabs/clusterStorage.cy.ts` — storage table, add/delete PVC modal, workbench
  attachment display.
- `tabs/connections.cy.ts` — connection table, add/delete connection modal, connected
  resources display.
- `tabs/permissions.cy.ts` — legacy sharing tab: user/group add and remove flows.
- `tabs/permissionsRbac.cy.ts` — RBAC Permissions tab: role assignment table, inline
  editing, save/discard flows.
- `tabs/permissionsRbacAssignRoles.cy.ts` — full-page Assign Roles form flow.
- `tabs/modelServingNim.cy.ts` — NIM model deployment card on the Overview tab.

The spawner (workbench create/edit) form is covered by its own Cypress spec in
`mocked/workbenches/` rather than under `projects/`.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `concepts/projects/ProjectsContext` | Frontend concept | Provides the global project list to the list view and to `ProjectDetailsContextProvider` for namespace resolution |
| `concepts/pipelines/context` | Frontend concept | `PipelineContextProvider` wraps the detail route when `DS_PIPELINES` is enabled; pipeline tab consumes its context |
| Workbenches area (`pages/modelServing`, notebookController) | Frontend area | Spawner pages and notebook state hooks live in `projects/` but delegate image/hardware-profile data to model-serving and notebook-controller concepts |
| model-serving / kserve package | Frontend area | `useServingRuntimes`, `useInferenceServices`, and `useServingRuntimeSecrets` are imported from `pages/modelServing/`; Deployments tab content comes from `concepts/projects/projectDetails/useDeploymentsTab` |
| model-registry package | Package interaction | The Overview tab's served-model cards can link to model registry entries; no direct import — navigation only |
| `api` (k8s SDK) | Backend route | All resource CRUD goes through the dashboard backend proxy (`/api/k8s/...`); project creation uses the service account via `/api/namespaces` |
| `concepts/areas` (`SupportedArea`) | Frontend concept | `useIsAreaAvailable` gates every optional tab; flags are read from `OdhDashboardConfig` fetched at app start |
| `concepts/hardwareProfiles/kueueUtils` | Frontend concept | `useKueueConfiguration` determines whether Kueue is disabled for the current project and drives the inline alert |

## Known Issues / Gotchas

- The `?section=` query parameter approach means that sharing a tab URL requires the
  full query string. Links generated elsewhere in the app (e.g., from the Overview tab
  to Workbenches) must include `?section=workbenches` — omitting it lands on Overview.
- The Permissions tab has two implementations: the legacy `ProjectSharing` component
  (role bindings managed as a flat list) and the newer `ProjectPermissions` component
  behind `PROJECT_RBAC_SETTINGS`. Both are rendered under `ProjectSectionID.PERMISSIONS`
  — only one is shown at a time. Do not remove the legacy path until the RBAC variant
  exits tech preview.
- `ProjectDetailsContextProvider` starts all polling hooks unconditionally when a
  project is loaded. If a user has access to the project namespace but not to specific
  resources (e.g., `InferenceService`), the corresponding hook will error silently and
  return an empty list. Check `FetchStateObject.error` in consuming components before
  assuming empty = none exist.
- Project creation calls `projectrequests` (OpenShift API) via SSAR; on vanilla
  Kubernetes (non-OpenShift) deployments this call fails. The `allowCreate` flag falls
  back to `false` and the "Create project" button is hidden — this is intentional.
- Workbench routes changed in v3.0 from individual OpenShift Routes to same-origin
  `/notebook/{namespace}/{name}` paths. Any code that reads `route.spec.host` for
  notebooks is deprecated; use `NotebookRouteLink` which generates the gateway path.

## Related Docs

- [Guidelines] — documentation style guide
- [Architecture] — overall client and backend architecture
- [BOOKMARKS] — full doc index
- [Backend Overview] — backend architecture reference
