# Core BFF

Backend-for-frontend providing core endpoints required by the dashboard UI.

## Dependencies

- Go >= 1.26

## Scope

This service exposes infrastructure endpoints, config/status endpoints, and resource CRUD.
For the complete endpoint catalog with request/response schemas, see the
[OpenAPI specification](openapi/src/core-bff.yaml).

## Development

Build the BFF:

```shell
make build
```

Run with mock K8s client:

```shell
make run PORT=4000 MOCK_K8S_CLIENT=true
```

Run with debug logging:

```shell
make run LOG_LEVEL=DEBUG
```

## Flags / Environment Variables

| Flag | Env Var | Description |
|------|---------|-------------|
| `-port` | `PORT` | Listen port (default 4000) |
| `-deployment-mode` | `DEPLOYMENT_MODE` | `standalone` (default) or `federated` |
| `-platform-type` | `ODH_PLATFORM_TYPE` | `OpenShift` (probe cluster info), `XKS` (skip OpenShift detection), empty (auto-detect) |
| `-dev-mode` | `DEV_MODE` | Enables relaxed behaviors (namespaces listing, etc.) |
| `-mock-k8s-client` | `MOCK_K8S_CLIENT` | Use in-memory stub for K8s operations |
| `-static-assets-dir` | `STATIC_ASSETS_DIR` | Directory to serve single-page frontend assets |
| `-log-level` | `LOG_LEVEL` | ERROR, WARN, INFO, DEBUG (default INFO) |
| `-allowed-origins` | `ALLOWED_ORIGINS` | Comma separated CORS origins |
| `-auth-method` | `AUTH_METHOD` | `user_token` (default) or `disabled` (skips auth; rejected at startup in a production profile) |
| `-admission-mode` | `ADMISSION_MODE` | `auth-resource`, `authenticated`, or empty to resolve from the platform. See [bootstrap-contract.md](../docs/bootstrap-contract.md) |
| `-bundle-paths` | `BUNDLE_PATHS` | Comma separated PEM CA bundles for outbound TLS. Setting it explicitly makes it required: startup fails if none load |
| `-auth-token-header` | `AUTH_TOKEN_HEADER` | Header to read token from (default `x-forwarded-access-token`); must be a valid HTTP field name |
| `-auth-token-prefix` | `AUTH_TOKEN_PREFIX` | Expected value prefix (default empty) |
| `-cert-file` | `CERT_FILE` | TLS serving certificate path (enables TLS; both halves required) |
| `-key-file` | `KEY_FILE` | TLS serving key path (enables TLS; both halves required) |
| `-insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | Skip upstream TLS verify (requires `DEV_MODE=true`; rejected at startup otherwise) |
| `-mock-bff-clients` | `MOCK_BFF_CLIENTS` | Use mock BFF clients (no real HTTP calls to other BFFs) |
| `-namespace` | `NAMESPACE` / `POD_NAMESPACE` / `OC_PROJECT` | K8s namespace for dashboard resources (default `opendatahub`, falls back to `POD_NAMESPACE`, then `OC_PROJECT`) |
| `-operator-namespace` | `OPERATOR_NAMESPACE` | Preferred namespace for the data science operator Subscription (default empty); probes the configured namespace when set, then the platform default and, for ODH, `openshift-operators` |
| `-workbench-namespace` | `WORKBENCH_NAMESPACE` | K8s namespace for workbenches (defaults to dashboard namespace) |
| `-dashboard-config-name` | `DASHBOARD_CONFIG_NAME` | Name of the OdhDashboardConfig CR (default `odh-dashboard-config`) |
| `-enabled-apps-cm` | `ENABLED_APPS_CM` | Name of the ConfigMap tracking enabled applications |
| `-mf-remotes-config` | `MF_REMOTES_CONFIG` | Path to module federation remotes config file |
| `-model-serving-host` | `MODEL_SERVING_HOST` | Override URL for model-serving proxy target (default: auto-constructed from namespace). Must be an absolute base URL without a query or fragment; `https` unless `DEV_MODE=true` |
| `-prometheus-host` | `PROMETHEUS_HOST` | Full Prometheus/Thanos host URL override. Must be an absolute base URL without a query or fragment; `https` unless `DEV_MODE=true` |
| `-prometheus-namespace` | `PROMETHEUS_NAMESPACE` | Prometheus/Thanos namespace (default `openshift-monitoring`) |
| `-prometheus-instance` | `PROMETHEUS_INSTANCE` | Prometheus/Thanos instance name (default `thanos-querier`) |
| `-prometheus-port` | `PROMETHEUS_PORT` | Prometheus/Thanos RBAC port (default `9092`); must be 1-65535 |

### TLS

If both `cert-file` and `key-file` are provided the server starts with HTTPS.

When TLS is enabled (`-cert-file`/`CERT_FILE` and `-key-file`/`KEY_FILE` both set), there are **two serving paths**, chosen by the resolved platform:

**On OpenShift**, the HTTPS listener resolves its TLS policy (minimum version and cipher suites) from the OpenShift cluster-wide TLS security profile (`apiservers.config.openshift.io/cluster`) instead of using a fixed configuration. The listener re-reads the profile periodically and gracefully restarts to apply changes without a pod restart. This requires permission to read (`get`) the `apiservers` resource in the `config.openshift.io` API group (granted via the module's ClusterRole). Startup fails closed if the profile read is denied (403/401) or the profile is malformed. On transient API errors the listener falls back to Mozilla Intermediate defaults (TLS 1.2). Note the startup vs. reload distinction: the Intermediate fallback on transient errors applies only at **startup**; during a periodic **reload**, any failed profile read (transient, denied, or malformed) instead **retains the current configuration** and keeps serving, re-applying automatically on the next clean read. The cluster profile's cipher list governs only TLS 1.2 and earlier — Go always manages TLS 1.3 cipher suites itself, so they cannot be restricted through the profile (this applies to Custom profiles too). The reload retention described here applies to *failed* reads; a successful read that finds the APIServer config API absent (`NotFound`) resolves to Intermediate rather than retaining the previous policy.

**On a confirmed XKS platform** (set explicitly, or auto-detected because the ClusterVersion API is not served), the profile is never read. An auto-detected platform whose probe was inconclusive keeps the profile-aware listener, so set `ODH_PLATFORM_TYPE=XKS` before removing the profile-read permission. `apiservers.config.openshift.io` does not exist there, so the read could only ever fall back to Intermediate defaults — but issuing it would still make startup depend on a `config.openshift.io` permission the xKS profile deliberately omits. The listener serves those same Mozilla Intermediate defaults directly, and the `config.openshift.io` ClusterRole rule is inert.

**Certificate rotation applies to both paths.** The serving pair is served through `tls.Config.GetCertificate`, which reloads it when the certificate or key file's modification time changes, so an in-place rotation of the mounted Secret (cert-manager, OpenShift service CA) is picked up without a pod restart. A resumed TLS session can skip that callback, so verify a rotation on a fresh, non-resumed TLS connection (for example a new `openssl s_client` run without `-sess_in`). Startup is fail-closed — an incomplete or unloadable pair, or one whose leaf is outside its validity window when the listener loads it, stops the process rather than silently serving plaintext HTTP. Rotation is fail-safe — an unusable rotation (unparseable, mismatched, or a leaf outside its validity window) keeps the last-known-good certificate and never downgrades the transport. Publish a rotated pair atomically (Kubernetes Secret volumes do): a partial write that already holds a complete, matching leaf cannot be told apart from a finished one.

See [runtime-contract.md](../docs/runtime-contract.md) for the full TLS, trust and rotation contract.

## Platform Detection

The BFF supports three platform modes via `ODH_PLATFORM_TYPE`:

- **`XKS`** - Generic Kubernetes. Skips all OpenShift API calls at startup and applies XKS feature overrides.
- **`OpenShift`** - Probes for ClusterVersion (cluster ID) and console-config (branding).
- **Unset** (default) - Auto-detects by reading the ClusterVersion singleton. A successful read is OpenShift (with or without a cluster ID). An API that discovery reports absent is XKS. Anything else (singleton missing, forbidden, timeout) is an unconfirmed XKS guess. The resolved platform drives both startup behavior and feature overrides.

### Mismatch policy

When `ODH_PLATFORM_TYPE` is set explicitly, the configured value is always trusted. For explicit `OpenShift`, the ClusterVersion probe still runs and a warning is logged if the detected platform does not match. For explicit `XKS`, the probe is skipped entirely (no OpenShift API calls are made), so no mismatch warning can occur. When the probe returns an ambiguous error (not clearly "resource unavailable"), auto-detect falls back to **XKS** — the least-privilege answer for deciding which API calls to make. That fallback is recorded as *unconfirmed*: it drives API behaviour but not the bootstrap admission contract, which keeps its restrictive default until the platform is explicitly configured or positively detected. See [bootstrap-contract.md](../docs/bootstrap-contract.md).

## Response security headers and cache policy

Every normal HTTP reply gets browser security headers via response-writer middleware:

| Header | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `X-DNS-Prefetch-Control` | `off` |

`Cache-Control` is selective:

- **API paths** (`/api`, `/wss`, module `/…/api/…`) and **SPA document** responses use `no-cache, no-store, private, max-age=0, must-revalidate`.
- **Module API proxies** also force `no-store` via `ModifyResponse` (parity with the Node `rewriteNoStoreCacheHeaders` helper).
- **Host static assets** use filename-based policies (immutable for content-hashed bundles, `no-cache` for unhashed scripts, short TTL for media).

Informational `1xx` writes are forwarded without committing the response so a later final status (for example `404` after `103`) is preserved.

### WebSocket 101 upgrade responses

`SetSecurityHeaders` does **not** cover WebSocket upgrades — `gorilla/websocket`'s `Upgrade` writes the `101 Switching Protocols` response directly. `X-Content-Type-Options: nosniff` is passed via the upgrader's `responseHeader` (see `clientUpgradeResponseHeader` in `ws_handshake.go`), along with the negotiated `Sec-WebSocket-Protocol` when present. Unrelated queued headers are not copied onto the 101.

## Endpoints

### Sample local calls

When running with the mocked K8s client (`MOCK_K8S_CLIENT=true`), the user `user@example.com` has RBAC allowing all endpoints.

```shell
# Infrastructure
curl -i localhost:4000/healthcheck
curl -i -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" localhost:4000/api/v1/user

# Config & Status
curl -i -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" localhost:4000/api/config
curl -i -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" localhost:4000/api/status
curl -i -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" localhost:4000/api/cluster-settings
curl -i -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" localhost:4000/api/components
curl -i -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" localhost:4000/api/connection-types

# Model Serving
curl -i -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" localhost:4000/api/nim-serving/apiKeySecret
curl -i -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" localhost:4000/api/integrations/nim
curl -i -X POST -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"query":"up"}' localhost:4000/api/prometheus/query
```

### Route Security

Authenticated endpoints use `secureRoute()` (token validation + audit logging) and admin endpoints use `secureAdminRoute()` (token validation + SSAR admin check + audit logging). Admin detection checks SSAR for `patch` on `auths/auth`. Non-admin users receive 403. Namespace validation is handled separately by `isAllowedNamespace`.

### Privilege Model

The BFF uses two types of K8s clients:

- **Service account clients** (`saDynClient`, `saClientset`) - for reading shared config (DashboardConfig, Auth, Components) and performing admin-gated mutations (connection types, cluster settings). Matches Fastify's privileged watcher model.
- **Per-request user clients** - for SSAR checks (`IsUserAdmin`, `IsUserAllowed`) and token validation via `SelfSubjectReview`.

### XKS Platform Overrides

When the platform is XKS (explicit or auto-detected), the BFF disables OpenShift-dependent features:
- `enablement` set to `false`
- `disableProjects`, `disableBYONImageStream`, `disableISVBadges`, `disableAppLauncher`, `disablePipelines` set to `true`
- `mlflow` set to `false`

These run after feature lockouts (`disableFineTuning`, `mlflow`) and header overrides, so they take precedence.

### Inter-BFF Communication

The BFF includes a `bffclient` package (`internal/integrations/bffclient/`) for calling other BFF services in a multi-BFF pod deployment.

## Linting

```shell
make lint
```

Uses golangci-lint. See the [documentation](https://golangci-lint.run/) for configuration.

## Building and Deploying

```shell
make build
```

The binary will be inside the `bin` directory.

Docker images from the distribution root (`core-bff/`):

```shell
cd .. && make docker-build
```

### Authentication modes

Two modes are supported (flag `--auth-method` / env `AUTH_METHOD`):

- **user_token** (default): extracts a bearer token from the configured header and performs SelfSubjectReview.
- **disabled**: skips identity extraction entirely. Useful for local development or testing.

### Enabling CORS

CORS is disabled by default. Enable with `ALLOWED_ORIGINS`:

```shell
make run ALLOWED_ORIGINS="http://localhost:3000"
make run ALLOWED_ORIGINS="*"   # allow all (not for production)
```

### Disabling TLS verification (development only)

```shell
./bin/bff --dev-mode --insecure-skip-verify
# or
export DEV_MODE=true INSECURE_SKIP_VERIFY=true
```

> **Warning:** Only use in development. Keep TLS verification enabled in production.
