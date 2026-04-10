# ODH Dashboard Backend

## Overview

- Node.js/Fastify server between the React frontend and the Kubernetes API
- Resolves user identity, enforces route-level authorization, proxies cluster and service APIs (often with the end user's bearer token)
- Serves static assets plus an `index.html` shell with Module Federation remote entries injected at runtime

## Design Intent

- **Fastify-based**: `server.ts` constructs the instance (TLS CA, body parsers, logging); `app.ts` registers `@fastify/autoload` for `plugins/` and `routes/` by filesystem convention
- The `kube` plugin runs first and decorates the instance with `fastify.kube` (k8s clients, namespace, cluster metadata); route modules type the instance as `KubeFastifyInstance`
- **Two outbound call styles**:
  - **Service-account calls** use the dashboard's own kubeconfig credentials for infrastructure reads (cached `OdhApplication` lists, `OdhDashboardConfig`, notebook lifecycle helpers)
  - **Pass-through calls** substitute the caller's bearer token (`x-forwarded-access-token`) so the API server enforces that user's RBAC (`/api/k8s/*`, Prometheus/Thanos, `/api/service/*` proxies)
- No global Fastify hook attaches user identity: `secureRoute` / `secureAdminRoute` invoke `getUserInfo` inside the handler; pass-through routes forward the raw access token upstream
- **ResourceWatcher** polls selected resources on an interval, keeps results in memory; handlers read the cache synchronously and can force refresh via `Cache-Control: no-cache`
- Pass-through helpers build request options with cluster TLS, replace `Authorization` with the user token, stream the response, and map k8s `Status` objects to HTTP errors
- **User identity** resolved in `getUserInfo` via five strategies in order:
  1. kube-rbac-proxy headers (`x-auth-request-user`, `x-auth-request-groups`)
  2. OpenShift `users/~` using `x-forwarded-access-token`
  3. `SelfSubjectReview` with that token
  4. Offline JWT claim extraction (`preferred_username`, `username`, `sub`, or email)
  5. In `APP_ENV=development`, local kubeconfig identity
- **Admin** decided via SelfSubjectAccessReview against the dashboard `Auth` CR (`adminUtils` / `authUtils`), not the deprecated OpenShift Group API
- Cross-cutting infrastructure: `@fastify/static` (public assets), `@fastify/view` (EJS SPA shell), `@fastify/websocket` (`/wss/k8s`), `@fastify/sensible` (errors), Pino with `Authorization` redaction
- `@fastify/autoload` maps `backend/src/routes/api/<segment>/` to `/api/<segment>` URL prefix; nested folders extend the prefix; read the corresponding `index.ts` for verbs and params

## Key Concepts

| Term | Definition |
|------|------------|
| `KubeFastifyInstance` | Fastify instance decorated with `fastify.kube` (k8s clients, namespace, cluster metadata) |
| `OauthFastifyRequest` | Request type carrying user context after `getUserInfo` |
| `secureRoute` | Wraps handler: resolves user, checks access, then runs handler |
| `secureAdminRoute` | Like `secureRoute` but rejects non-admins with 401 |
| `devRoute` | Returns 404 outside `APP_ENV=development` |
| `OdhDashboardConfig` | Feature-flag CR; watcher-backed, refreshable with `Cache-Control: no-cache` on GET |
| `ResourceWatcher` | In-memory polling cache; synchronous reads, background refresh |
| `passThroughResource` / `proxyCall` | Forward HTTP to cluster or service URLs with the resolved token and TLS settings |
| `USER_ACCESS_TOKEN` | Header `x-forwarded-access-token` carrying the user's bearer token from the auth gateway |
| `KUBE_RBAC_USER_HEADER` | Header `x-auth-request-user` from kube-rbac-proxy |
| Service-account call | Backend → API server using the dashboard service account (kubeconfig) |
| Pass-through call | Backend → API server using the end-user bearer token; cluster enforces RBAC |
| `createSelfSubjectAccessReview` | Permission checks: posts SSAR with the user token (see `authUtils`) |

## Known Issues / Gotchas

- **HTTP prohibited in production**: `utils/httpUtils.ts` rejects `http:` proxy targets unless `APP_ENV=development` (`ProxyError` / `SETUP_FAILURE`)
- **Group API deprecated for BYO OIDC**: `adminUtils` Group helpers are `@deprecated`; prefer SSAR via `createSelfSubjectAccessReview`
- **Service-account scope in dev**: With `APP_ENV=development`, identity follows local kubeconfig (typically needs cluster-admin); production uses the dashboard SA RBAC
- **Workbench routes**: v3+ frontends use `/notebook/{namespace}/{name}`; do not rely on backend Route assembly for notebook URLs
- **`OdhDashboardConfig` cache**: Served from `ResourceWatcher`; send `Cache-Control: no-cache` on GET `/api/config` if you need a fresh read after PATCH
- **Body limit**: `bodyLimit` is 32 MB; larger bodies get 413 before handlers
- **`DEV_IMPERSONATE_USER`**: Only affects code paths using `getDirectCallOptions`; not Thanos/Prometheus (by design)
