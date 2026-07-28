# Modular Architecture Starter BFF (Minimal)

Minimal backend-for-frontend providing only core endpoints required by the starter UI.

## Dependencies

- Go >= 1.24.3

## Scope

This service exposes core dashboard endpoints plus agent runtime APIs backed by Kubernetes (or an in-memory mock when `MOCK_AGENT_CLIENT=true` for local development):

- GET `/healthcheck` – liveness probe
- GET `/api/v1/user` – returns the authenticated user
- GET `/api/v1/namespaces` – list namespaces (available only when DEV_MODE=true or mock k8s enabled)
- GET `/api/v1/agents/runtimes` – list deployed agent and tool runtimes
- GET `/api/v1/agents/runtimes/{ns}/{name}` – full runtime detail for one agent

Agent endpoints validate `{ns}` and `{name}` as DNS-1123 identifiers. List discovery loads Sandbox CRs (`agents.x-k8s.io/v1beta1/sandboxes`) labeled `openshell.ai/managed-by=openshell`. Detail loads any authorized Sandbox CR by name (no label filter).

Discovery metadata uses Starter Kit annotations: `openshift.io/display-name`, `openshift.io/description`, and `opendatahub.io/agent-framework`. Container ports are read from `spec.podTemplate.spec.containers[].ports` and exposed with `status.serviceFQDN` in list/detail responses. Agent card enrichment is disabled for 3.5 discovery scope.

Per-request RBAC checks filter namespaces and gate detail access via `agents.x-k8s.io/sandboxes` list/get; stop/start require `patch`; delete requires `delete`. Deploy RBAC requires `agents.x-k8s.io/sandboxes` create and get.

**Cluster RBAC (modules service account):** `manifests/modular-architecture/modules-cluster-role.yaml` grants `impersonate` on users/groups/serviceaccounts (for `AUTH_METHOD=internal`), `create` on `subjectaccessreviews`, and `get`/`list` on agent card discovery CRDs. With **`AUTH_METHOD=user_token`** (ODH/RHOAI default), the BFF uses the forwarded user token for Kubernetes reads and enrichment; the caller's RBAC must allow `agents.x-k8s.io/sandboxes` list/get in target namespaces, plus optional Service and enrichment CRD access.

Set `MOCK_AGENT_CLIENT=true` to serve built-in demo data (`agent-ops-demo` / `sample-support-agent`) without cluster access.

## OpenAPI and Swagger UI

The BFF serves the OpenAPI contract for local and cluster developer documentation. The canonical spec lives at `../api/openapi/agent-ops.yaml`; a synced runtime copy is kept at `openapi/src/agent-ops.yaml` for the running binary.

| Route | Description |
|-------|-------------|
| GET `/mod-arch/openapi.json` | OpenAPI 3.0 document (JSON; includes dynamic server URL) |
| GET `/mod-arch/openapi.yaml` | OpenAPI 3.0 document (YAML) |
| GET `/mod-arch/swagger-ui` | Swagger UI (loads spec from `/mod-arch/openapi.json`) |
| GET `/mod-arch/openapi` | Redirects to `/mod-arch/swagger-ui` |

These routes are unauthenticated (same pattern as gen-ai and eval-hub).

After editing `api/openapi/agent-ops.yaml`, sync the runtime copy:

```shell
make sync-openapi
```

`make test`, `make build`, and `npm run test:contract` (from `packages/agent-ops/`) run `check-openapi-sync` and fail if the two files differ.

**Local example** (default port 4000):

```shell
make dev-bff
open http://localhost:4000/mod-arch/swagger-ui
curl -s http://localhost:4000/mod-arch/openapi.json | jq .info
```

**Federated dev note:** the Module Federation dev proxy forwards `/agent-ops/api` and `/healthcheck` only. Open Swagger against the BFF port directly (for example `4021` when using `bffConfig.port`).

## Development

Run the following command to build the BFF:

```shell
make build
```

After building it, you can run our app with:

```shell
make run
```

If you want to use a different port or mock kubernetes client you can run:

```shell
make run PORT=8000 MOCK_K8S_CLIENT=true
```

If you want to change the log level on deployment, add the LOG_LEVEL argument when running, supported levels are: ERROR, WARN, INFO, DEBUG. The default level is INFO.

```shell
# Run with debug logging
make run LOG_LEVEL=DEBUG
```

## Flags / Environment Variables

| Flag | Env Var | Description |
|------|---------|-------------|
| `-port` | `PORT` | Listen port (default 4000) |
| `-deployment-mode` | `DEPLOYMENT_MODE` | `standalone` or `integrated` (default `standalone`) |
| `-dev-mode` | `DEV_MODE` | Enables relaxed behaviors (namespaces listing, etc.) |
| `-mock-k8s-client` | `MOCK_K8S_CLIENT` | Use in‑memory stub for namespace/user resolution |
| `-mock-agent-client` | `MOCK_AGENT_CLIENT` | Use in‑memory demo agent data (local dev only; no cluster RBAC) |
| `-static-assets-dir` | `STATIC_ASSETS_DIR` | Directory to serve single‑page frontend assets |
| `-log-level` | `LOG_LEVEL` | ERROR, WARN, INFO, DEBUG (default INFO) |
| `-allowed-origins` | `ALLOWED_ORIGINS` | Comma separated CORS origins |
| `-auth-method` | `AUTH_METHOD` | `user_token` (default, recommended) or `internal` (Kubeflow only) |
| `-auth-token-header` | `AUTH_TOKEN_HEADER` | Header to read token from (default `x-forwarded-access-token` for ODH) |
| `-auth-token-prefix` | `AUTH_TOKEN_PREFIX` | Expected value prefix (default empty for ODH; use `Bearer` with standard `Authorization`) |
| `-cert-file` | `CERT_FILE` | TLS certificate path (enables TLS when paired with key) |
| `-key-file` | `KEY_FILE` | TLS key path |
| `-insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | Skip upstream TLS verify (dev only) |
| `-mock-bff-clients` | `MOCK_BFF_CLIENTS` | Use mock BFF clients (no real HTTP calls to other BFFs) |

TLS: If both `cert-file` and `key-file` are provided the server starts with HTTPS.

## Running the linter locally

The BFF directory uses golangci-lint to combine multiple linters for a more comprehensive linting process. To install and run simply use:

```shell
cd clients/ui/bff
make lint
```

For more information on configuring golangci-lint see the [documentation](https://golangci-lint.run/).

## Building and Deploying

Run the following command to build the BFF:

```shell
make build
```

The BFF binary will be inside `bin` directory

You can also build BFF docker image with:

```shell
make docker-build
```

## Endpoints

JSON API endpoints plus static asset serving (index.html fallback):

```text
GET /healthcheck
GET /api/v1/user
GET /api/v1/namespaces              (dev / mock mode only)
GET /api/v1/agents/runtimes
GET /api/v1/agents/runtimes/{ns}/{name}
```

### Sample local calls

Start the BFF with mock Kubernetes and mock agent data (from `packages/agent-ops`):

```shell
make dev-bff
```

`dev-bff` uses `AUTH_METHOD=user_token`. Send any non-empty token on the default header (the value is not validated in mock mode):

```shell
TOKEN_HDR="x-forwarded-access-token: dev-token"

curl -i localhost:4000/healthcheck
curl -i -H "$TOKEN_HDR" localhost:4000/api/v1/user
curl -i -H "$TOKEN_HDR" localhost:4000/api/v1/namespaces   # dev / mock only

# Agent APIs (use -mock-agent-client for demo data; otherwise reads Sandbox CRs from the cluster)
curl -s -H "$TOKEN_HDR" localhost:4000/api/v1/agents/runtimes | jq .
curl -s -H "$TOKEN_HDR" localhost:4000/api/v1/agents/runtimes/agent-ops-demo/sample-support-agent | jq .
```

For Kubeflow-style `internal` auth instead, use `kubeflow-userid: user@example.com` (and run with `AUTH_METHOD=internal`).

### Inter-BFF Communication

The BFF includes a `bffclient` package (`internal/integrations/bffclient/`) that provides the scaffolding for calling other BFF services in a multi-BFF pod deployment. The package is target-agnostic — teams wire up their own target BFF endpoints on top of this infrastructure.

#### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        ODH Dashboard Pod                     │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Gen-AI BFF  │──│   MaaS BFF   │──│ Model Registry   │   │
│  │    :8143     │  │    :8243     │  │   BFF :8043      │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│         │                  │                    │            │
│  ┌──────────────┐          │                    │            │
│  │  MLflow BFF  │──────────┴────────────────────┘            │
│  │    :8343     │     Inter-BFF HTTP Calls                   │
│  └──────────────┘  (K8s service DNS or localhost)            │
└──────────────────────────────────────────────────────────────┘
```

#### Adding a BFF target

1. Add target-specific config fields to `internal/config/environment.go` (e.g. `BFF<Target>ServiceName`, `BFF<Target>ServicePort`, etc.)
2. Add corresponding CLI flags to `cmd/main.go`
3. Apply config overrides in `NewApp()` in `internal/api/app.go`
4. Create a handler in `internal/api/` using `bffclient.GetClient()` and `bffclient.AttachBFFClient()` middleware
5. Wire routes in `Routes()`

See the `bffclient` package README and the implementation spec for detailed guidance.

### Authentication modes

Two modes are supported (flag `--auth-method` / env `AUTH_METHOD`):

- **user_token** (default, recommended): extracts a bearer token from the configured header (default `x-forwarded-access-token` for ODH/RHOAI) and performs SelfSubjectAccessReview. This is the standard authentication method for ODH/RHOAI deployments and is recommended for most use cases including mock/development mode.
- **internal** (Kubeflow only): impersonates the provided `kubeflow-userid` (and optional `kubeflow-groups`) headers using a cluster or local kubeconfig credential. Only use this mode for Kubeflow Central Dashboard deployments.

> **Note:** For local development in mock mode, use `user_token` authentication (the default). The `internal` mode is only needed for Kubeflow-specific deployments.

### Overriding token header / prefix

By default, the BFF expects the token in the `x-forwarded-access-token` header with no prefix (ODH/RHOAI default). If using the standard `Authorization` header, set the prefix to `Bearer`.

If you're integrating with a proxy or tool that uses a different header, you can override this behavior using environment variables or Makefile arguments.

```shell
make run AUTH_METHOD=user_token AUTH_TOKEN_HEADER=X-Forwarded-Access-Token AUTH_TOKEN_PREFIX=""
```

This will configure the BFF to extract the raw token from the following header:

```shell
X-Forwarded-Access-Token: <your-token>
```

### Enabling CORS

When serving the UI directly from the BFF there is no need for any CORS headers to be served, by default they are turned off for security reasons.

If you need to enable CORS for any reasons you can add origins to the allow-list in several ways:

##### Via the make command

Add the following parameter to your command: `ALLOWED_ORIGINS` this takes a comma separated list of origins to permit serving to, alterantively you can specify the value `*` to allow all origins, **Note this is not recommended in production deployments as it poses a security risk**

Examples:

```shell
# Allow only the origin http://example.com:8081
make run ALLOWED_ORIGINS="http://example.com:8081"

# Allow the origins http://example.com and http://very-nice.com
make run ALLOWED_ORIGINS="http://example.com,http://very-nice.com"

# Allow all origins
make run ALLOWED_ORIGINS="*"

# Explicitly disable CORS (default behaviour)
make run ALLOWED_ORIGINS=""
```

#### Via environment variable

Setting CORS via environment variable follows the same rules as using the Makefile, simply set the environment variable `ALLOWED_ORIGINS` with the same value as above.

#### Via command line argument

Setting CORS via command line arguments follows the same rules as using the Makefile. Simply add the `--allowed-origins=` flag to your command.

Examples:

```shell
./bff --allowed-origins="http://my-domain.com,http://my-other-domain.com"
```

### Disabling TLS verification (development only)

For local Kubeflow installations with self-signed certificates, you may need to disable TLS certificate verification.

**Kubernetes deployment:**

```yaml
env:
  - name: INSECURE_SKIP_VERIFY
    value: "true"
```

**Local development:**

```shell
./bin/bff --insecure-skip-verify
# or
export INSECURE_SKIP_VERIFY=true
```

> **Warning:** Only use in development. Keep TLS verification enabled in production.
