[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[Model Serving]: ../../model-serving/docs/overview.md
[KServe]: ../../kserve/docs/overview.md

# Model Registry

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

The Model Registry package provides the UI for browsing, registering, and versioning ML models in Open Data Hub. It replaces the deprecated `frontend/src/pages/modelRegistry/` and `frontend/src/pages/modelRegistrySettings/` pages. UI and BFF are vendored from [kubeflow/model-registry](https://github.com/kubeflow/model-registry) under `upstream/` (subtree from upstream `clients/ui`).

**Package path**: `packages/model-registry/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Standalone | `cd upstream && make dev-start` | BFF mocks k8s, Model Registry, and catalog; no cluster. MUI theme. |
| Kubeflow | `cd upstream && make dev-start-kubeflow` | BFF talks to cluster services; port-forward MR and catalog per upstream Makefile/docs. |
| Federated | `cd upstream && make dev-start-federated` + main dashboard dev | PatternFly theme; host loads remote and proxies BFF. |

Standalone is for local UI/BFF work with mocks. Kubeflow targets a real cluster. Federated is how ODH integrates the package: the main dashboard backend proxies `/model-registry/api` to the BFF (path rewritten to `/api`), and the BFF uses `AUTH_METHOD=user_token` with the bearer token from `x-forwarded-access-token`.

## Design Intent

The BFF is **upstream Go code** in `upstream/bff/`, not a dashboard-authored service. It centralizes auth, namespace/RBAC checks, and proxying to the in-cluster Model Registry API, Kubernetes API, and Model Catalog. In standalone and kubeflow modes it can also serve compiled frontend assets from `bff/static/`; in federated mode the webpack dev server serves the UI while the BFF only handles API traffic.

**Federated data flow:** browser → ODH Dashboard → `/model-registry/api/*` (host proxy) → BFF (e.g. :4000) → Model Registry Kubernetes `Service`, Kubernetes API (namespaces, SSAR), and Model Catalog service. Mock CLI flags on the BFF (`MOCK_K8S_CLIENT`, `MOCK_MR_CLIENT`, `MOCK_MR_CATALOG_CLIENT`) mirror the standalone behaviour without duplicating that table here.

**Module Federation:** remote name `modelRegistry`; exposed modules `./extensions` (ODH extension registrations) and `./extension-points` (types). Shared singletons with the host include React, react-router, PatternFly core, dynamic plugin SDK, and `@odh-dashboard/plugin-core`. The workspace `package.json` `module-federation` block ties the host to this remote and the API proxy path.

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

## Related Docs

- [Guidelines] — documentation style guide for all packages
- [Module Federation Docs] — Module Federation in this monorepo
- [Backend Overview] — main ODH Dashboard backend
- [Model Serving] — deploy model versions to runtimes
- [KServe] — KServe inference integration
- [BOOKMARKS] — full doc index
