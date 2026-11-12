# Modular Architecture Starter BFF (Minimal)

Minimal backend-for-frontend providing only core endpoints required by the starter UI.

## Dependencies

- Go >= 1.24.3

## Scope

This trimmed service exposes ONLY:

- GET `/healthcheck` – liveness probe
- GET `/api/v1/user` – returns the authenticated (mock) user
- GET `/api/v1/namespaces` – list namespaces (available only when DEV_MODE=true or mock k8s enabled)

All former Mod Arch–related endpoints, validation, mocks and OpenAPI dependencies were removed.

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

Only three JSON endpoints are available plus static asset serving (index.html fallback):

```text
GET /healthcheck
GET /api/v1/user
GET /api/v1/namespaces   (dev / mock mode only)
```

### Sample local calls

When running with the mocked Kubernetes client (MOCK_K8S_CLIENT=true), the user `user@example.com` has RBAC allowing all three endpoints.

```shell
curl -i localhost:4000/healthcheck
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/user
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/namespaces   # (dev / mock only)
```

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
