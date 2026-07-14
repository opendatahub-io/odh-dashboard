# E2E Proxy

A lightweight reverse proxy that sits between Cypress and the local stack during E2E tests. It handles authentication and routes requests to the correct target (local backend or live cluster).

## Port

Default: `:4040` (configurable via `PROXY_PORT` env var)

## Routing

On startup, the proxy builds a routing table from `test-variables.yml` and the monorepo's module federation configs:

| Pattern | Target | Auth Header |
|---------|--------|-------------|
| `/api/service/*` | Cluster (`ODH_DASHBOARD_URL`) | `Authorization: Bearer <token>` |
| `proxyService` paths where `service.name` is not `odh-dashboard` | Cluster | `Authorization: Bearer <token>` |
| Everything else (static files, `/api/*`, `/_mf/*` for local BFFs, WebSockets) | Local backend (`:4000`) | `x-forwarded-access-token: <token>` |

Only services NOT managed by `odh-dashboard` are routed to the cluster. The `proxyService` paths are read from each package's `module-federation` config in `package.json`. Packages with BFFs running locally (service name `odh-dashboard`) fall through to the backend, which proxies `/_mf/{name}/*` to the local BFF port.

The split in auth headers is intentional:
- The cluster's auth layer (Gateway/kube-rbac-proxy) validates `Authorization: Bearer` and internally sets the forwarded token for its backend
- The local backend reads `x-forwarded-access-token` directly for K8s API calls, matching production behavior behind kube-auth-proxy

## Endpoints

### `GET /healthcheck`

Returns `{ "status": "ok" }`. Used by `wait-on` to confirm the proxy is ready.

### `GET /e2e-login`

Returns the current session state:

```json
{
  "username": "ldap-user1"
}
```

`username` is `null` if no login has been performed and `oc whoami` failed on startup.

### `POST /e2e-login`

Switches the authenticated user. Cypress calls this during `visitWithLogin`.

**Request:**
```json
{ "username": "ldap-user1", "password": "secret" }
```

**Response (200):**
```json
{ "user": "ldap-user1" }
```

**Behavior:**
1. Runs `oc login` with the provided credentials using an isolated kubeconfig (`/tmp/cypress-e2e.kubeconfig`) — does NOT mutate `~/.kube/config`
2. Runs `oc whoami --show-token` to obtain the user's access token
3. Stores the token — all subsequent proxied requests will use it

## Session Seeding

On startup, the proxy attempts to seed the session from the current `oc` login:

```
oc whoami --show-token  →  token
oc whoami              →  username
```

This means if you're already logged into the cluster via `oc login`, the proxy is immediately ready to forward authenticated requests without needing a `POST /e2e-login` call.

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `PROXY_PORT` | `4040` | Port the proxy listens on |
| `BACKEND_PORT` | `4000` | Port of the local Node.js backend |
| `ODH_DASHBOARD_URL` | from `test-variables.yml` | Cluster dashboard URL for proxied requests |
| `OCP_API_URL` | discovered via `oc whoami --show-server` | OpenShift API URL for `oc login` |
| `CY_TEST_CONFIG` | `packages/cypress/test-variables.yml` | Path to test config file |
| `E2E_PROXY_LOG_LEVEL` | `info` | Log verbosity: `error`, `info`, or `debug` |

### Log Levels

| Level | Output |
|-------|--------|
| `error` | Errors only — `oc login` failures, token errors, proxy 502s |
| `info` | Errors + lifecycle events — login success, server startup, error response bodies (4xx+) |
| `debug` | Everything — per-request routing decisions, BFF request/response details, WebSocket upgrades |

```bash
# Suppress all but errors
E2E_PROXY_LOG_LEVEL=error npm run test:cypress:e2e

# Full request-level tracing
E2E_PROXY_LOG_LEVEL=debug npm run test:cypress:e2e
```

The proxy loads `.env` files from the repo root using the same hierarchical logic as the backend (`.env.development.local` → `.env.development` → `.env.local` → `.env`).

## WebSocket Support

The proxy handles HTTP `Upgrade` requests for WebSocket connections (e.g., `/wss/k8s/*`). The same routing and auth injection logic applies.
