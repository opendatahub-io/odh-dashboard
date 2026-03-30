[Guidelines]: ../../docs/guidelines.md
[Architecture]: ../../docs/architecture.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Env Vars]: ../../docs/dashboard-environment-variables.md
[SDK tidbits]: ../../docs/SDK.md

# ODH Dashboard Backend

**Last Updated**: 2026-03-09 | **Template**: backend-template v1

## Overview

The ODH Dashboard backend is a Node.js/Fastify server that sits between the React frontend and the
Kubernetes API server. It handles user authentication, enforces route-level authorization, proxies
Kubernetes and Prometheus API calls on behalf of authenticated users, and serves the compiled
frontend assets with Module Federation remote entries injected at runtime.

## Architecture

```text
backend/src/
├── server.ts                    # Fastify instance creation, TLS CA bootstrap, listen
├── app.ts                       # Plugin and route autoload registration
├── devFlags.ts                  # Dev-mode impersonation helpers
├── types.ts                     # Shared TypeScript types (KubeFastifyInstance, etc.)
├── typeHelpers.ts               # TypeScript utility types
├── utils.ts                     # Top-level error handler and instance guard
├── plugins/
│   └── kube.ts                  # Kubernetes client setup, decorates fastify.kube
├── routes/
│   ├── root.ts                  # Catch-all: serves index.html with MF remote entries
│   ├── module-federation.ts     # Module Federation remote entry resolution
│   ├── api/
│   │   ├── status/              # GET /api/status — user identity + admin flag
│   │   ├── config/              # GET|PATCH /api/config — OdhDashboardConfig CR
│   │   ├── dashboardConfig/     # Legacy dashboard config alias
│   │   ├── k8s/                 # ALL /api/k8s/* — generic k8s pass-through proxy
│   │   ├── prometheus/          # POST /api/prometheus/* — Thanos/Prometheus proxy
│   │   ├── notebooks/           # Notebook lifecycle (service-account calls)
│   │   ├── namespaces/          # Namespace discovery
│   │   ├── builds/              # BuildConfig status
│   │   ├── components/          # OdhApplication component list
│   │   ├── docs/                # OdhDocument listing
│   │   ├── quickstarts/         # OdhQuickStart listing
│   │   ├── console-links/       # ConsoleLink listing
│   │   ├── cluster-settings/    # Cluster-level settings
│   │   ├── connection-types/    # Connection type CR management
│   │   ├── modelRegistries/     # ModelRegistry service discovery
│   │   ├── modelRegistryCertificates/  # TLS cert management for model registries
│   │   ├── modelRegistryRoleBindings/  # RBAC for model registry access
│   │   ├── rolebindings/        # Generic RoleBinding management
│   │   ├── templates/           # ServingRuntime template management
│   │   ├── servingRuntimes/     # ServingRuntime CR management
│   │   ├── featurestores/       # Feature store integration (Feast)
│   │   ├── integrations/nim/    # NVIDIA NIM integration
│   │   ├── nim-serving/         # NIM serving runtime helpers
│   │   ├── service/             # Service-level proxies (pipelines, mlmd, trustyai, etc.)
│   │   ├── dsc/                 # DataScienceCluster status
│   │   ├── dsci/                # DataScienceClusterInitialization status
│   │   ├── health/              # Liveness/readiness probe endpoint
│   │   ├── segment-key/         # Segment analytics key
│   │   ├── envs/                # Notebook environment variable management
│   │   ├── validate-isv/        # ISV application validation
│   │   ├── operator-subscription-status/  # Operator subscription health
│   │   ├── route/               # OpenShift Route lookups
│   │   ├── dev-impersonate/     # Dev-mode user impersonation (gated by DEV_MODE)
│   │   └── not-found.ts         # 404 fallback for unmatched /api/* paths
│   └── wss/
│       └── k8s/                 # WebSocket proxy for k8s watch streams
└── utils/
    ├── constants.ts             # PORT, IP, header names, feature flag defaults
    ├── dotenv.ts                # dotenv file load order
    ├── authUtils.ts             # createSelfSubjectAccessReview helper
    ├── adminUtils.ts            # isUserAdmin, isUserAllowed (SSAR-based)
    ├── route-security.ts        # secureRoute / secureAdminRoute / devRoute wrappers
    ├── pass-through.ts          # passThroughResource / passThroughText core proxy
    ├── httpUtils.ts             # proxyCall — raw HTTPS proxy with ProxyError types
    ├── directCallUtils.ts       # getDirectCallOptions — token injection for proxy calls
    ├── jwtUtils.ts              # extractUsernameFromJWT / getUsernameFromToken
    ├── resourceUtils.ts         # ResourceWatcher, OdhDashboardConfig fetch/cache
    ├── userUtils.ts             # getUserInfo — multi-strategy auth resolution
    ├── groupsUtils.ts           # Group API helpers (deprecated for BYO OIDC)
    ├── envUtils.ts              # Secret/ConfigMap env-var helpers
    ├── notebookUtils.ts         # Notebook namespace resolution
    ├── prometheusUtils.ts       # callPrometheusThanos
    ├── requestUtils.ts          # createCustomError
    ├── fileUtils.ts             # logRequestDetails
    ├── features.ts              # Feature flag extraction from OdhDashboardConfig
    ├── componentUtils.ts        # OdhApplication link resolution
    ├── deployment.ts            # Deployment-mode helpers
    └── proxy.ts                 # Proxy utility wrappers
```

The server is built on **Fastify** (not Express). `server.ts` creates the Fastify instance, parses
`application/merge-patch+json` bodies, registers a TLS CA bundle from well-known cluster paths,
then calls `app.ts`. `app.ts` uses `@fastify/autoload` to register every file under `plugins/` and
`routes/` automatically by directory convention. The `kube` plugin (`plugins/kube.ts`) runs before
routes and decorates the Fastify instance with `fastify.kube`, exposing the Kubernetes client, the
current namespace, cluster metadata, and API clients. All route handlers receive this decorated
instance as `fastify: KubeFastifyInstance`.

There are two conceptually distinct call types in the backend. **Service-account calls** run as the
dashboard's own Kubernetes service account; they are used for infrastructure reads such as fetching
`OdhDashboardConfig`, listing `OdhApplication` resources, and managing notebooks. **Pass-through
calls** run as the requesting user by substituting the user's bearer token (`x-forwarded-access-token`)
into the outbound request; Kubernetes enforces that user's RBAC permissions directly, so no
additional authorization shim is required on the backend for these paths.

## API Routes

Routes are grouped under `/api/`. The k8s proxy and Prometheus proxy act on the user's bearer
token. Framework/config routes use `secureRoute` or `secureAdminRoute` wrappers that verify user
identity and admin status before invoking the handler.

| Method | Path | Handler file | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/status` | `routes/api/status/index.ts` | Returns username, admin flag, namespace, cluster ID, segment user ID. Primary bootstrap call. |
| `GET` | `/api/status/:namespace/allowedUsers` | `routes/api/status/index.ts` | Admin-only: lists users allowed in a namespace. |
| `GET`, `PATCH` | `/api/config` | `routes/api/config/index.ts` | Get or patch `OdhDashboardConfig` CR; GET secured, PATCH admin-only. |
| `GET` | `/api/components` | `routes/api/components/index.ts` | Lists `OdhApplication` resources (service-account). |
| `GET` | `/api/docs` | `routes/api/docs/index.ts` | Lists `OdhDocument` resources (service-account). |
| `GET` | `/api/quickstarts` | `routes/api/quickstarts/index.ts` | Lists `OdhQuickStart` resources (service-account). |
| `GET` | `/api/console-links` | `routes/api/console-links/index.ts` | Lists `ConsoleLink` resources (service-account). |
| `GET` | `/api/builds` | `routes/api/builds/index.ts` | Surfaces BuildConfig/Build status. |
| `GET` | `/api/namespaces` | `routes/api/namespaces/index.ts` | Returns workbench and dashboard namespaces. |
| `*` | `/api/k8s/*` | `routes/api/k8s/index.ts` | Generic k8s pass-through. All HTTP verbs. Proxies to the cluster API server using the user's bearer token. |
| `POST` | `/api/prometheus/query` | `routes/api/prometheus/index.ts` | Instant Prometheus/Thanos query (user token). |
| `POST` | `/api/prometheus/queryRange` | `routes/api/prometheus/index.ts` | Range Prometheus/Thanos query (user token). |
| `POST` | `/api/prometheus/pvc` | `routes/api/prometheus/index.ts` | PVC usage query (deprecated — use `/query`). |
| `POST` | `/api/prometheus/bias` | `routes/api/prometheus/index.ts` | Bias metrics query (deprecated — use `/queryRange`). |
| `POST` | `/api/prometheus/serving` | `routes/api/prometheus/index.ts` | Serving metrics query (deprecated — use `/queryRange`). |
| `GET`, `POST` | `/api/notebooks` | `routes/api/notebooks/index.ts` | Notebook start/stop lifecycle (service-account, with user permission shim). |
| `*` | `/api/service/pipelines/*` | `routes/api/service/pipelines/index.ts` | Pipelines BFF proxy. |
| `*` | `/api/service/mlmd/*` | `routes/api/service/mlmd/index.ts` | ML Metadata proxy. |
| `*` | `/api/service/modelregistry/*` | `routes/api/service/modelregistry/index.ts` | Model Registry service proxy. |
| `*` | `/api/service/trustyai/*` | `routes/api/service/trustyai/index.ts` | TrustyAI service proxy. |
| `*` | `/api/service/llama-stack/*` | `routes/api/service/llama-stack/index.ts` | Llama Stack service proxy. |
| `GET` | `/api/health` | `routes/api/health/index.ts` | Liveness/readiness probe. |
| `GET` | `/api/segment-key` | `routes/api/segment-key/index.ts` | Returns the Segment analytics write key. |
| `GET` | `/api/dsc` | `routes/api/dsc/index.ts` | DataScienceCluster status (cached watcher). |
| `GET` | `/api/dsci` | `routes/api/dsci/index.ts` | DataScienceClusterInitialization status. |
| `*` | `/api/dev-impersonate/*` | `routes/api/dev-impersonate/index.ts` | Dev-mode only (`devRoute` guard). Impersonate a different user. |
| `GET`, `POST` | `/api/validate-isv` | `routes/api/validate-isv/index.ts` | Validates an ISV application. |
| `*` | `/api/featurestores/*` | `routes/api/featurestores/index.ts` | Feature store (Feast) resource management. |

Static assets are served from `frontend/public/` via `@fastify/static`. The catch-all `GET /*`
route in `routes/root.ts` renders `index.html` as an EJS template, injecting the Module Federation
remote entry list as `mfRemotesJson`.

## Middleware

Fastify does not use Express-style middleware. The equivalent mechanisms are plugins (registered
once at startup) and route hooks. The table below describes the key cross-cutting concerns and where
they live.

| Concern | File | Applied at | Purpose |
|---------|------|-----------|---------|
| Kubernetes client | `plugins/kube.ts` | Startup (autoload) | Decorates `fastify.kube`; reads in-cluster token and namespace; initialises resource watchers. |
| Body parsing — merge-patch | `server.ts` | Startup | Adds content-type parser for `application/merge-patch+json`. |
| Static file serving | `app.ts` (`@fastify/static`) | Startup | Serves `frontend/public/`; `index: false` so `/` falls through to EJS view. |
| EJS view engine | `app.ts` (`@fastify/view`) | Startup | Renders `index.html` with `mfRemotesJson` variable; uses `?` delimiter to avoid clashing with React template syntax. |
| WebSocket support | `app.ts` (`@fastify/websocket`) | Startup | Enables the k8s watch WebSocket proxy at `wss/k8s/`. |
| Route security — user | `utils/route-security.ts` (`secureRoute`) | Per route handler | Calls `getUserInfo` + `isUserAdmin`; validates namespace and resource ownership before passing to the handler. |
| Route security — admin | `utils/route-security.ts` (`secureAdminRoute`) | Per route handler | Same as `secureRoute` but rejects non-admins with HTTP 401. |
| Route security — dev only | `utils/route-security.ts` (`devRoute`) | Per route handler | Returns HTTP 404 in production; only active when `APP_ENV=development`. |
| Authorization header redaction | `server.ts` (pino logger) | All requests | Pino `redact` list strips `Authorization` from logged request/response objects. |

### Auth chain position

Every route that calls `secureRoute` or `secureAdminRoute` triggers `getUserInfo`
(`utils/userUtils.ts`), which resolves the caller's identity using the multi-strategy chain
described in the Authentication section below. This check runs inside the route handler — there is
no global Fastify hook that pre-populates user identity. Pass-through routes (`/api/k8s/*`,
`/api/prometheus/*`, service proxies) skip the identity resolution step and instead forward the
raw `x-forwarded-access-token` bearer token to the upstream API, which enforces its own RBAC.

## Authentication

The backend resolves user identity using a five-strategy fallback chain implemented in
`utils/userUtils.ts`. Each strategy is attempted in order; the first to succeed wins.

### Strategy 1 — Kube-RBAC-Proxy headers (primary, OpenShift 4.19+)

The kube-rbac-proxy sits in front of the dashboard and injects two headers after validating the
incoming JWT:

- `x-auth-request-user` — the authenticated username
- `x-auth-request-groups` — comma-separated group memberships

The Envoy Lua filter also copies `x-auth-request-access-token` to `x-forwarded-access-token` and
sets the `Authorization: Bearer <token>` header so downstream code can use either form. When
`x-auth-request-user` is present and non-empty, the backend uses it directly without making any
additional API calls. The header names are defined in `utils/constants.ts` as
`KUBE_RBAC_USER_HEADER` and `KUBE_RBAC_GROUPS_HEADER`.

### Strategy 2 — User API with token (traditional OpenShift / dev-sandbox fallback)

Uses `x-forwarded-access-token` (constant `USER_ACCESS_TOKEN` in `utils/constants.ts`) to call
`user.openshift.io/v1/users/~`. This is the traditional OpenShift path and is required when the
dev-sandbox SSO user ID annotation must be read. The annotated user ID is used as the Segment
analytics identity.

### Strategy 3 — SelfSubjectReview with token (Kubernetes-standard fallback)

Calls `authentication.k8s.io/v1/selfsubjectreviews` with the user's bearer token — equivalent to
`kubectl auth whoami`. Works with any valid Kubernetes token even when the OpenShift User API is
unavailable (e.g., on non-OpenShift clusters or when BYO OIDC removes the User API).

### Strategy 4 — JWT token parsing (offline fallback)

When all API-based strategies fail, `utils/jwtUtils.ts` decodes the JWT payload from
`x-forwarded-access-token` without signature verification (the token is already validated
upstream by kube-rbac-proxy). Claims are tried in order:
`preferred_username` → `username` → `sub` → first segment of `email`.

### Strategy 5 — Dev mode service account

When `APP_ENV=development`, the backend uses the identity of the Kubernetes service account
configured in the local kubeconfig. This requires cluster-admin on the target cluster because all
service-account calls run with unrestricted permissions in this mode.

### Authorization

Admin status is determined by a SelfSubjectAccessReview (SSAR) check against the dashboard `Auth`
resource, implemented in `utils/adminUtils.ts` via `createSelfSubjectAccessReview`
(`utils/authUtils.ts`). The Group API is still consulted in some legacy paths but is marked
`@deprecated` throughout `utils/adminUtils.ts`; it returns empty arrays gracefully when the
OpenShift Group API is unavailable (BYO OIDC clusters).

## Environment Variables

The dotenv load order is controlled by `utils/dotenv.ts`. Files are applied from most-specific to
least-specific so later files do not overwrite earlier ones:

1. `.env.${NODE_ENV}.local`
2. `.env.${NODE_ENV}`
3. `.env.local`
4. `.env`

Copy `.env.local.example` to `.env.local` for local development; this file is gitignored.

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `APP_ENV` | Runtime environment; `development` enables dev mode, relaxed HTTP, and impersonation. | — | Yes (for dev) |
| `PORT` / `BACKEND_PORT` | Port the Fastify server listens on (`PORT` takes precedence). | `8080` | No |
| `IP` | Bind address. | `0.0.0.0` | No |
| `FASTIFY_LOG_LEVEL` / `LOG_LEVEL` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`). | `info` | No |
| `OC_PROJECT` | OpenShift namespace/project; required in dev mode. Use `opendatahub` or `redhat-ods-applications`. | — | Dev only |
| `OC_URL` | Cluster API URL for `make login`. | — | Dev only |
| `OC_USER` / `OC_PASSWORD` / `OC_TOKEN` | Credentials for `make login`. | — | Dev only |
| `DASHBOARD_CONFIG` | Name of the `OdhDashboardConfig` CR to read. | `odh-dashboard-config` | No |
| `ENABLED_APPS_CM` | Name of the ConfigMap that lists enabled applications. | — | No |
| `DEV_IMPERSONATE_USER` | In dev mode: impersonate this username for permission testing. | — | No |
| `DEV_IMPERSONATE_PASSWORD` | In dev mode: token/password for the impersonated user. | — | No |
| `DEV_OAUTH_PREFIX` | OAuth prefix override used in dev mode. | `oauth-openshift.apps` | No |
| `GATEWAY_DOMAIN` | Cluster gateway/ingress domain. Used to construct notebook and gateway URLs. Injected by the Operator via `params.env`. See [Env Vars]. | — | No |
| `DSPA_NAME` | Name of the DataSciencePipelinesApplication CR for the pipelines service proxy. | `dspa` | No |
| `METADATA_ENVOY_SERVICE_HOST` / `PORT` | ML Metadata Envoy sidecar address for the mlmd proxy. | `localhost` / `10001` | Dev only |
| `DS_PIPELINE_DSPA_SERVICE_HOST` / `PORT` | Pipeline service address for the pipelines proxy. | `localhost` / `8443` | Dev only |
| `TRUSTYAI_NAME` / `TRUSTYAI_TAIS_SERVICE_HOST` / `PORT` | TrustyAI service address for the trustyai proxy. | `trustyai-service` / `localhost` / `9443` | Dev only |
| `MODEL_REGISTRY_NAME` / `MODEL_REGISTRY_SERVICE_HOST` / `PORT` / `NAMESPACE` | Model Registry service address. | `modelregistry-sample` / `localhost` / `8085` / `odh-model-registries` | Dev only |
| `FEAST_REGISTRY_SERVICE_HOST` / `PORT` | Feature store (Feast) registry address. | `localhost` / `8443` | Dev only |

> **Note**: In-cluster, service addresses are resolved from Kubernetes service discovery. The
> `*_SERVICE_HOST` and `*_SERVICE_PORT` variables are only needed when developing locally and
> port-forwarding cluster services.

## Kubernetes Integration

The `kube` plugin initialises the Kubernetes client from the default kubeconfig
(`KubeConfig.loadFromDefault()`), which picks up the in-cluster service account token when
deployed and the developer's local `~/.kube/config` otherwise. The following API clients are
exposed on `fastify.kube`:

| Client | API group | Primary use |
|--------|-----------|-------------|
| `customObjectsApi` | `CustomObjectsApi` | Fetch/watch `OdhDashboardConfig`, `OdhApplication`, `OdhDocument`, `DataScienceCluster`, `Auth`, and other CRDs. |
| `coreV1Api` | `CoreV1Api` | ConfigMaps, Secrets, Namespaces, Pods. |
| `batchV1Api` / `batchV1beta1Api` | `BatchV1Api` | Build and job resources. |
| `rbac` | `RbacAuthorizationV1Api` | RoleBinding management. |

### Resource watchers

`utils/resourceUtils.ts` implements `ResourceWatcher`, which polls cluster resources on a
configurable interval and caches results in memory. Watchers are started at boot via
`initializeWatchedResources`. The following resources are watched:

- `OdhDashboardConfig` — dashboard feature flags and settings
- `Auth` — admin group configuration
- `DataScienceCluster` — cluster component status
- Operator `Subscription` — operator upgrade status
- `OdhApplication`, `OdhDocument`, `Build`, `ConsoleLink`, `OdhQuickStart`

Callers read from the cache synchronously (e.g., `getDashboardConfig(request)`) rather than making
live API calls on each request.

### Pass-through proxy

All user-token calls share the `proxyCall` function in `utils/httpUtils.ts`. The call flow is:

1. `getDirectCallOptions` (`utils/directCallUtils.ts`) takes the Fastify instance and request,
   applies the kubeconfig's TLS settings via `kc.applyToRequest`, then replaces the `Authorization`
   header with `Bearer <x-forwarded-access-token>` (or the dev-mode kubeconfig token).
2. `proxyCall` makes an HTTPS (or HTTP in dev mode only) request to the target URL with the
   resolved headers, streams the response body, and resolves with `[rawData, status]`.
3. `passThroughResource` in `utils/pass-through.ts` parses the response as JSON, detects k8s
   `Status` objects, and throws structured errors that map to HTTP status codes.
4. `passThroughText` handles non-JSON responses (e.g., plain text from some k8s endpoints).

The `/api/k8s/*` wildcard route builds the upstream URL as
`${cluster.server}/${kubeUri}?${queryString}` and supports all HTTP verbs
(`DELETE`, `GET`, `HEAD`, `PATCH`, `POST`, `PUT`, `OPTIONS`).

### SSAR pattern

Permission checks use `createSelfSubjectAccessReview` (`utils/authUtils.ts`), which posts to
`authorization.k8s.io/v1/selfsubjectaccessreviews` via `passThroughResource` with the user's
token. This avoids relying on the Group API and works under BYO OIDC constraints.

```ts
// Example: check if the user can list notebooks in a namespace
const review = await createSelfSubjectAccessReview(fastify, request, {
  group: 'kubeflow.org',
  resource: 'notebooks',
  verb: 'list',
  namespace: 'my-namespace',
});
```

## Key Concepts

| Term | Definition |
|------|-----------|
| `KubeFastifyInstance` | The decorated Fastify type that includes `fastify.kube` with the k8s clients and cluster metadata. All route handlers and utilities receive this type. |
| `OauthFastifyRequest` | Extended `FastifyRequest` type that carries user-identity context after resolution by `getUserInfo`. |
| `secureRoute` | Route wrapper that calls `getUserInfo` and validates namespace/resource ownership before invoking the handler. Allows regular authenticated users. |
| `secureAdminRoute` | Like `secureRoute` but rejects non-admin users with HTTP 401 before invoking the handler. |
| `devRoute` | Route wrapper that returns HTTP 404 in non-development environments. Used for endpoints like `/api/dev-impersonate`. |
| `OdhDashboardConfig` | The cluster CR (`opendatahub.io/v1alpha`, kind `OdhDashboardConfig`) that stores all feature flags. Fetched at boot and cached by `ResourceWatcher`; refreshed on `Cache-Control: no-cache`. |
| `ResourceWatcher` | In-memory polling cache for a k8s resource list. Returns stale data synchronously while refreshing in the background on an adaptive interval. |
| `passThroughResource` | Core proxy primitive that forwards a request to an arbitrary URL using the user's token and parses the response as a k8s object or `Status`. |
| `USER_ACCESS_TOKEN` | The HTTP header name `x-forwarded-access-token` that carries the user's bearer token from kube-rbac-proxy or the OAuth proxy into the backend. |
| `KUBE_RBAC_USER_HEADER` | The HTTP header name `x-auth-request-user` injected by kube-rbac-proxy containing the resolved username. |
| Service-account call | A backend-to-k8s call made with the dashboard's own service account token (via kubeconfig). Used for infrastructure resources the user doesn't need direct access to. |
| Pass-through call | A backend-to-k8s call made with the user's own bearer token. The user's RBAC permissions are enforced by the API server directly. |

## Quick Start

Ensure you are logged into an OpenShift cluster with admin access before starting.

```bash
# 1. Copy the example environment file
cp .env.local.example .env.local
# Edit .env.local: set OC_URL, OC_USER/OC_PASSWORD or OC_TOKEN, and OC_PROJECT

# 2. Authenticate against the cluster (uses .env.local values)
make login

# 3. Install dependencies (from repo root)
npm install

# 4. Start the backend in development mode (port 4000 per .env.development)
cd backend
npm run start:dev
# Server available at http://localhost:4000
```

The backend in dev mode uses your local kubeconfig credentials as the service account and will
bypass the OAuth proxy auth chain (Strategy 5 — dev mode). You must be a cluster-admin because
the service account runs without a separate permission shim in this mode.

To port-forward cluster services needed for local proxy routes (pipelines, model registry, etc.),
refer to `CONTRIBUTING.md` for the relevant `kubectl port-forward` commands.

## Testing

```bash
# Run all backend unit tests
cd backend
npm run test:unit

# Run a specific test file
npm run test:unit -- --testPathPattern="jwtUtils"
```

Unit tests live in `backend/src/__tests__/`. Current coverage includes:

| Test file | What it covers |
|-----------|---------------|
| `jwtUtils.spec.ts` | JWT claim extraction, malformed token handling, all four claim fallbacks. |
| `objUtils.spec.ts` | Object manipulation utilities. |
| `resourceUtils.spec.ts` | Resource watcher polling logic and cache behaviour. |
| `featureStoreUtils.spec.ts` | Feature store URL construction and Feast integration helpers. |
| `websocket-proxy.spec.ts` | WebSocket proxy handshake and error paths. |

Integration and end-to-end tests are not part of the backend test suite. Frontend Cypress tests
exercise backend routes indirectly through the full stack.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Kubernetes API server | k8s API | All resource reads, writes, and SSAR checks. URL from `fastify.kube.config.getCurrentCluster().server`. |
| kube-rbac-proxy / OpenShift OAuth Proxy | Auth gateway | Injects `x-auth-request-user`, `x-auth-request-groups`, `x-forwarded-access-token` headers on every inbound request. |
| `OdhDashboardConfig` CR | k8s custom resource | Feature flags read by the backend at startup and cached; served to the frontend via `GET /api/config`. |
| `DataScienceCluster` CR | k8s custom resource | Component enable/disable status; consumed by `GET /api/dsc`. |
| Thanos Querier | Prometheus-compatible API | Prometheus queries routed to `thanos-querier.openshift-monitoring` on port `9092` via `utils/prometheusUtils.ts`. |
| Pipelines service (`dspa`) | Internal k8s service | Proxied under `/api/service/pipelines/*`; address resolved from `DS_PIPELINE_DSPA_SERVICE_HOST/PORT`. |
| TrustyAI service | Internal k8s service | Proxied under `/api/service/trustyai/*`; address from `TRUSTYAI_TAIS_SERVICE_HOST/PORT`. |
| Model Registry service | Internal k8s service | Proxied under `/api/service/modelregistry/*`; address from `MODEL_REGISTRY_SERVICE_HOST/PORT`. |
| ML Metadata (mlmd) | Internal k8s service | Proxied under `/api/service/mlmd/*`; address from `METADATA_ENVOY_SERVICE_HOST/PORT`. |
| Feature Store (Feast) | Internal k8s service | Proxied under `/api/featurestores/*`; address from `FEAST_REGISTRY_SERVICE_HOST/PORT`. |
| Frontend React app | Compiled assets | Backend serves `frontend/public/` and injects Module Federation remote entries into `index.html` at request time. |
| Module Federation packages | Runtime remote entries | `routes/root.ts` calls `getModuleFederationConfigs` from `@odh-dashboard/app-config` to determine which package remote entries to embed. |

## Known Issues / Gotchas

- **HTTP prohibited in production**: `utils/httpUtils.ts` rejects any proxy target with an `http:`
  URL unless `APP_ENV=development`. Attempting to call an HTTP service in a deployed cluster will
  throw a `ProxyError` with type `SETUP_FAILURE`.

- **Group API deprecated for BYO OIDC**: All functions in `utils/adminUtils.ts` that read OpenShift
  Group resources are marked `@deprecated`. On clusters using BYO OIDC the Group API may be
  unavailable; the functions return empty arrays gracefully but do not surface an error. Use
  SSAR-based permission checks (`createSelfSubjectAccessReview`) for all new authorization logic.

- **Service-account permission scope**: In development mode (`APP_ENV=development`), the backend
  authenticates as the local kubeconfig user rather than a service account. This user must be a
  cluster-admin. In production the dashboard service account has broad but defined RBAC; do not
  assume arbitrary cluster resources are accessible via service-account calls.

- **Workbench routes removed in v3.0+**: The backend no longer fetches OpenShift `Route` objects
  to construct workbench URLs. The frontend generates `/notebook/{namespace}/{name}` paths
  directly as same-origin relative paths. Any code that calls the route API for notebook access
  URLs is from v2.x and should be removed.

- **`OdhDashboardConfig` cache refresh**: The config CR is served from the in-memory
  `ResourceWatcher` cache. Sends `Cache-Control: no-cache` on `GET /api/config` to force a live
  re-fetch when a stale value is suspected (e.g., immediately after a PATCH).

- **Body size limit**: The Fastify server sets `bodyLimit` to 32 MB to support file uploads.
  Requests larger than this are rejected with HTTP 413 before reaching any route handler.

- **`DEV_IMPERSONATE_USER` scope**: Impersonation in dev mode only affects routes that call
  `getDirectCallOptions`; it does not apply to Thanos/Prometheus queries (intentional — Thanos
  does not grant basic user access on external routes).

## Related Docs

- [Architecture] — full backend and client architecture reference, including auth flow diagram
- [Env Vars] — environment variables injected by the Operator at deploy time
- [Guidelines] — documentation style guide for all docs in this repo
- [SDK tidbits] — notes on the OpenShift Dynamic Plugin SDK used for k8s calls
- [BOOKMARKS] — full documentation index
