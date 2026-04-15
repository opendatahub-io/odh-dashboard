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

### Local testing with port-forward

When testing the BFF locally against a Kubeflow Pipelines instance running in a cluster, set `PIPELINE_SERVER_URL` to the port-forwarded address:

```shell
# Terminal 1: port-forward the pipeline server
kubectl port-forward -n <namespace> svc/<ds-pipeline-service-name> 8888:8443

# Terminal 2: run the BFF with override URL
cd packages/automl/bff
make run PIPELINE_SERVER_URL=https://localhost:8888 INSECURE_SKIP_VERIFY=true
```

#### S3 endpoints in port-forward mode

When `PIPELINE_SERVER_URL` is set, the pipeline client is created from the override URL rather than by discovering the DSPipelineApplication (DSPA) in the cluster. However, the BFF will still **attempt best-effort DSPA discovery** via the Kubernetes API so that the S3 file and schema endpoints (`GET /api/v1/s3/file`, `GET /api/v1/s3/file/schema`) can resolve credentials from the DSPA spec without requiring an explicit `secretName` query parameter.

If you see the error `"query parameter 'secretName' is required when no DSPA object storage config is available"` while using port-forward mode, one of the following is likely true:

- Your auth token does not have permission to list `datasciencepipelinesapplications` resources in the namespace — verify with `kubectl auth can-i list datasciencepipelinesapplications -n <namespace>`
- No DSPA exists in the namespace yet
- The DSPA exists but its API Server component is not ready

As a workaround you can pass `secretName` explicitly:
```shell
curl -H "kubeflow-userid: user@example.com" \
  -H "Authorization: Bearer $(oc whoami -t)" \
  "http://localhost:4003/api/v1/s3/file?namespace=<namespace>&secretName=<secret>&bucket=<bucket>&key=<key>"
```

### Federated development with a live cluster

To run the AutoML module as a federated micro-frontend against the main ODH Dashboard with a real pipeline server, you need three things running:

1. A port-forward to the KFP pipeline server in your cluster
2. The AutoML BFF + frontend in federated mode
3. The main ODH Dashboard

#### 1. Port-forward the pipeline server

```shell
# Find your pipeline server service
oc get svc -n <namespace> | grep ds-pipeline

# Port-forward (8443 is the kube-rbac-proxy HTTPS port)
oc port-forward -n <namespace> svc/ds-pipeline-dspa 8443:8443
```

#### 2. Start AutoML in federated mode with the pipeline server URL

From the `packages/automl/` directory:

```shell
PIPELINE_SERVER_URL=https://localhost:8443 make dev-start-federated
```

This starts both the BFF (port 4003) and the frontend webpack dev server (port 9108) in federated mode. The BFF connects to your port-forwarded pipeline server and uses your cluster credentials for RBAC.

**Pipeline name prefixes:** The BFF discovers AutoML pipelines by matching display names that start with configurable prefixes. AutoML has two pipeline types with separate prefixes:

| Pipeline type | Env var | Default |
|---|---|---|
| Tabular (classification + regression) | `AUTOML_TABULAR_PIPELINE_NAME_PREFIX` | `autogluon-tabular-training-pipeline` |
| Time series | `AUTOML_TIMESERIES_PIPELINE_NAME_PREFIX` | `autogluon-timeseries-training-pipeline` |

If your pipelines use different naming conventions, override them:

```shell
PIPELINE_SERVER_URL=https://localhost:8443 \
  AUTOML_TABULAR_PIPELINE_NAME_PREFIX=my-tabular \
  AUTOML_TIMESERIES_PIPELINE_NAME_PREFIX=my-timeseries \
  make dev-start-federated
```

#### 3. Start the main ODH Dashboard

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
