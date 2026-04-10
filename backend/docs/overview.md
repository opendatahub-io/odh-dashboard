[Guidelines]: ../../docs/guidelines.md
[Architecture]: ../../docs/architecture.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Env Vars]: ../../docs/dashboard-environment-variables.md
[SDK tidbits]: ../../docs/SDK.md

# ODH Dashboard Backend

**Last Updated**: 2026-04-10 | **Template**: backend-template v2

## Overview

The ODH Dashboard backend is a Node.js/Fastify server between the React frontend and the Kubernetes API. It resolves user identity, enforces route-level authorization, proxies cluster and service APIs (often with the end user’s bearer token), and serves static assets plus an `index.html` shell with Module Federation remote entries injected at runtime.

## Design Intent

The app is **Fastify**-based. `server.ts` constructs the instance (TLS CA, body parsers, logging); `app.ts` registers `@fastify/autoload` for everything under `plugins/` and `routes/` by filesystem convention. The `kube` plugin runs first and decorates the instance with `fastify.kube` (Kubernetes clients, namespace, cluster metadata). Route modules type the instance as `KubeFastifyInstance`.

There are two outbound call styles. **Service-account calls** use the dashboard’s own credentials from kubeconfig (in-cluster token or local dev config) for infrastructure reads and operators—for example cached `OdhApplication` lists, `OdhDashboardConfig`, and notebook lifecycle helpers. **Pass-through calls** substitute the caller’s bearer token (`x-forwarded-access-token`, also surfaced as `Authorization`) so the API server enforces that user’s RBAC; the generic `/api/k8s/*` proxy, Prometheus/Thanos queries, and most `/api/service/*` proxies work this way. There is **no global Fastify hook** that attaches user identity: `secureRoute` / `secureAdminRoute` invoke `getUserInfo` inside the handler. Pass-through routes skip that chain and forward the raw access token upstream.

**ResourceWatcher** (see `utils/resourceWatcher.ts`) polls selected resources on an interval and keeps results in memory. Boot code starts watchers for config, DSC, subscriptions, and catalog-style CRs; handlers read the cache synchronously and can force refresh (e.g. `Cache-Control: no-cache` on config). For pass-through HTTP, shared helpers build request options with cluster TLS, replace `Authorization` with the user token (or dev kubeconfig token), stream the response, and map Kubernetes `Status` objects to HTTP errors—without duplicating RBAC in the dashboard.

**User identity** is resolved in `getUserInfo` by trying up to **five strategies in order** until one succeeds: (1) kube-rbac-proxy headers `x-auth-request-user` and `x-auth-request-groups`; (2) OpenShift `users/~` using `x-forwarded-access-token`; (3) `SelfSubjectReview` with that token; (4) offline JWT claim extraction (`preferred_username`, `username`, `sub`, or email) from the forwarded token (signature already validated upstream); (5) in `APP_ENV=development`, the local kubeconfig identity (expects broad cluster permissions). Header names live in `utils/constants.ts`. **Admin** is decided via SelfSubjectAccessReview against the dashboard `Auth` CR (`adminUtils` / `authUtils`), not the deprecated OpenShift Group API paths for new logic.

Cross-cutting infrastructure is registered in `app.ts` and `server.ts`: `@fastify/static` for public assets, `@fastify/view` (EJS) for the SPA shell, `@fastify/websocket` for `/wss/k8s`, `@fastify/sensible` for errors, and Pino with redaction of `Authorization` on logged requests.

`@fastify/autoload` maps each `backend/src/routes/api/<segment>/` plugin to the `/api/<segment>` URL prefix (plus any route paths declared inside that plugin). Nested folders extend the prefix (for example `routes/api/service/pipelines/` → `/api/service/pipelines`). To confirm verbs and params, read the corresponding `index.ts` (or registered sub-plugins such as `featurestores/featureStores.ts`).

## API Routes

**Auth column**: **user-token** means the request is treated as an authenticated user session (`secureRoute` / `secureAdminRoute`, or the token is forwarded upstream). **service-account** means the handler uses the dashboard kube client without substituting the user’s bearer token for that operation (some routes still use `secureRoute` for authorization checks before SA work—see code).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/status` | user-token | Bootstrap: username, admin flag, namespaces, cluster id, Segment id. |
| `GET` | `/api/status/:namespace/allowedUsers` | user-token | Admin: users allowed in a namespace. |
| `GET`, `PATCH` | `/api/config` | user-token | Get/patch `OdhDashboardConfig`; PATCH admin-only. |
| `GET`, `PATCH` | `/api/dashboardConfig` | user-token | Legacy alias for `/api/config`. |
| `GET` | `/api/components` | user-token | List `OdhApplication` (cached watcher). |
| `GET` | `/api/components/remove` | user-token | Admin: remove component (catalog). |
| `GET` | `/api/docs` | service-account | List `OdhDocument` (watcher-backed). |
| `GET` | `/api/quickstarts` | service-account | List `OdhQuickStart`. |
| `GET` | `/api/console-links` | user-token | List `ConsoleLink`. |
| `GET` | `/api/builds` | user-token | BuildConfig / Build status. |
| `GET` | `/api/namespaces/:name/:context` | user-token | Namespace application flow. |
| `*` | `/api/k8s/*` | user-token | Generic Kubernetes API proxy (all verbs). |
| `WS` | `/wss/k8s/*` | user-token | WebSocket watch proxy to the API server. |
| `POST` | `/api/prometheus/query` | user-token | Instant Prom/Thanos query. |
| `POST` | `/api/prometheus/queryRange` | user-token | Range query. |
| `POST` | `/api/prometheus/pvc` | user-token | PVC usage (deprecated; prefer `/query`). |
| `POST` | `/api/prometheus/bias` | user-token | Bias metrics (deprecated; prefer `/queryRange`). |
| `POST` | `/api/prometheus/serving` | user-token | Serving metrics (deprecated; prefer `/queryRange`). |
| `GET`, `POST`, `PATCH` | `/api/notebooks`, `/api/notebooks/...` | user-token | Notebook get/start/stop (SA to cluster with user permission checks). |
| `*` | `/api/service/pipelines/*` | user-token | Data Science Pipelines proxy. |
| `*` | `/api/service/mlmd/*` | user-token | ML Metadata (Envoy) proxy. |
| `*` | `/api/service/modelregistry/*` | user-token | Model Registry HTTP proxy. |
| `*` | `/api/service/trustyai/*` | user-token | TrustyAI proxy. |
| `*` | `/api/service/llama-stack/*` | user-token | Llama Stack proxy. |
| `*` | `/api/service/model-serving/*` | user-token | Model-serving API proxy. |
| `GET` | `/api/health` | service-account | Liveness/readiness (no user session). |
| `GET` | `/api/segment-key` | service-account | Segment analytics key from cluster. |
| `GET` | `/api/dsc/status` | service-account | `DataScienceCluster` status (watcher). |
| `GET` | `/api/dsci/status` | service-account | `DataScienceClusterInitialization` status. |
| `POST` | `/api/dev-impersonate` | user-token | Dev only (`devRoute`): OAuth impersonation helper. |
| `GET` | `/api/validate-isv` | user-token | Admin: start ISV validation job. |
| `GET` | `/api/validate-isv/results` | user-token | Admin: validation job results. |
| `GET` | `/api/featurestores` | user-token | Discover feature stores (uses user token for registry calls). |
| `GET` | `/api/featurestores/:namespace/:projectName/*` | user-token | Feast registry pass-through. |
| `GET` | `/api/featurestores/workbench-integration` | user-token | Workbench ↔ Feast integration metadata. |
| `GET` | `/api/ray-job-logs/:namespace/:podName/:containerName/:jobId` | user-token | Ray job pod logs. |
| `GET`, `PUT` | `/api/cluster-settings` | user-token | Admin: cluster settings CR. |
| `GET` | `/api/connection-types`, `/api/connection-types/:name` | service-account | List/get connection type ConfigMaps. |
| `POST`, `PUT`, `PATCH`, `DELETE` | `/api/connection-types` | user-token | Admin: mutate connection types. |
| `GET`, `POST` | `/api/modelRegistries` | user-token | Admin: list or create ModelRegistry (+ optional DB secret material). |
| `GET`, `PATCH`, `DELETE` | `/api/modelRegistries/:modelRegistryName` | user-token | Admin: get (with password), patch, or delete MR and secret. |
| `GET` | `/api/modelRegistryCertificates` | user-token | Admin: list MR TLS cert names. |
| `GET`, `POST`, `DELETE` | `/api/modelRegistryRoleBindings`, `/api/modelRegistryRoleBindings/:name` | user-token | Admin: MR RoleBindings. |
| `GET` | `/api/rolebindings/:namespace/:name` | user-token | Get RoleBinding. |
| `POST` | `/api/rolebindings` | user-token | Create RoleBinding. |
| `GET` | `/api/templates/:namespace`, `/api/templates/:namespace/:name` | user-token | Admin: list or get OpenShift Template. |
| `POST`, `PATCH`, `DELETE` | `/api/templates/:namespace`, `/api/templates/:namespace/:name` | user-token | Admin: create, patch, or delete Template. |
| `POST` | `/api/servingRuntimes` | user-token | Admin: create ServingRuntime. |
| `GET` | `/api/integrations/nim` | service-account | NIM account install/status (reads Account CR and related state). |
| `POST`, `DELETE` | `/api/integrations/nim` | user-token | Admin: enable/configure or remove NIM account. |
| `GET` | `/api/nim-serving/:nimResource` | service-account | Resolve NIM Secret/ConfigMap names from Account CR. |
| `GET` | `/api/route/:namespace/:name` | user-token | OpenShift Route lookup (legacy notebook URL flows). |
| `GET` | `/api/operator-subscription-status` | user-token | Operator Subscription from watcher. |
| `GET` | `/api/envs/secret/:namespace/:name` | user-token | Notebook env: read Secret. |
| `GET` | `/api/envs/configmap/:namespace/:name` | user-token | Notebook env: read ConfigMap. |

Static files come from `frontend/public/` via `@fastify/static`. `GET /*` (non-API) renders `index.html` through EJS with Module Federation remote JSON. `GET /_mf/*` serves MF assets per `routes/module-federation.ts`.

## Key Concepts

| Term | Definition |
|------|------------|
| `KubeFastifyInstance` | Fastify instance decorated with `fastify.kube` (k8s clients, namespace, cluster metadata). |
| `OauthFastifyRequest` | Request type carrying user context after `getUserInfo`. |
| `secureRoute` | Wraps handler: resolves user, checks access, then runs handler. |
| `secureAdminRoute` | Like `secureRoute` but rejects non-admins with 401. |
| `devRoute` | Returns 404 outside `APP_ENV=development`. |
| `OdhDashboardConfig` | Feature-flag CR; watcher-backed, refreshable with `Cache-Control: no-cache` on GET. |
| `ResourceWatcher` | In-memory polling cache; synchronous reads, background refresh. |
| `passThroughResource` / `proxyCall` | Forward HTTP to cluster or service URLs with the resolved token and TLS settings. |
| `USER_ACCESS_TOKEN` | Header `x-forwarded-access-token` carrying the user’s bearer token from the auth gateway. |
| `KUBE_RBAC_USER_HEADER` | Header `x-auth-request-user` from kube-rbac-proxy. |
| Service-account call | Backend → API server using the dashboard service account (kubeconfig). |
| Pass-through call | Backend → API server using the end-user bearer token; cluster enforces RBAC. |
| `createSelfSubjectAccessReview` | Permission checks: posts `SelfSubjectAccessReview` with the user token (see `authUtils`). |

## Interactions

| Dependency | Type | Details |
|------------|------|---------|
| Kubernetes API server | k8s API | Resource I/O, watches, SSAR; base URL from `fastify.kube.config`. |
| kube-rbac-proxy / OAuth proxy | Auth gateway | Injects user and group headers plus `x-forwarded-access-token`. |
| `OdhDashboardConfig` CR | k8s CR | Feature flags; exposed via `/api/config`. |
| `DataScienceCluster` CR | k8s CR | Component status via `/api/dsc/status`. |
| Thanos Querier | Prom API | Dashboard Prom routes (OpenShift monitoring). |
| Pipelines / mlmd / modelregistry / trustyai / llama-stack / model-serving | k8s Services | Proxied under `/api/service/*` (addresses from env in dev). |
| Feature Store (Feast) | k8s Service | Registry host from env; paths under `/api/featurestores`. |
| Frontend app | Static + EJS | Public assets and SPA shell with MF remotes. |
| MF packages | Runtime | Remote entries from `@odh-dashboard/app-config`. |

## Known Issues / Gotchas

- **HTTP prohibited in production**: `utils/httpUtils.ts` rejects `http:` proxy targets unless `APP_ENV=development` (`ProxyError` / `SETUP_FAILURE`).

- **Group API deprecated for BYO OIDC**: `adminUtils` Group helpers are `@deprecated`; prefer SSAR via `createSelfSubjectAccessReview`.

- **Service-account scope in dev**: With `APP_ENV=development`, identity follows local kubeconfig (typically needs cluster-admin); production uses the dashboard SA RBAC.

- **Workbench routes**: v3+ frontends use `/notebook/{namespace}/{name}`; do not rely on backend Route assembly for notebook URLs.

- **`OdhDashboardConfig` cache**: Served from `ResourceWatcher`; send `Cache-Control: no-cache` on GET `/api/config` if you need a fresh read after PATCH.

- **Body limit**: `bodyLimit` is 32 MB; larger bodies get 413 before handlers.

- **`DEV_IMPERSONATE_USER`**: Only affects code paths using `getDirectCallOptions`; not Thanos/Prometheus (by design).

## Related Docs

- [Architecture] — backend and client architecture, including auth flow
- [Env Vars] — operator-injected environment variables
- [Guidelines] — documentation style for this repo
- [SDK tidbits] — Dynamic Plugin SDK notes for k8s usage from the UI
- [BOOKMARKS] — documentation index
