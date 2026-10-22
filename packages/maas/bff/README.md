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
make run MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true DEV_MODE=true
```

Run on a custom port with debug logging:

```shell
make run PORT=8000 MOCK_K8S_CLIENT=true MOCK_HTTP_CLIENT=true LOG_LEVEL=DEBUG
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

| Flag                    | Env Var                | Description                                               | Default         |
| ----------------------- | ---------------------- | --------------------------------------------------------- | --------------- |
| `-port`                 | `PORT`                 | Listen port                                               | `4000`          |
| `-deployment-mode`      | `DEPLOYMENT_MODE`      | `standalone`, `kubeflow`, or `federated`                  | `standalone`    |
| `-dev-mode`             | `DEV_MODE`             | Enables relaxed behaviors (e.g. namespace listing)        | `false`         |
| `-mock-k8s-client`      | `MOCK_K8S_CLIENT`      | Use in-memory stub for Kubernetes                         | `false`         |
| `-mock-http-client`     | `MOCK_HTTP_CLIENT`     | Use in-memory stub for MaaS API                           | `false`         |
| `-static-assets-dir`    | `STATIC_ASSETS_DIR`    | Directory to serve SPA frontend assets                    | _(none)_        |
| `-log-level`            | `LOG_LEVEL`            | `ERROR`, `WARN`, `INFO`, `DEBUG`                          | `INFO`          |
| `-allowed-origins`      | `ALLOWED_ORIGINS`      | Comma-separated CORS origins                              | _(none)_        |
| `-auth-method`          | `AUTH_METHOD`          | `internal`, `user_token`, or `disabled`                   | `internal`      |
| `-auth-header`          | `AUTH_HEADER`          | Header to read the bearer token from                      | `Authorization` |
| `-auth-prefix`          | `AUTH_PREFIX`          | Expected token prefix                                     | `Bearer`        |
| `-cert-file`            | `CERT_FILE`            | TLS certificate path (enables HTTPS when paired with key) | _(none)_        |
| `-key-file`             | `KEY_FILE`             | TLS key path                                              | _(none)_        |
| `-insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | Skip upstream TLS verification (**dev only**)             | `false`         |

## Endpoints

The BFF exposes the following API groups under `/api/v1/`:

| Group           | Sample paths                                                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health          | `GET /healthcheck`                                                                                                                                                                        |
| User / identity | `GET /api/v1/user`, `GET /api/v1/me`                                                                                                                                                      |
| Namespaces      | `GET /api/v1/namespaces` (dev / mock mode only)                                                                                                                                           |
| Models          | `GET /api/v1/models`                                                                                                                                                                      |
| Gateway         | `GET /api/v1/gateway-url`                                                                                                                                                                 |
| API keys        | `POST /api/v1/api-keys`, `GET /api/v1/api-keys`, `DELETE /api/v1/api-keys/:id`                                                                                                            |
| Subscriptions   | `GET /api/v1/all-subscriptions`, `GET /api/v1/subscription-info/:name`, `POST /api/v1/subscription-info`, `PUT /api/v1/subscription-info/:name`, `DELETE /api/v1/subscription-info/:name` |
| Auth policies   | `GET /api/v1/auth-policies`, `GET /api/v1/auth-policies/:name`                                                                                                                            |

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

- **`internal`** (default): Impersonates the user identified in the `kubeflow-userid` (and optional `kubeflow-groups`) headers using cluster or local kubeconfig credentials. Used for standalone and kubeflow modes.
- **`user_token`**: Extracts a bearer token from the configured header/prefix and performs a `SelfSubjectAccessReview`. Used for federated/RHOAI mode.
- **`disabled`**: No authentication. For testing only.

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

<<<<<<< HEAD

## Endpoints

Only three JSON endpoints are available plus static asset serving (index.html fallback):

```text
GET /healthcheck
GET /api/v1/user
GET /api/v1/whoami
GET /api/v1/namespaces   (dev / mock mode only)
```

### Sample local calls

When running with the mocked Kubernetes client (MOCK_K8S_CLIENT=true), the user `user@example.com` has RBAC allowing all three endpoints.

```shell
curl -i localhost:4000/healthcheck
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/user
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/namespaces   # (dev / mock only)
```

<!-- Minimal scope: all former Mod Arch examples removed -->

### Authentication modes

Two modes are supported (flag `--auth-method` / env `AUTH_METHOD`):

- internal (default): impersonates the provided `kubeflow-userid` (and optional `kubeflow-groups`) headers using a cluster or local kubeconfig credential.
- user_token: extracts a bearer token from the configured header/prefix (default `Authorization: Bearer <token>`) and performs SelfSubjectAccessReview.

### Overriding token header / prefix

By default, the BFF expects the token to be passed in the standard Authorization header with a Bearer prefix:

```shell
Authorization: Bearer <your-token>
```

If you're integrating with a proxy or tool that uses a custom header (e.g., X-Forwarded-Access-Token without a prefix), you can override this behavior using environment variables or Makefile arguments.

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

> # **Warning:** Only use in development. Keep TLS verification enabled in production.
>
> > > > > > > 0f6cba65a (Refresh maas docs)
