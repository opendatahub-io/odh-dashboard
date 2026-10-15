# Modular Architecture Starter BFF (Minimal)

Minimal backend-for-frontend providing only core endpoints required by the starter UI.

## Dependencies

- Go >= 1.24.3

## Scope

This service exposes:

- GET `/healthcheck` – liveness probe
- GET `/api/v1/user` – returns the authenticated (mock) user
- GET `/api/v1/namespaces` – list namespaces using the authenticated caller's Kubernetes permissions
- `/api/v1/*` (catchall, minus `/api/v1/user` and `/api/v1/namespaces` above) – Data Registry API
  proxy (Iceberg REST Catalog-compatible + RHOAI extensions). See
  [Data Registry API proxy](#data-registry-api-proxy) below.

All former Mod Arch–related endpoints, validation, mocks and OpenAPI dependencies (other than the
vendored Data Registry contract) were removed.

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

| Flag                            | Env Var                        | Description                                                                                                           |
| ------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `-port`                         | `PORT`                         | Listen port (default 4000)                                                                                            |
| `-deployment-mode`              | `DEPLOYMENT_MODE`              | `standalone` or `federated` (default `standalone`)                                                                    |
| `-dev-mode`                     | `DEV_MODE`                     | Enables relaxed behaviors (namespaces listing, etc.)                                                                  |
| `-mock-k8s-client`              | `MOCK_K8S_CLIENT`              | Use in‑memory stub for namespace/user resolution                                                                      |
| `-static-assets-dir`            | `STATIC_ASSETS_DIR`            | Directory to serve single‑page frontend assets                                                                        |
| `-log-level`                    | `LOG_LEVEL`                    | ERROR, WARN, INFO, DEBUG (default INFO)                                                                               |
| `-allowed-origins`              | `ALLOWED_ORIGINS`              | Comma separated CORS origins                                                                                          |
| `-auth-method`                  | `AUTH_METHOD`                  | `user_token` only; uses the authenticated RHOAI/ODH user token                                                        |
| `-auth-token-header`            | `AUTH_TOKEN_HEADER`            | Header to read token from (default `x-forwarded-access-token` for ODH)                                                |
| `-auth-token-prefix`            | `AUTH_TOKEN_PREFIX`            | Expected value prefix (default empty for ODH; use `Bearer` with standard `Authorization`)                             |
| `-cert-file`                    | `CERT_FILE`                    | TLS certificate path (enables TLS when paired with key)                                                               |
| `-key-file`                     | `KEY_FILE`                     | TLS key path                                                                                                          |
| `-insecure-skip-verify`         | `INSECURE_SKIP_VERIFY`         | Skip upstream TLS verify (dev only)                                                                                   |
| `-mock-bff-clients`             | `MOCK_BFF_CLIENTS`             | Use mock BFF clients (no real HTTP calls to other BFFs)                                                               |
| `-data-registry-api-url`        | `DATA_REGISTRY_API_URL`        | Base URL of the upstream Data Registry API. Overrides the ConfigMap lookup when set (local dev/tests)                 |
| `-data-registry-configmap-name` | `DATA_REGISTRY_CONFIGMAP_NAME` | Name of the ConfigMap (in the pod's own namespace) holding the Data Registry API URL (default `data-registry-config`) |
| `-data-registry-configmap-key`  | `DATA_REGISTRY_CONFIGMAP_KEY`  | Key within that ConfigMap holding the URL (default `apiURL`)                                                          |

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

```text
GET /healthcheck
GET /api/v1/user
GET /api/v1/namespaces   (authenticated requests)
/api/v1/*                (Data Registry API proxy catchall, see below)
```

Static assets (index.html fallback) are also served for any other path.

### OpenAPI Specification

The BFF's own contract — covering `/healthcheck`, `/api/v1/user`, `/api/v1/namespaces`, and every
Data Registry proxy route below — is documented at
[`openapi/src/data-registry.yaml`](openapi/src/data-registry.yaml). Proxy route schemas are referenced via
cross-file `$ref` into the vendored [`openapi/src/data-registry-api.yaml`](openapi/src/data-registry-api.yaml)
contract described next, since responses are relayed verbatim.

### Sample local calls

When running with the mocked Kubernetes client (MOCK_K8S_CLIENT=true), the user `user@example.com` has RBAC allowing all three endpoints.

```shell
curl -i localhost:4000/healthcheck
curl -i -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" localhost:4000/api/v1/user
curl -i -H "x-forwarded-access-token: FAKE_CLUSTER_ADMIN_TOKEN" localhost:4000/api/v1/namespaces   # (dev / mock only)
```

### Data Registry API proxy

Under `/api/v1/*` (minus the two explicit `/api/v1/user` and `/api/v1/namespaces` handlers
above), the BFF is a **pure passthrough proxy** — a "dumb proxy" — to the upstream Data Registry
API (an Iceberg REST Catalog-compatible server, plus RHOAI extensions). It performs no
authorization, data persistence, or business logic of its own. See
[RHAI-415](https://redhat.atlassian.net/browse/RHAI-415) and the parent epic
([RHAI-366](https://redhat.atlassian.net/browse/RHAI-366)) for background.

- **Contract**: vendored at [`openapi/src/data-registry-api.yaml`](openapi/src/data-registry-api.yaml),
  fetched from the [data-registry-production](https://gitlab.cee.redhat.com/data-strategy/data-registry-production/-/blob/main/api-contract/data-registry-api.yaml)
  repo. This is manually synced — re-fetch and re-vendor when the backend contract changes (there
  is no automated sync yet; this is a known follow-up risk).
- **Routing**: a single catchall handler, `DataRegistryReverseProxy`
  (`internal/api/registry_proxy_handler.go`), is mounted once on the `DataRegistryPathPrefix+"/"`
  subtree in `Routes()` (`internal/api/app.go`) — there is no per-operation route list. Any
  method/path under the prefix is forwarded as-is; new upstream endpoints become reachable
  without any BFF change. This was an explicit design call (see the RHAI-415 review thread):
  per-route registration gives more visibility but requires manual upkeep as the backend evolves,
  while the BFF's role here is purely to relay — so catchall was chosen.
- **Implementation**: built on `net/http/httputil.ReverseProxy`
  (`internal/proxy/reverse_proxy.go`, `NewDataRegistryReverseProxy`) rather than a hand-rolled
  HTTP client + byte-copy, so streaming, hop-by-hop header handling, and error semantics follow
  the standard library's proxy semantics. `DataRegistryReverseProxy` wraps it with the BFF's own
  config/auth guards (503 if unconfigured, 401 if no bearer token) before delegating.
- **Path shape**: `DataRegistryPathPrefix` is `/api/v1` — the same value as `ApiPathPrefix`, so
  the publicly exposed route shape matches every other BFF in the monorepo. Only the literal
  `/api` segment is stripped before forwarding upstream, so `/api/v1/{project}/namespaces/{collection}/...`
  becomes upstream `/v1/{project}/namespaces/{collection}/...`, matching the vendored OpenAPI
  contract's own `/v1` root exactly. `project` is the RHOAI project (K8s namespace, used by the
  upstream server for SAR) and `collection` is the Iceberg namespace within that project. The
  non-project-scoped route (`/api/v1/config`) needs no special-casing — it's
  just more paths under the same catchall.
- **Auth**: the caller's bearer token (extracted by `InjectRequestIdentity` from the configured
  token header) is forwarded upstream as `Authorization: Bearer <token>` — rebuilt fresh from
  the verified identity, never copied verbatim from the incoming request. The Data Registry
  server's own `kube-rbac-proxy` sidecar performs the actual TokenReview/SAR
  against the `project` path segment; the BFF does not perform its own authorization for these
  routes.
- **Relaying**: request method, body, and the raw query string are forwarded unchanged (query
  string matters for e.g. `/api/v1/{project}/search`). Headers are forwarded unchanged **except**
  `Authorization` (always rebuilt, see above), the configured incoming auth-token header (e.g.
  `x-forwarded-access-token` — see `-auth-token-header` above; never relayed verbatim either, for
  the same reason as `Authorization`), and `X-User` plus legacy Kubeflow identity headers (always
  stripped) — the upstream contract trusts those identity headers for attribution, so a
  caller-supplied value is never relayed as-is. The upstream response
  status, body, and headers are relayed back verbatim by `httputil.ReverseProxy` — including error
  responses, so Iceberg REST error shapes (`{"error": {"message", "type", "code"}}`) reach the
  frontend untransformed.
- **Configuration**: the upstream base URL comes from `-data-registry-api-url`/`DATA_REGISTRY_API_URL`
  when set (local dev/tests), otherwise from a ConfigMap in the pod's own namespace, resolved via a
  bounded-timeout lookup at startup (name/key configurable, see flags table above). Validation
  (`internal/helpers/url.go`, `ValidateUpstreamURL`) requires an absolute `http`/`https` URL with
  no userinfo, query, or fragment; a base path (if any) is preserved and prepended to every
  forwarded request.
  If the ConfigMap isn't available yet at startup — e.g. the Data Registry backend from
  [RHAISTRAT-2381](https://redhat.atlassian.net/browse/RHAISTRAT-2381) hasn't been deployed —
  the BFF logs a warning, every `/api/v1/*` proxy route returns `503 Service Unavailable`, and a
  background retry loop (`internal/api/data_registry_discovery.go`, mirroring the MaaS BFF's
  discovery pattern) keeps polling the ConfigMap with exponential backoff. As soon as it appears,
  routes start working immediately — no pod restart required.

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

### Authentication

Data Registry is an ODH Dashboard/RHOAI module and supports only `user_token` authentication.
The BFF extracts the user's OpenShift bearer token from the configured header (normally
`x-forwarded-access-token`) and uses that same token for Kubernetes requests. Kubernetes therefore
applies the requesting user's RBAC permissions directly; the BFF does not use a service-account
client or user impersonation.

The authenticated request identity is propagated to both the typed and dynamic Kubernetes
clients. Project discovery first attempts the core Kubernetes Namespace API. When that list is
forbidden for the caller, the BFF falls back to the OpenShift Project API
(`project.openshift.io/v1/projects`), which applies the caller's visibility rules. The returned
projects are exposed through the existing namespaces endpoint for the Data Registry project
selector; the BFF does not list all projects and filter them using only the service account's
permissions.

> **Note:** Mock mode uses synthetic bearer tokens for local tests. The federated startup
> configuration uses `x-forwarded-access-token` without a prefix, matching the RHOAI/ODH proxy
> integration.

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
    value: 'true'
```

**Local development:**

```shell
./bin/bff --insecure-skip-verify
# or
export INSECURE_SKIP_VERIFY=true
```

> **Warning:** Only use in development. Keep TLS verification enabled in production.

## DCH Connection Lookup

`GET /api/v1/connections/{namespace}` returns `ConnectionRef` objects in `data`, with
optional `name` and `connectionType` display fields. Partial type resolution is reported
through `metadata.warnings`. It calls the DCH BFF's `/api/v1/connections` and
`/api/v1/connection-types` concurrently with the user's token and selected project.
The project is distinct from the namespace hosting either BFF. Asset routes remain proxies.

An empty `BFF_DCH_SERVICE_NAME` disables DCH. The federated manifest sets it to
`odh-dashboard-data-connect-hub-ui`, with HTTPS on **9243**, matching the DCH UI/BFF image
and Service in this repository's `main` branch. The DCH Service, container listener and
federation configuration must use that port before enabling this integration.
`BFF_DCH_SERVICE_NAMESPACE` defaults to the caller's
pod namespace; set it explicitly for a different module namespace. The checked-in
NetworkPolicies allow communication between the two module pods in the same namespace.
For different namespaces, add appropriately scoped namespace selectors on both policies.

The client trusts the CA bundles already loaded by `--bundle-paths`. It forwards the raw
user token through `x-forwarded-access-token`. For a standalone DCH BFF expecting a different
header, set `BFF_DCH_AUTH_TOKEN_HEADER=Authorization` and `BFF_DCH_AUTH_TOKEN_PREFIX="Bearer "`.
`BFF_DCH_DEV_URL` overrides the service URL for local testing and must include `/api/v1`;
the service name must still be set. Set `BFF_DCH_TLS_ENABLED=false` only for a local HTTP
endpoint. Production must retain certificate verification.

`BFF_DCH_TIMEOUT_SECONDS` bounds both requests together (default 5 seconds). Network errors,
timeouts and upstream 5xx trigger Secret fallback using the original request context.
401/403 are access errors; other 4xx and invalid contracts return 502 without fallback.
A missing connector type omits that connection and returns a warning. The service does not
probe DCH during startup, cache user connection lists, or convert saved references.

Structured `Connection lookup` events record namespace, source, outcome, reason, count and
elapsed milliseconds. Aggregate these events for success/failure rates, fallback frequency
and latency. Upstream bodies and user tokens are excluded. Tune the deadline after measuring
cluster latency and connection counts; ensure fallback is not hiding connectivity failures.

For a mock DCH response with opaque type ID resolution, start the BFF with
`--mock-bff-clients --bff-dch-service-name=mock-dch` alongside the usual development flags.
Leaving the service name unset exercises the Secret path. Contract tests can exercise both:

```bash
pnpm run test:contract
BFF_DCH_SERVICE_NAME=mock-dch MOCK_BFF_CLIENTS=true pnpm run test:contract
```

The shared API contract is manually synchronized from `data-registry-production`. Version
0.8.0 requires the upstream server to discard display fields on writes and support volume
connection replacement. Those server changes and cluster write-and-read tests are separate
from the BFF's connection lookup and must be completed before declaring the integration ready.
