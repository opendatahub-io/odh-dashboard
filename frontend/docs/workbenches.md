# Workbenches

## Overview

- Create, configure, start, stop, and delete JupyterLab servers (`Notebook` CRs) in a Data Science Project, with image, resources, env vars, storage, and optional accelerators.
- A standalone **Notebook Controller** view supports spawning and admin workflows outside the strict project-tab flow.
- Shared notebook helpers live under `frontend/src/concepts/notebooks/` and `packages/notebooks` so both entry points stay consistent.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Workbenches tab (create) | `/projects/:namespace/spawner` | `notebookController.enabled` in `OdhDashboardConfig` |
| Workbenches tab (list) | `/projects/:namespace` → Workbenches | `notebookController.enabled` |
| Notebook Controller | `/notebook-controller` | `notebookController.enabled` |
| Admin user management | `/notebook-controller` (admin tab) | `notebookController.enabled` + admin role |

- Reach the tab via **Data Science Projects** → project → **Workbenches**.
- Legacy `/notebookController` redirects to `/notebook-controller`.
- `useCheckJupyterEnabled` in `frontend/src/utilities/notebookControllerUtils.ts` reads `dashboardConfig.spec.notebookController.enabled` and sends users to `/` when disabled.

## Design Intent

- Inside a project, the flow is **project → detail tabs → workbench table → row actions**.
  - Workbenches tab lists notebooks and polls pod-backed status on an interval so badges and actions stay current.
  - Create/edit navigates to full-page spawner screens (image selection, sizing, environment variables, PVC attachment, accelerators)—shared between project spawner and the standalone controller where appropriate.
- **Standalone Notebook Controller** uses `NotebookControllerContextProvider` for the current user’s notebook, gateway vs Route link resolution, and **admin impersonation** (session-only).
- **Project path** relies on `ProjectDetailsContext` for the notebook list and related resources; it does not duplicate the controller context’s concerns.
- Fetches use `useFetchState` and `frontend/src/api/k8s/notebooks.ts`, with status merged into `NotebookState[]` for presentation.
- Create and edit share the same spawner stack; edit pre-populates from the existing CR. The standalone controller reuses the same form building blocks with a different shell and context.

## Key Concepts

| Term | Definition |
|------|-----------|
| **Workbench** | User-facing name for a JupyterLab server backed by a `Notebook` CR (`kubeflow.org`). |
| **Notebook CR** | `NotebookKind` — pod spec, image, resources, volumes, annotations. |
| **NotebookImage** | Image from OpenShift `ImageStream` / `ImageStreamTag`; chosen in the spawner. |
| **WorkbenchSize** | CPU/memory preset from `OdhDashboardConfig` (“Container size”). |
| **PVC** | Attached volume for persistent storage; attach existing or create in the wizard. |
| **Accelerator / Hardware Profile** | GPU/accelerator profile (tolerations + limits) for the pod spec. |
| **inject-auth annotation** | `notebooks.opendatahub.io/inject-auth: "true"` selects Gateway same-origin URL vs OpenShift Route. |
| **SSAR** | Access review before rendering notebook UI where enforced. |
| **POLL_INTERVAL** | Shared poll cadence (`frontend/src/utilities/const.ts`) for live notebook/pod status. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `packages/notebooks` | Package | Shared utilities and types for spawner and controller |
| Projects area | Frontend | `ProjectDetailsContext` supplies namespace and notebook list for the tab |
| `api/k8s/notebooks.ts` | Backend (k8s) | CRUD on `Notebook` via dashboard proxy |
| `api/k8s/routes.ts` | Backend (k8s) | Route fetch for pre–inject-auth URL resolution |
| `concepts/pipelines/elyra/` | Frontend | Elyra pipeline enablement and version alerts in `NotebookTable` |
| `concepts/userSSAR/AccessReviewContext` | Frontend | SSAR gate for notebook access where used |
| `packages/model-serving` | Package | Connection env vars can be injected when creating a workbench |
| `OdhDashboardConfig` | Kubernetes | `notebookController.enabled`, sizes, accelerator defaults |

**Data flow:** `NotebookKind[]` from k8s → merged with pod status → `NotebookState[]` in context → table, modals, and open-link behavior. Open URL chooses `getRoutePathForWorkbench` when inject-auth is set, else Route API.

## Known Issues / Gotchas

- **Tables:** Import `Table` from `#~/components/table` (PF override in `frontend/src/components/pf-overrides/`), **not** `@patternfly/react-table` directly.
- **v3.0 routing:** With `inject-auth`, open uses `/notebook/{namespace}/{name}`; without it, code still resolves an OpenShift `Route` via `listRoutes`. Do not assume all clusters use the Gateway path.
- **Route polling:** Inject-auth workbenches no longer poll Routes for readiness; if “not ready” seems stale on v3.0, verify the annotation.
- **`notebookController.enabled`:** Defaults to true when omitted; `false` hides entry points but does not delete CRs.
- **Admin impersonation:** Stored in React state only—refresh clears it without warning.
- **Elyra alerts:** `ElyraInvalidVersionAlerts` can hide the table body while loading; intentional, not a render bug.
- **Edit flow in tests:** The edit-spawner path is thin in mocked Cypress; broader coverage lives under E2E `dataScienceProjects/workbenches/`—do not assume mocks alone validate edit.
