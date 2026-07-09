# Core BFF

Backend-for-frontend providing core endpoints required by the dashboard UI.

## Dependencies

- Go >= 1.25

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
| `-auth-method` | `AUTH_METHOD` | `user_token` (default) or `disabled` (skips auth) |
| `-auth-token-header` | `AUTH_TOKEN_HEADER` | Header to read token from (default `x-forwarded-access-token`) |
| `-auth-token-prefix` | `AUTH_TOKEN_PREFIX` | Expected value prefix (default empty) |
| `-cert-file` | (CLI only) | TLS certificate path (enables TLS when paired with key) |
| `-key-file` | (CLI only) | TLS key path |
| `-insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | Skip upstream TLS verify (dev only) |
| `-mock-bff-clients` | `MOCK_BFF_CLIENTS` | Use mock BFF clients (no real HTTP calls to other BFFs) |
| `-namespace` | `NAMESPACE` / `OC_PROJECT` | K8s namespace for dashboard resources (default `opendatahub`, falls back to `OC_PROJECT`) |
| `-workbench-namespace` | `WORKBENCH_NAMESPACE` | K8s namespace for workbenches (defaults to dashboard namespace) |
| `-dashboard-config-name` | `DASHBOARD_CONFIG_NAME` | Name of the OdhDashboardConfig CR (default `odh-dashboard-config`) |
| `-enabled-apps-cm` | `ENABLED_APPS_CM` | Name of the ConfigMap tracking enabled applications |
| `-mf-remotes-config` | `MF_REMOTES_CONFIG` | Path to module federation remotes config file |

TLS: If both `cert-file` and `key-file` are provided the server starts with HTTPS.

## Platform Detection

The BFF supports three platform modes via `ODH_PLATFORM_TYPE`:

- **`XKS`** - Generic Kubernetes. Skips all OpenShift API calls at startup and applies XKS feature overrides.
- **`OpenShift`** - Probes for ClusterVersion (cluster ID) and console-config (branding).
- **Unset** (default) - Auto-detects by probing the ClusterVersion CRD. If found, behaves as OpenShift. If absent, behaves as XKS. The resolved platform drives both startup behavior and feature overrides.

### Mismatch policy

When `ODH_PLATFORM_TYPE` is set explicitly, the configured value is always trusted. For explicit `OpenShift`, the ClusterVersion probe still runs and a warning is logged if the detected platform does not match. For explicit `XKS`, the probe is skipped entirely (no OpenShift API calls are made), so no mismatch warning can occur. When the probe returns an ambiguous error (not clearly "resource unavailable"), auto-detect defaults to OpenShift.

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
```

### Route Security

Authenticated endpoints use `secureRoute()` (token validation + audit logging) and admin endpoints use `secureAdminRoute()` (token validation + SSAR admin check + audit logging). Admin detection checks SSAR for `patch` on `auths/default-auth`. Non-admin users receive 401. Namespace validation is handled separately by `isAllowedNamespace`.

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
./bin/bff --insecure-skip-verify
# or
export INSECURE_SKIP_VERIFY=true
```

> **Warning:** Only use in development. Keep TLS verification enabled in production.
