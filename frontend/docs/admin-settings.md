[Guidelines]: ../../docs/guidelines.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[Admin Dashboard]: ../../docs/admin-dashboard.md

# Admin Settings

**Last Updated**: 2026-03-09 | **Template**: frontend-template v1

## Overview

Admin Settings groups six admin-only configuration page sections under the "Settings" left-nav
item. These pages let cluster administrators control global dashboard behaviour: PVC defaults,
notebook culling, user/group access, storage class availability, GPU hardware profiles, custom
notebook images, and reusable connection type schemas. All pages require admin role; non-admins
never see the "Settings" nav section.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Settings > Cluster settings | `/settings/cluster-settings` | None (admin role only) |
| Settings > User management | `/settings/user-management` | None (admin role only) |
| Settings > Storage classes | `/settings/storage-classes` | None (admin role only) |
| Settings > Hardware profiles | `/settings/hardware-profiles` | None (admin role only) |
| Settings > Workbench images | `/settings/environment-setup/workbench-images` | None (admin role only) |
| Settings > Connection types | `/settings/connection-types` | None (admin role only) |

The "Settings" group is rendered in the left nav only when the dashboard determines the current
user has admin access (SSAR check against the dashboard auth resource). Direct URL access to any
of these routes redirects non-admins to a 403 page.

## Architecture

```text
frontend/src/pages/
├── clusterSettings/
│   ├── ClusterSettings.tsx          # Page root; owns all cluster-settings state
│   ├── PVCSizeSettings.tsx          # PVC default size sub-form
│   ├── CullerSettings.tsx           # Notebook idle-culling timeout sub-form
│   ├── TelemetrySettings.tsx        # User tracking opt-in/out toggle
│   ├── ModelServingPlatformSettings.tsx  # kServe / ModelMesh platform toggles
│   ├── ModelDeploymentSettings.tsx  # Default deployment strategy (rolling/recreate)
│   ├── const.ts                     # Default values and validation limits
│   └── useDefaultDsc.ts             # Hook to read DSC defaults
├── groupSettings/
│   └── GroupSettings.tsx            # Admin/user OpenShift group assignment page
├── storageClasses/
│   ├── StorageClassesPage.tsx       # Page root; wraps context provider
│   ├── StorageClassesContext.tsx    # Context: list + config annotations
│   ├── StorageClassesTable.tsx      # PF Table of all storage classes
│   ├── StorageClassesTableRow.tsx   # Per-row enable switch + default radio
│   ├── StorageClassEditModal.tsx    # Edit display name / description modal
│   └── utils.ts                     # Config annotation read/write helpers
├── hardwareProfiles/
│   ├── HardwareProfiles.tsx         # List page
│   ├── HardwareProfilesRoutes.tsx   # Routes; SSAR-gated on HardwareProfile create
│   ├── HardwareProfilesTable.tsx    # PF Table of profiles
│   ├── manage/
│   │   ├── ManageHardwareProfile.tsx      # Create/edit form page
│   │   ├── ManageNodeResourceSection.tsx  # CPU/memory/accelerator resource fields
│   │   ├── ManageNodeSelectorSection.tsx  # Node selector key/value pairs
│   │   ├── ManageTolerationSection.tsx    # Toleration entries
│   │   └── ManageWorkloadStrategySection.tsx
│   ├── nodeResource/                # Node resource modal + table
│   ├── nodeSelector/                # Node selector modal + table
│   └── toleration/                  # Toleration modal + table
├── BYONImages/
│   ├── BYONImages.tsx               # List page
│   ├── BYONImageRoutes.tsx          # Routes; nested hardware-profile/create sub-route
│   ├── BYONImagesTable.tsx          # PF Table of registered images
│   ├── BYONImageModal/
│   │   └── ManageBYONImageModal.tsx # Import/edit image modal
│   └── utils.ts
└── connectionTypes/
    ├── ConnectionTypesPage.tsx       # List page
    ├── ConnectionTypeRoutes.tsx      # Routes: list / create / duplicate / edit
    ├── ConnectionTypesTable.tsx      # PF Table of connection type CRs
    └── manage/
        ├── ManageConnectionTypePage.tsx   # Shared create/edit page
        ├── ManageConnectionTypeFieldsTable.tsx
        └── advanced/                      # Field-type-specific advanced property forms
```

`ClusterSettings` is the most complex page: it fetches settings via `fetchClusterSettings()`
(which calls `/api/config`), holds all sub-form state in a single component with `useState`, and
submits the whole payload via `updateClusterSettings()` in one save action. The model-serving
sections are conditionally rendered based on `SupportedArea.MODEL_SERVING` availability.

`StorageClassesPage` delegates all state to `StorageClassContextProvider`, which enriches raw
`StorageClassKind` objects with ODH-specific config stored as a JSON annotation
(`metadata.annotations["opendatahub.io/storage-class-config"]`).

`HardwareProfilesRoutes` is wrapped with `accessAllowedRouteHoC(verbModelAccess('create',
HardwareProfileModel))`, providing a secondary SSAR guard beyond the top-level admin check.

`ConnectionTypeRoutes` lazy-loads all four sub-pages (list, create, duplicate, edit) to keep the
initial bundle small.

## State Management

**Contexts used**:
- [`StorageClassContext`](../src/pages/storageClasses/StorageClassesContext.tsx) — holds the
  enriched `StorageClassKind[]` list, parsed `storageClassConfigs` map, `refresh` callback,
  and `isLoadingDefault` flag used to disable UI during default-class switching.

**Key hooks**:
- `fetchClusterSettings` / `updateClusterSettings` in
  `frontend/src/services/clusterSettingsService.ts` — REST calls to `/api/config`; used
  directly inside `ClusterSettings.tsx` via `useEffect`.
- `useWatchGroups` in `frontend/src/concepts/userConfigs/useWatchGroups.tsx` — watches the
  OpenShift Group API and exposes `groupSettings`, `updateGroups`, and change-tracking state.
- `useStorageClasses` in `frontend/src/concepts/k8s/useStorageClasses.ts` — `useFetchState`
  wrapper around the k8s StorageClass list API; feeds `StorageClassContextProvider`.
- `useHardwareProfile` in `frontend/src/pages/hardwareProfiles/useHardwareProfile.ts` — fetches
  a single `HardwareProfile` CR; used in edit/duplicate flows.

**Data flow**: API call (service or k8s hook) → local `useState` or context → sub-form
component props → user edits local draft → single "Save changes" button commits draft back via
service call → success/error dispatched to Redux notification store via `addNotification`.

## PatternFly Component Usage

| Component | Usage in this area |
|-----------|--------------------|
| `Form`, `FormGroup`, `FormHelperText` | All sub-forms inside Cluster settings sub-sections |
| `NumberInput`, `TextInput` | PVC size field; culler timeout hours/minutes fields |
| `Switch` | Telemetry opt-in; storage class enable/disable per row |
| `Radio` | Storage class default selector; model serving platform toggles |
| `ActionGroup`, `Button` | Primary "Save changes" action on Cluster settings and Group settings |
| `Table`, `Thead`, `Tbody`, `Tr`, `Th`, `Td` | Storage classes, hardware profiles, BYON images, connection types list pages |
| `Toolbar`, `ToolbarFilter` | Filter toolbars on list pages (storage classes, hardware profiles, images, connection types) |
| `Modal` | StorageClassEditModal, ManageBYONImageModal, node-resource / toleration sub-modals in hardware profiles, connection type field modals |
| `MultiSelection` (custom) | Group settings admin/user group pickers with creatable option |
| `Alert` | Inline info alert in group settings; error alerts in cluster settings load failure |
| `SettingSection` (custom) | Consistent card-like wrapper used across all cluster settings sub-forms |

`SettingSection` lives in `frontend/src/components/SettingSection.tsx` and is not a PatternFly
primitive; it wraps a PF `Card` with a standardised title and optional footer slot.

## Key Concepts

| Term | Definition |
|------|-----------|
| **OdhDashboardConfig** | `kind: OdhDashboardConfig` CR in the `odh-dashboard-config` namespace. Stores feature flags, PVC size default, culler timeout, telemetry opt-in, and model-serving platform enabled flags. Read/written by Cluster settings via `/api/config`. |
| **ClusterSettingsType** | TypeScript interface (`frontend/src/types`) mirroring the fields the dashboard reads from `OdhDashboardConfig.spec`: `pvcSize`, `cullerTimeout`, `userTrackingEnabled`, `modelServingPlatformEnabled`, `isDistributedInferencingDefault`, `defaultDeploymentStrategy`. |
| **Notebook culling** | The notebook controller evicts idle notebook pods after `cullerTimeout` seconds. Default is 31,536,000 s (1 year, effectively unlimited). Minimum is 600 s (10 min). |
| **BYONImage** | `kind: BYONNotebookImage` CR. Admins register custom container images so end-users can select them when creating workbenches. |
| **HardwareProfile** | `kind: HardwareProfile` CR. Defines a named preset of CPU/memory limits, accelerator resource requests, node selectors, and tolerations. Workbench and model-serving creation flows present these presets to end-users. |
| **ConnectionType** | `kind: ConnectionType` CR. A schema template (name, category, list of typed fields) that standardises how connections (e.g., S3, database, URI) are defined across the dashboard. |
| **StorageClassConfig** | ODH-specific metadata stored in a `StorageClassKind` annotation (`opendatahub.io/storage-class-config`). Holds `displayName`, `description`, `isEnabled`, and `isDefault` flags that augment the raw Kubernetes `StorageClass` object. |
| **groupsConfig** | Field in `OdhDashboardConfig.spec` with `adminGroups` and `allowedGroups` — comma-separated names of OpenShift Groups. Determines who is an admin and who is an allowed user. |
| **accessAllowedRouteHoC** | HOC from `frontend/src/concepts/userSSAR` that performs a SSAR check before rendering a route; redirects to 403 if the check fails. |

## Quick Start

```bash
cd frontend
oc login <cluster-url>
npm run start:dev:ext
# Open http://localhost:4010/settings/cluster-settings
# Log in as a user who is a member of the configured adminGroups OpenShift Group.
```

To test group settings locally without an existing admin group, add your username to the
`odh-admins` OpenShift Group (or whichever group is set in `OdhDashboardConfig.spec.groupsConfig.adminGroups`):

```bash
oc patch group odh-admins --type=json \
  -p='[{"op":"add","path":"/users/-","value":"<your-username>"}]'
```

To exercise storage class settings, ensure at least one `StorageClass` exists in the cluster.
Hardware profiles require the `HardwareProfile` CRD to be installed.

## Testing

### Unit Tests

Locations:
- `frontend/src/pages/clusterSettings/` — no dedicated `__tests__` dir; logic tested via Cypress
- `frontend/src/pages/storageClasses/__tests__/` — `StorageClassEditModal.spec.tsx`, `utils.spec.ts`
- `frontend/src/pages/hardwareProfiles/__tests__/` — `HardwareProfilesTable.spec.tsx`, `useHardwareProfile.spec.ts`, `utils.spec.ts`
- `frontend/src/pages/hardwareProfiles/manage/__tests__/` — `validationUtils.spec.ts`, `ManageResourceAllocationSection.spec.tsx`
- `frontend/src/pages/hardwareProfiles/nodeResource/__tests__/` — `utils.spec.ts`
- `frontend/src/pages/BYONImages/__tests__/` — `utils.spec.ts`
- `frontend/src/pages/connectionTypes/manage/__tests__/` — modal and field-utils specs
- `frontend/src/concepts/userConfigs/__tests__/` — `useWatchGroups.spec.tsx`

```bash
npm run test:unit -- --testPathPattern="storageClasses|hardwareProfiles|BYONImages|connectionTypes|userConfigs"
```

### Cypress Mock Tests

```bash
npm run test:cypress-ci -- --spec "**/clusterSettings/**,**/storageClasses/**,**/hardwareProfiles/**,**/notebookImageSettings/**,**/connectionTypes/**,**/userManagement/**"
```

### Cypress E2E Tests

No dedicated E2E specs exist for Admin Settings pages at this time. E2E coverage of downstream
effects (e.g., workbench creation respecting hardware profiles) lives in project/workbench E2E
specs.

## Cypress Test Coverage

| Settings Page | Mock Test File(s) | Coverage highlights |
|---------------|-------------------|---------------------|
| Cluster settings | `mocked/clusterSettings/clusterSettings.cy.ts` | Load/save PVC size, culler timeout, telemetry toggle, model serving platform toggles |
| User management | `mocked/userManagement/userManagement.cy.ts` | Admin group / user group multiselect, save, error states |
| Storage classes | `mocked/storageClasses/storageClasses.cy.ts` | Enable switch, default radio, edit modal, corrupted-config alert |
| Hardware profiles | `mocked/hardwareProfiles/hardwareProfiles.cy.ts`, `manageHardwareProfiles.cy.ts`, `workbenchHardwareProfiles.cy.ts` | List, create, edit, duplicate, delete, enable toggle, workbench integration |
| Workbench images | `mocked/notebookImageSettings/notebookImageSettings.cy.ts`, `workbenchImageCharacterLimits.cy.ts` | Import, edit, delete, status toggle, character-limit validation |
| Connection types | `mocked/connectionTypes/connectionTypes.cy.ts`, `createConnectionType.cy.ts` | List, create with fields, duplicate, edit, delete |

Gaps: no mock coverage for the `ResetCorruptConfigValueAlert` reset flow in storage classes
beyond the alert render; no E2E tests for any settings page.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `/api/config` | Backend Route | `GET` reads `OdhDashboardConfig`; `PUT` writes updated cluster settings. Handler in `backend/src/routes/api/config/`. |
| OpenShift Group API (k8s proxy) | Backend Route | `useWatchGroups` reads/patches `user.openshift.io/v1 Group` objects via the k8s proxy. |
| `StorageClass` k8s API | Backend k8s proxy | `useStorageClasses` lists `storage.k8s.io/v1 StorageClass`; updates written as annotation patches. |
| `HardwareProfile` CRD | Backend k8s proxy | `HardwareProfileModel` CRUD via k8s proxy; SSAR-gated on `create` verb. |
| `BYONNotebookImage` CRD | Backend k8s proxy | `ManageBYONImageModal` creates/updates/deletes BYON image CRs. |
| `ConnectionType` CRD | Backend k8s proxy | `ConnectionTypeRoutes` pages create/update/delete connection type CRs. |
| Workbenches area | Frontend Area | Hardware profiles defined here appear in workbench creation; BYON images appear in workbench image selector. |
| Model Serving area | Frontend Area | Model serving platform toggles in Cluster settings control which serving runtimes are available. `ModelServingPlatformSettings` is conditionally rendered based on `SupportedArea.MODEL_SERVING`. |
| Projects / Connections area | Frontend Area | Connection types defined here are used when creating connections in project detail tabs. |
| Redux notification store | Internal | `addNotification` (from `frontend/src/redux/actions/actions.ts`) dispatches success/error toasts after save operations. |
| `AppContext` | Internal | `useAppContext()` provides `dashboardConfig` to `ClusterSettings` for reading `disableTracking` and `modelServing.deploymentStrategy`. |

## Known Issues / Gotchas

- **Cluster settings save delay**: After saving, the notification warns "It can take up to 2
  minutes for configuration changes to be applied." This is because the notebook controller and
  other operators reconcile from `OdhDashboardConfig` on their own schedule.
- **Telemetry toggle hidden by flag**: `TelemetrySettings` only renders when
  `dashboardConfig.spec.dashboardConfig.disableTracking` is `false`. If tracking is disabled
  at the operator level, the toggle is invisible and there is no UI indication of why.
- **Storage class config in annotations**: ODH-specific storage class settings (display name,
  description, enabled, default) are stored in a Kubernetes annotation as a JSON blob. Corruption
  of this annotation triggers `CorruptedMetadataAlert` and `ResetCorruptConfigValueAlert`; admins
  must use the reset action or manually patch the annotation.
- **Group settings require at least one selection**: Both `adminGroups` and `allowedGroups` must
  have at least one enabled group or the Save button stays disabled. Attempting to clear all
  groups is prevented by `selectionRequired` on `MultiSelection`.
- **HardwareProfile SSAR double-gate**: The route is guarded both by the top-level admin SSAR
  check and by `accessAllowedRouteHoC(verbModelAccess('create', HardwareProfileModel))`. If the
  CRD is not installed the route renders a 403 even for cluster admins (tracked in RHOAIENG-21129).
- **BYONImages v2 redirects**: Legacy `/settings/notebook-images` URLs are redirected via
  `v2Redirects.ts`; do not rely on the old path in tests or documentation.
- **Connection type lazy loading**: All four connection-type sub-pages are React lazy imports.
  Ensure Suspense boundaries are present in the parent router if adding new nested routes.

## Related Docs

- [Guidelines] — documentation style guide
- [BOOKMARKS] — full doc index
- [Backend Overview] — backend architecture reference
- [Admin Dashboard] — legacy admin panel enablement guide (OdhDashboardConfig groupsConfig setup)
