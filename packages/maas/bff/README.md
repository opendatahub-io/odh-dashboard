# MaaS BFF

Go Backend-for-Frontend that sits between the MaaS React UI and the backing systems: Kubernetes (MaaSSubscription, MaaSAuthPolicy, MaaSModelRef, Tenant CRDs) and the MaaS API (key minting, model listing, gateway discovery).

## Dependencies

- Go >= 1.26

## Development

Build the BFF binary:

```shell
make build
```

Run in mock mode (no cluster or MaaS API required — recommended for local UI development):

```shell
make run MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true DEV_MODE=true AUTH_METHOD=internal
```

Run on a custom port with debug logging:

```shell
make run PORT=8000 MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true AUTH_METHOD=internal LOG_LEVEL=DEBUG
```

From the package root, the Makefile targets wrap common configurations:

```shell
# Standalone mock mode (port 4000)
make dev-bff

# Federated mode against a real cluster (port 8081)
make dev-bff-federated

# Federated mode with mocks (port 8081, no cluster)
make dev-bff-federated-mock
```

## Flags / Environment Variables

Defaults below are what `make run` passes (see `bff/Makefile`). Direct `go run ./cmd` uses the binary flag defaults noted in parentheses when they differ.

| Flag                    | Env Var                | Description                                               | Default (`make run`)           |
| ----------------------- | ---------------------- | --------------------------------------------------------- | ------------------------------ |
| `-port`                 | `PORT`                 | Listen port                                               | `4000`                         |
| `-deployment-mode`      | `DEPLOYMENT_MODE`      | `standalone`, `kubeflow`, or `federated`                  | `kubeflow` (CLI: unset)        |
| `-dev-mode`             | `DEV_MODE`             | Enables relaxed behaviors (e.g. namespace listing)        | `false`                        |
| `-mock-k8s-client`      | `MOCK_K8S_CLIENT`      | Use in-memory stub for Kubernetes                         | `false`                        |
| `-mock-http-client`     | `MOCK_HTTP_CLIENT`     | Use in-memory stub for MaaS API                           | `false`                        |
| `-static-assets-dir`    | `STATIC_ASSETS_DIR`    | Directory to serve SPA frontend assets                    | `./static`                     |
| `-log-level`            | `LOG_LEVEL`            | `ERROR`, `WARN`, `INFO`, `DEBUG`                          | `info`                         |
| `-allowed-origins`      | `ALLOWED_ORIGINS`      | Comma-separated CORS origins                              | _(none)_                       |
| `-auth-method`          | `AUTH_METHOD`          | `internal` or `user_token`                                | `user_token` (CLI: `internal`) |
| `-auth-token-header`    | `AUTH_TOKEN_HEADER`    | Header to read the bearer token from                      | `x-forwarded-access-token`     |
| `-auth-token-prefix`    | `AUTH_TOKEN_PREFIX`    | Expected token prefix                                     | _(empty)_                      |
| `-cert-file`            | `CERT_FILE`            | TLS certificate path (enables HTTPS when paired with key) | _(none)_                       |
| `-key-file`             | `KEY_FILE`             | TLS key path                                              | _(none)_                       |
| `-insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | Skip upstream TLS verification (**dev only**)             | `false`                        |

## Endpoints

Most API groups live under `/api/v1/`. Health is unprefixed.

| Group           | Sample paths                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health          | `GET /healthcheck`                                                                                                                                                                    |
| User / identity | `GET /api/v1/user`, `GET /api/v1/whoami`                                                                                                                                              |
| Namespaces      | `GET /api/v1/namespaces` (dev / mock mode only)                                                                                                                                       |
| Models          | `GET /api/v1/models`                                                                                                                                                                  |
| Gateway         | `GET /api/v1/gateway-url`                                                                                                                                                             |
| API keys        | `POST /api/v1/api-keys`, `GET /api/v1/api-keys`, `DELETE /api/v1/api-keys/:id`                                                                                                        |
| Subscriptions   | `GET /api/v1/all-subscriptions`, `GET /api/v1/subscription-info/:name`, `POST /api/v1/new-subscription`, `PUT /api/v1/update-subscription/:name`, `DELETE /api/v1/subscription/:name` |
| Auth policies   | `GET /api/v1/all-policies`, `GET /api/v1/view-policy/:name`                                                                                                                           |

See [`openapi.yaml`](./openapi.yaml) for full request/response shapes and [`CONSUMERS.md`](./CONSUMERS.md) for the stable inter-BFF contract.

## Sample Local Calls

When running with mocked clients (`MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true`), the user `user@example.com` has access to all endpoints.

```shell
curl -i localhost:4000/healthcheck

curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/user

curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/models

# Namespaces — only available in dev/mock mode
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/namespaces
```

## Authentication Modes

Set via `--auth-method` / `AUTH_METHOD`:

- **`internal`** (CLI default): Impersonates the user identified in the `kubeflow-userid` (and optional `kubeflow-groups`) headers using cluster or local kubeconfig credentials. Used for standalone and kubeflow modes.
- **`user_token`** (`make run` default): Extracts a bearer token from the configured header/prefix and performs a `SelfSubjectAccessReview`. Used for federated/RHOAI mode.

### Overriding the token header / prefix

If your proxy passes the token in a non-standard header:

```shell
make run AUTH_METHOD=user_token AUTH_TOKEN_HEADER=x-forwarded-access-token AUTH_TOKEN_PREFIX=""
```

## CORS

CORS headers are disabled by default. Enable them via `ALLOWED_ORIGINS`:

```shell
# Allow a specific origin
make run ALLOWED_ORIGINS="http://localhost:9104"

# Allow all origins (not recommended for production)
make run ALLOWED_ORIGINS="*"
```

Alternatively, set the `ALLOWED_ORIGINS` environment variable or pass `--allowed-origins=<origins>` on the command line.

## TLS

To enable HTTPS, provide both `CERT_FILE` and `KEY_FILE`:

```shell
make run CERT_FILE=/path/to/tls.crt KEY_FILE=/path/to/tls.key
```

For local development against a cluster with self-signed certificates:

```shell
make run INSECURE_SKIP_VERIFY=true
```

> **Warning:** `INSECURE_SKIP_VERIFY=true` must never be used in production.

## Linting

```shell
cd packages/maas/bff && make lint
```

Uses `golangci-lint`. Install it locally with:

```shell
make golangci-lint
```

## Building and Deploying

Build the binary:

```shell
make build
```

The binary is written to `bin/`. You can also build container images from the package root:

```shell
# Federated (PatternFly) image
make docker-build-federated

# Standalone (MUI) image
make docker-build-standalone
```
