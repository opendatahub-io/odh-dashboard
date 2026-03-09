[Guidelines]: ../../docs/guidelines.md
[BOOKMARKS]: ../../docs/BOOKMARKS.md
[Architecture]: ../../docs/architecture.md
[Backend Overview]: ../../backend/docs/overview.md
[Projects Doc]: projects.md

# Workbenches

**Last Updated**: 2026-03-09 | **Template**: frontend-template v1

## Overview

The Workbenches area lets data scientists create, configure, start, stop, and delete JupyterLab
notebook servers (Kubernetes `Notebook` CRs) within a Data Science Project. Each workbench runs
as a dedicated pod with a chosen container image, resource size, environment variables, attached
storage, and optional GPU/accelerator. Admins also have access to a standalone Notebook Controller
view for managing notebooks across users.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Workbenches tab (inside a project) | `/projects/:namespace/spawner` (create) | `notebookController.enabled` in `OdhDashboardConfig` |
| Workbenches tab (inside a project) | `/projects/:namespace` → Workbenches section | `notebookController.enabled` |
| Notebook Controller (admin + non-admin) | `/notebookController` | `notebookController.enabled` |
| Admin user management | `/notebookController/admin` | `notebookController.enabled` + admin role |

Users reach the Workbenches tab by selecting a Data Science Project from the left navigation and
clicking the **Workbenches** tab in the project detail view. The standalone Notebook Controller
(`/notebookController`) is a legacy entry point that pre-dates the Projects area; it remains for
environments where users spawn notebooks outside a named project. The feature is gated by
`dashboardConfig.spec.notebookController.enabled` (defaults to `true` when absent); the
`useCheckJupyterEnabled` hook in
`frontend/src/utilities/notebookControllerUtils.ts` reads this flag and redirects to `/` when
disabled.

## Architecture

```text
frontend/src/pages/notebookController/       # Standalone Notebook Controller (legacy entry point)
├── NotebookController.tsx                   # Root: checks feature flag, routes admin vs user
├── NotebookControllerContext.tsx            # Context provider for current notebook state
├── notebookControllerContextTypes.ts        # Context type definitions
├── SetupCurrentNotebook.tsx                 # Resolves the user's current notebook from context
├── ValidateNotebookNamespace.tsx            # Guards namespace access before rendering children
├── useAdminTabState.ts                      # Tracks active admin tab
├── useImpersonationForContext.ts            # Allows admins to impersonate other users
├── useNamespaces.ts                         # Fetches allowed namespaces
├── utils.ts
└── screens/
    ├── server/                              # User-facing: spawn / manage own notebook
    │   ├── SpawnerPage.tsx                  # Image + size + env var selection form
    │   ├── NotebookServer.tsx               # Running notebook panel
    │   ├── NotebookServerRoutes.tsx         # React Router sub-routes for server screens
    │   ├── ImageSelector.tsx                # Notebook image picker
    │   ├── StartServerModal.tsx             # Start-progress modal
    │   ├── StopServerModal.tsx              # Stop confirmation modal
    │   └── useAcceleratorProfiles.ts        # Loads hardware/accelerator profile options
    └── admin/                               # Admin-only: manage all users' notebooks
        ├── NotebookControllerTabs.tsx
        └── NotebookServerDetails.tsx

frontend/src/pages/projects/                 # Projects-area workbench integration
├── notebook/                               # Workbench row-level components + logic
│   ├── NotebookActionsColumn.tsx           # Start / stop / delete action menu
│   ├── NotebookRouteLink.tsx               # Open workbench link (calls useGetNotebookRoute)
│   ├── NotebookStateStatus.tsx             # Running / stopped / starting status badge
│   ├── DeleteNotebookModal.tsx
│   ├── StopNotebookConfirmModal.tsx
│   ├── useNotebooksStates.ts               # Polls notebook pod status via useFetchState
│   └── types.ts                            # NotebookState shape
└── screens/
    ├── detail/notebooks/                   # Workbenches tab inside a project
    │   ├── NotebookTable.tsx               # PF Table listing all workbenches in a project
    │   ├── NotebookTableRow.tsx
    │   ├── NotebookList.tsx
    │   └── useNotebookImageData.ts         # Resolves notebook image metadata
    └── spawner/                            # Create / edit workbench wizard
        ├── SpawnerPage.tsx
        ├── EditSpawnerPage.tsx
        ├── spawnerUtils.ts
        ├── imageSelector/                  # Image stream tag picker
        ├── environmentVariables/           # Secret / ConfigMap env var injection UI
        └── storage/                        # PVC attachment UI

frontend/src/concepts/notebooks/            # Shared notebook logic (used by both entry points)
├── utils.ts                                # getRoutePathForWorkbench, notebook helpers
├── StartNotebookModal.tsx
└── useStopWorkbenchModal.tsx

frontend/src/api/k8s/notebooks.ts           # k8s CRUD for Notebook CR
frontend/src/utilities/useGetNotebookRoute.ts  # Resolves workbench URL (see v3.0 note)
```

Page rendering follows a **project → tab → table → action** hierarchy. The project detail page
(`ProjectDetails.tsx`) renders the Workbenches tab, which mounts `NotebookList` → `NotebookTable`.
Each table row renders live status by polling `useNotebooksStates` (backed by
`useFetchState` with `POLL_INTERVAL`). Creating or editing a workbench navigates to `SpawnerPage`
or `EditSpawnerPage`, which compose image selection, resource sizing, environment variables, and
storage into a single form.

The standalone `NotebookController` shares the spawner form but wraps it in
`NotebookControllerContextProvider`, which tracks the current user's notebook across the session
and supports admin impersonation via `useImpersonationForContext`.

## State Management

**Contexts used**:
- [`NotebookControllerContext`](../src/pages/notebookController/NotebookControllerContext.tsx) —
  holds the current user's `NotebookKind`, running state, pod UID, workbench link, and
  impersonation state; used by the standalone Notebook Controller screens only.
- [`ProjectDetailsContext`](../src/pages/projects/ProjectDetailsContext.tsx) — holds the active
  project and its associated notebooks, PVCs, and connections; used by the Projects-area workbench
  tab.

**Key hooks**:
- `useNotebooksStates` in `frontend/src/pages/projects/notebook/useNotebooksStates.ts` — wraps
  `useFetchState` with `POLL_INTERVAL` to track pod-level running status for all workbenches in
  a namespace.
- `useGetNotebookRoute` in `frontend/src/utilities/useGetNotebookRoute.ts` — resolves the URL
  used to open a workbench; uses `getRoutePathForWorkbench` (same-origin path) when
  `inject-auth` annotation is present, otherwise falls back to fetching an OpenShift Route.
- `useCheckJupyterEnabled` in `frontend/src/utilities/notebookControllerUtils.ts` — reads
  `dashboardConfig.spec.notebookController.enabled`; used as a guard in the router.
- `useAcceleratorProfiles` in
  `frontend/src/pages/notebookController/screens/server/useAcceleratorProfiles.ts` — fetches
  hardware profiles for GPU/accelerator selection in the spawner form.
- `useNotebookImageData` in
  `frontend/src/pages/projects/screens/detail/notebooks/useNotebookImageData.ts` — resolves the
  `ImageStream` tag metadata displayed on each workbench row.
- `useNotebookEnvVariables` in
  `frontend/src/pages/projects/screens/spawner/environmentVariables/useNotebookEnvVariables.tsx`
  — loads and manages the environment variable form state (secrets, ConfigMaps, key-value pairs).

**Data flow**: `useFetchState` fetches `NotebookKind[]` from the k8s API via
`frontend/src/api/k8s/notebooks.ts`. The array is passed into `useNotebooksStates`, which
augments each notebook with live pod status. Components read the resulting `NotebookState[]` from
`ProjectDetailsContext` and render status badges, action menus, and open links.

## PatternFly Component Usage

| Component | Usage in this area |
|-----------|--------------------|
| `Table` (PF override) | Lists workbenches in the project detail Workbenches tab (`NotebookTable.tsx`) |
| `Label` / status badges | `NotebookStateStatus.tsx` renders running/stopped/starting states |
| `ActionMenu` / `KebabToggle` | `NotebookActionsColumn.tsx` for start, stop, edit, delete actions |
| `Modal` | `DeleteNotebookModal`, `StopNotebookConfirmModal`, `StartServerModal`, `StopServerModal` |
| `Button` (link variant) | `NotebookRouteLink.tsx` opens the workbench in a new tab |
| `Form` / `FormGroup` | Spawner page fields: image, size, env vars, storage, accelerator |
| `Alert` | `NotebookRestartAlert` warns about pending image updates; Elyra version alerts |

The `Table` import comes from `#~/components/table` (the PF override in
`frontend/src/components/pf-overrides/`), not directly from `@patternfly/react-table`. Use the
override to get the corrected layout behaviour.

## Key Concepts

| Term | Definition |
|------|-----------|
| **Workbench** | A JupyterLab notebook server running as a Kubernetes `Notebook` CR (kind: `Notebook`, group: `kubeflow.org`). The user-facing label "Workbench" replaced "Notebook server" in the UI. |
| **Notebook CR** | The custom Kubernetes resource (`NotebookKind` in TypeScript) that defines the workbench pod spec, image, resources, volumes, and annotations. |
| **NotebookImage** | A container image exposed via an OpenShift `ImageStream` and `ImageStreamTag`, selected by the user in the spawner form. |
| **WorkbenchSize** | A pre-defined CPU/memory resource preset (e.g., Small, Medium, Large) listed in `OdhDashboardConfig`; surfaced in the spawner as "Container size". |
| **PVC** | A `PersistentVolumeClaim` attached to the workbench pod for persistent storage; users can attach existing PVCs or create new ones during workbench creation. |
| **Accelerator / Hardware Profile** | A named GPU or accelerator configuration (toleration + resource limit) loaded via `useAcceleratorProfiles`; applied to the notebook pod spec. |
| **inject-auth annotation** | `notebooks.opendatahub.io/inject-auth: "true"` on a `Notebook` CR signals that the workbench uses the Gateway-based same-origin route instead of an individual OpenShift Route. |
| **SSAR** | `SelfSubjectAccessReview` — used to check whether the current user has permission to access notebook resources before rendering the Workbenches tab. |
| **POLL_INTERVAL** | The shared polling cadence (defined in `frontend/src/utilities/const.ts`) used by `useNotebooksStates` to refresh pod running status. |

## Quick Start

```bash
# 1. Log in to a cluster with ODH deployed
oc login <cluster-url>

# 2. Start the frontend dev server pointing at the cluster
cd frontend
npm run start:dev:ext

# 3. Open the dashboard
# Navigate to http://localhost:4010
# Select or create a Data Science Project, then open the Workbenches tab.
```

To exercise the standalone Notebook Controller, navigate to
`http://localhost:4010/notebookController`. Ensure `OdhDashboardConfig.spec.notebookController.enabled`
is not set to `false` in the cluster — if it is, the route redirects to `/`.

To test the v3.0 same-origin routing path locally, create a `Notebook` CR with the annotation
`notebooks.opendatahub.io/inject-auth: "true"`. The "Open" link will use the relative path
`/notebook/<namespace>/<name>` rather than resolving an OpenShift Route.

## Testing

### Unit Tests

Location: `frontend/src/pages/projects/screens/detail/notebooks/__tests__/`

Key files:
- `useNotebookImageData.spec.ts` — verifies image metadata resolution logic
- `utils.spec.ts` — notebook utility function coverage

```bash
cd frontend
npm run test:unit -- --testPathPattern="notebooks"
```

Additional unit tests live in:
- `frontend/src/concepts/__tests__/StartNotebookModal.spec.tsx`
- `frontend/src/pages/notebookController/screens/admin/__tests__/useCheckForAllowedUsers.spec.ts`

```bash
npm run test:unit -- --testPathPattern="notebookController|StartNotebookModal"
```

### Cypress Mock Tests

Location: `packages/cypress/cypress/tests/mocked/projects/tabs/workbench.cy.ts`

```bash
npm run test:cypress-ci -- --spec "**/mocked/projects/tabs/workbench*"
```

Additional mocked coverage:
- `packages/cypress/cypress/tests/mocked/hardwareProfiles/workbenchHardwareProfiles.cy.ts`
- `packages/cypress/cypress/tests/mocked/applications/notebookServer.cy.ts`

### Cypress E2E Tests

Location: `packages/cypress/cypress/tests/e2e/dataScienceProjects/workbenches/`

```bash
npm run cypress:run -- --spec "**/dataScienceProjects/workbenches/**"
```

## Cypress Test Coverage

Mock tests cover: workbench list rendering, status badge states, start/stop/delete action flows,
hardware profile selection in the spawner, and image character-limit validation. These tests run
against intercepted API fixtures and do not require a live cluster.

E2E tests cover: full workbench creation with image and size selection
(`testWorkbenchCreation.cy.ts`), start/stop lifecycle (`testWorkbenchControlSuite.cy.ts`), image
update flows (`testWorkbenchImages.cy.ts`), environment variable injection
(`testWorkbenchVariables.cy.ts`), storage class attachment (`testWorkbenchStorageClasses.cy.ts`),
negative / error-path scenarios (`testWorkbenchNegativeTests.cy.ts`), and status polling
(`testWorkbenchStatus.cy.ts`).

Gap: there is no mock-level test for the Edit Workbench (`EditSpawnerPage`) flow; only E2E tests
cover editing an existing workbench.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `packages/notebooks` | Package | Shared notebook utilities and types consumed by the spawner and notebook controller |
| Projects area | Frontend Area | `ProjectDetailsContext` supplies notebook list and project namespace to the Workbenches tab |
| `frontend/src/api/k8s/notebooks.ts` | Backend Route (k8s pass-through) | CRUD operations on `Notebook` CR via the OpenShift SDK proxy |
| `frontend/src/api/k8s/routes.ts` | Backend Route (k8s pass-through) | Fetches OpenShift `Route` objects for pre-v3.0 workbench URL resolution |
| `frontend/src/concepts/pipelines/elyra/` | Frontend Concept | `CanEnableElyraPipelinesCheck` and `ElyraInvalidVersionAlerts` render inside `NotebookTable` to surface pipeline integration status |
| `frontend/src/concepts/userSSAR/AccessReviewContext.tsx` | Frontend Concept | SSAR check confirms the user can access notebook resources before the tab renders |
| `packages/model-serving` | Package | Model-serving connections can be injected as environment variables when creating a workbench |
| `OdhDashboardConfig` CR | Kubernetes resource | Supplies `notebookController.enabled`, notebook sizes, and accelerator defaults read at startup |

## Known Issues / Gotchas

- **v3.0 routing change**: Workbenches with the `inject-auth` annotation use the same-origin
  relative path `/notebook/{namespace}/{name}` (via `getRoutePathForWorkbench`). Workbenches
  _without_ the annotation still fall back to fetching an OpenShift `Route` object via
  `listRoutes`. Do not assume all workbenches use the Gateway path until the annotation is
  confirmed present.

- **Route polling removed**: Before v3.0 the frontend polled the Route API to detect when a
  workbench became reachable. That polling is gone for inject-auth workbenches. If you see
  stale "not ready" states on a v3.0 cluster, verify the annotation is applied.

- **`notebookController.enabled` default**: The flag defaults to `true` when absent from
  `OdhDashboardConfig.spec.notebookController`. Setting it to `false` disables the entry points
  but does not delete existing `Notebook` CRs.

- **Admin impersonation state**: `useImpersonationForContext` stores the impersonated username in
  React state only (not URL or localStorage). Refreshing the page clears impersonation without
  warning.

- **`Table` import**: Always import `Table` from `#~/components/table`, not from
  `@patternfly/react-table` directly. The override fixes layout regressions present in the
  upstream PF component.

- **Elyra version alerts**: `ElyraInvalidVersionAlerts` wraps the entire `NotebookTable` and can
  hide the table body if Elyra version data is still loading. This is expected behaviour, not a
  rendering bug.

## Related Docs

- [Guidelines] — documentation style guide for this repo
- [BOOKMARKS] — full doc index
- [Architecture] — overall ODH Dashboard architecture including the v3.0 routing and auth changes
- [Backend Overview] — backend architecture, k8s pass-through patterns, and SSAR usage
- [Projects Doc] — Data Science Projects area doc; the Workbenches tab lives inside it
