# Modular Architecture Starter BFF (Minimal)

Minimal backend-for-frontend providing only core endpoints required by the starter UI.

## Dependencies

- Go >= 1.26

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
| `-auth-method` | `AUTH_METHOD` | `internal` (mock) or `user_token` |
| `-auth-header` | `AUTH_HEADER` | Header to read bearer token from (default Authorization) |
| `-auth-prefix` | `AUTH_PREFIX` | Expected value prefix (default Bearer) |
| `-cert-file` | `CERT_FILE` | TLS certificate path (enables TLS when paired with key) |
| `-key-file` | `KEY_FILE` | TLS key path |
| `-insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | Skip upstream TLS verify (dev only) |

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

## Inter-BFF Communication (Eval-Hub → Model-Catalog)

> **General Documentation**: For architecture overview, implementation patterns, and how to add inter-BFF to other modules, see [Inter-BFF Communication Guide](../../../docs/inter-bff-communication.md).

The Eval-Hub BFF calls the Model-Catalog BFF (in the model-registry package) to fetch security artifacts for models.

### Quick Start

**Run with Model-Catalog BFF locally (dedicated inter-BFF target):**

```bash
# Terminal 1: Start Model-Registry (includes model-catalog BFF on port 4000)
cd packages/model-registry/upstream && make dev-start

# Terminal 2: Start Eval-Hub BFF with inter-BFF communication to Model-Catalog
cd packages/eval-hub && make dev-bff-inter-bff
```

**Run with mock BFF clients (no model-registry needed):**

```bash
cd packages/eval-hub && MOCK_BFF_CLIENTS=true make dev-start
```

### Eval-Hub Inter-BFF Environment Variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `MOCK_BFF_CLIENTS` | Enable mock BFF clients | `false` |
| `BFF_MODEL_CATALOG_DEV_URL` | Dev override URL (e.g., `http://localhost:4000/api/v1`) | - |
| `BFF_MODEL_CATALOG_SERVICE_NAME` | K8s service name | `odh-dashboard` |
| `BFF_MODEL_CATALOG_SERVICE_PORT` | Model-Catalog BFF port | `8043` |
| `BFF_MODEL_CATALOG_TLS_ENABLED` | Enable HTTPS | `false` (local) / `true` (prod) |
| `BFF_MODEL_CATALOG_AUTH_METHOD` | Auth method | `user_token` |
| `BFF_MODEL_CATALOG_AUTH_TOKEN_HEADER` | Token header | `x-forwarded-access-token` |
| `BFF_MODEL_CATALOG_AUTH_TOKEN_PREFIX` | Token prefix | `` (empty) |

### Inter-BFF Endpoints

**Fetch security artifacts for a model:**

```bash
# Mock mode (namespace=kubeflow — used by mock K8s client)
curl -s -H "kubeflow-userid: test@example.com" \
  "http://localhost:4002/api/v1/catalog/sources/sample-source/security_artifacts/granite-8b?namespace=kubeflow" \
  | python3 -m json.tool
```

> **Note:** The `namespace` parameter tells the model-catalog BFF which namespace to use for AI Hub service discovery. In mock mode this is `kubeflow`; in production it is typically `rhoai-model-registries` (wherever the ModelRegistry CR is deployed).

### Implementation Files

| File | Purpose |
| ---- | ------- |
| `internal/integrations/bffclient/` | Reusable BFF client package (client, factory, config, errors, middleware) |
| `internal/integrations/bffclient/bffmocks/` | Mock BFF client for local development |
| `internal/api/catalog_security_artifacts_handler.go` | Security artifacts endpoint handler |
| `internal/models/catalog_security_artifacts.go` | DTOs for security artifact responses |

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
