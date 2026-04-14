# Model Registry

## Overview

- Provides the UI for browsing, registering, and versioning ML models in Open Data Hub.
- Replaces the deprecated `frontend/src/pages/modelRegistry/` and `frontend/src/pages/modelRegistrySettings/` pages.
- UI and BFF are vendored from [kubeflow/model-registry](https://github.com/kubeflow/model-registry) under `upstream/` (subtree from upstream `clients/ui`).

## Design Intent

- The BFF is **upstream Go code** in `upstream/bff/`, not a dashboard-authored service.
  - Centralizes auth, namespace/RBAC checks, and proxying to the in-cluster Model Registry API, Kubernetes API, and Model Catalog.
  - **Standalone / kubeflow:** can serve compiled frontend assets from `bff/static/`.
  - **Federated:** webpack dev server serves the UI; the BFF handles API traffic only.
- **Federated data flow:** browser → ODH Dashboard → `/model-registry/api/*` (host proxy) → BFF (e.g. :4000) → Model Registry Kubernetes `Service`, Kubernetes API (namespaces, SSAR), and Model Catalog service.
  - Mock CLI flags on the BFF (`MOCK_K8S_CLIENT`, `MOCK_MR_CLIENT`, `MOCK_MR_CATALOG_CLIENT`) mirror standalone behaviour without duplicating that table here.
- **Module Federation:** remote name `modelRegistry`; exposed modules `./extensions` (ODH extension registrations) and `./extension-points` (types).
  - Shared singletons with the host: React, react-router, PatternFly core, dynamic plugin SDK, `@odh-dashboard/plugin-core`.
  - Workspace `package.json` `module-federation` block ties the host to this remote and the API proxy path.

## Key Concepts

| Term | Definition |
|------|-----------|
| **RegisteredModel** | Top-level ML model entity (metadata, labels); backed by a Model Registry CRD. |
| **ModelVersion** | Versioned snapshot of a RegisteredModel (e.g. LIVE/ARCHIVED) with artifact links. |
| **ModelArtifact** | Storage URI (OCI, S3, etc.) for weights tied to a ModelVersion. |
| **ModelRegistry** | In-cluster service + controller storing models/versions/artifacts; multiple per cluster possible. |
| **Model Catalog** | Curated read-only models from external sources; driven by CatalogSource CRs. |
| **BFF** | Upstream Go BFF: auth, proxying, asset serving in non-federated modes. |
| **Deployment mode** | `standalone`, `kubeflow`, or `federated` — auth, CORS, theme, and asset behaviour. |
| **upstream/** | Vendored subtree; refresh with `npm run update-subtree`, not ad-hoc edits for upstream-bound fixes. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard (frontend) | Host | Loads `modelRegistry` remote; proxies `/model-registry/api` → BFF. |
| Main ODH Dashboard (backend) | Auth gateway | Forwards access token; BFF reads `x-forwarded-access-token` in federated mode. |
| `packages/model-serving` | Package | “Deploy model version” navigates to model-serving for inference. |
| `packages/kserve` | Package | KServe inference linking for deployed versions. |
| Model Registry k8s Service | Cluster | BFF proxies CRUD for registered models, versions, artifacts. |
| Kubernetes API | Cluster | Namespaces and RBAC (e.g. SSAR) for registry access. |
| Model Catalog service | Cluster / dev port-forward | Catalog sources, models, settings endpoints. |
| `kubeflow/model-registry` | Upstream | Source of `upstream/`; contribute fixes upstream then re-vendor. |

## Known Issues / Gotchas

- **Upstream vendoring**: Do not land kubeflow-bound fixes only in `upstream/` — contribute to [kubeflow/model-registry](https://github.com/kubeflow/model-registry), then run `npm run update-subtree`. Local-only patches drift from upstream and complicate sync.
- **Deprecated main-dashboard pages**: `frontend/src/pages/modelRegistry/` and `modelRegistrySettings/` are deprecated; develop here only.
- **Themes**: Standalone/kubeflow use MUI (`STYLE_THEME=mui-theme`); federated uses PatternFly. Mixing themes causes visual regressions.
- **`npm run start:dev:ext`**: Do not use for the main ODH frontend when testing federated integration — it skips the federation proxy setup.
- **Docker**: `Dockerfile.workspace` build context must be the **repo root** (workspace packages).
- **BFF flags**: `--standalone-mode` / `--federated-platform` are legacy; prefer `--deployment-mode`.
- **CI e2e**: Full Cypress e2e for model registry is not fully tagged for CI; mock tests run; live cluster e2e is separate. See `// #e2eCiTags` in `packages/model-registry/package.json`.
