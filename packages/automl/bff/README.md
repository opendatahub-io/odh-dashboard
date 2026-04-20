# Modular Architecture Starter BFF (Minimal)

Minimal backend-for-frontend providing only core endpoints required by the starter UI.

## Dependencies

- Go >= 1.24.3

## Scope

This service exposes the following endpoints:

- GET `/healthcheck` – liveness probe
- GET `/api/v1/user` – returns the authenticated (mock) user
- GET `/api/v1/namespaces` – list namespaces (available only when DEV_MODE=true or mock k8s enabled)
- GET `/api/v1/secrets` – list and filter secrets from a namespace (supports filtering by storage type)
- GET `/api/v1/pipeline-runs` – query merged pipeline runs from all auto-discovered AutoML pipelines
- GET `/api/v1/pipeline-runs/:runId` – get a single pipeline run with full task details
- POST `/api/v1/pipeline-runs` – create a new AutoML pipeline run
- GET `/api/v1/model-registries` – list Model Registry instances (Kubernetes CRs) with `id` and `server_url` for routing
- POST `/api/v1/model-registries/:registryId/models` – register a model binary in a specific Model Registry instance

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

The following JSON endpoints are available plus static asset serving (index.html fallback):

```text
GET  /healthcheck
GET  /api/v1/user
GET  /api/v1/namespaces          (dev / mock mode only)
GET  /api/v1/secrets             (filter secrets by type, e.g., ?namespace=default&type=storage)
GET  /api/v1/pipeline-runs       (query merged runs from all auto-discovered AutoML pipelines)
GET  /api/v1/pipeline-runs/:runId
POST /api/v1/pipeline-runs       (create a new AutoML pipeline run)
GET  /api/v1/model-registries    (list Model Registry instances: id, server_url, readiness)
POST /api/v1/model-registries/:registryId/models  (register model in a specific registry)
```

For Model Registry integration details (configuration, authentication, S3), see [docs/model-registry-integration.md](docs/model-registry-integration.md).

For detailed information about the secrets endpoint, see [docs/secrets-endpoint.md](docs/secrets-endpoint.md).

### Sample local calls

When running with the mocked Kubernetes client (MOCK_K8S_CLIENT=true), the user `user@example.com` has RBAC allowing all endpoints.

```shell
curl -i localhost:4000/healthcheck
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/user
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/namespaces   # (dev / mock only)
curl -i -H "kubeflow-userid: user@example.com" "localhost:4000/api/v1/secrets?resource=default"
curl -i -H "kubeflow-userid: user@example.com" "localhost:4000/api/v1/secrets?resource=default&type=storage"
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
    value: "true"
```

**Local development:**

```shell
./bin/bff --insecure-skip-verify
# or
export INSECURE_SKIP_VERIFY=true
```

> **Warning:** Only use in development. Keep TLS verification enabled in production.

### Service connectivity in dev mode

When running in dev mode (via `make dev-start-federated`), the BFF uses **dynamic port-forwarding** to automatically establish connections to in-cluster services such as the Kubeflow Pipelines server and managed MinIO. This eliminates the need for manual `kubectl port-forward` commands or environment variable overrides like `PIPELINE_SERVER_URL`.

Under the covers, the BFF discovers the DSPipelineApplication (DSPA) in the target namespace, identifies the pipeline server and any managed MinIO services, and sets up local port-forwards on-demand. The forwarded connections are managed for the lifetime of the BFF process and cleaned up automatically on shutdown.

This means you can simply start the BFF in dev mode and it will handle all service connectivity transparently using your current kubeconfig context.

### Federated development with a live cluster

To run the AutoML module as a federated micro-frontend against the main ODH Dashboard with a real cluster, you need two things running:

1. The AutoML BFF + frontend in federated mode
2. The main ODH Dashboard

The BFF automatically handles service connectivity (pipeline server, MinIO, etc.) via dynamic port-forwarding when running in dev mode. No manual port-forward setup is required. See [Service connectivity in dev mode](#service-connectivity-in-dev-mode) for details.

#### 1. Start AutoML in federated mode

From the `packages/automl/` directory:

```shell
make dev-start-federated
```

This starts both the BFF (port 4003) and the frontend webpack dev server (port 9108) in federated mode. The BFF connects to in-cluster services using dynamic port-forwarding and uses your cluster credentials for RBAC.

**Pipeline name prefixes:** The BFF discovers AutoML pipelines by matching display names that start with configurable prefixes. AutoML has two pipeline types with separate prefixes:

| Pipeline type | Env var | Default |
|---|---|---|
| Tabular (classification + regression) | `AUTOML_TABULAR_PIPELINE_NAME_PREFIX` | `autogluon-tabular-training-pipeline` |
| Time series | `AUTOML_TIMESERIES_PIPELINE_NAME_PREFIX` | `autogluon-timeseries-training-pipeline` |

If your pipelines use different naming conventions, override them:

```shell
AUTOML_TABULAR_PIPELINE_NAME_PREFIX=my-tabular \
  AUTOML_TIMESERIES_PIPELINE_NAME_PREFIX=my-timeseries \
  make dev-start-federated
```

#### 2. Start the main ODH Dashboard

In a separate terminal, from the repo root:

```shell
npm run dev
```

Then access the dashboard at **http://localhost:4010** and navigate to the AutoML section.

#### Mock mode (no cluster required)

If you don't have a cluster available, you can run with fully mocked backends:

```shell
make dev-start
```
