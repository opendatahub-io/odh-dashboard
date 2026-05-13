# Modular Architecture Starter BFF (Minimal)

Minimal backend-for-frontend providing only core endpoints required by the starter UI.

## Dependencies

- Go >= 1.24.3

## Scope

This service exposes the following endpoints:

- GET `/healthcheck` – liveness probe
- GET `/api/v1/user` – returns the authenticated (mock) user
- GET `/api/v1/namespaces` – list namespaces (available only when DEV_MODE=true or mock k8s enabled)
- GET `/api/v1/secrets` – list and filter Kubernetes secrets by type
- GET `/api/v1/s3/file` – retrieve a file from S3 storage
- GET `/api/v1/lsd/models` – list available models from LlamaStack Distribution
- GET `/api/v1/lsd/vector-stores` – list available vector stores from LlamaStack Distribution
- GET `/api/v1/pipeline-runs` – query pipeline runs from Kubeflow Pipelines
- GET `/api/v1/pipeline-runs/:runId` – get a single pipeline run with full task details
- POST `/api/v1/pipeline-runs` – create a new AutoRAG pipeline run

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

| Flag | Env Var | Description                                                                            |
|------|---------|----------------------------------------------------------------------------------------|
| `-port` | `PORT` | Listen port (default 4000)                                                             |
| `-deployment-mode` | `DEPLOYMENT_MODE` | `standalone` or `integrated` (default `standalone`)                                    |
| `-dev-mode` | `DEV_MODE` | Enables relaxed behaviors (namespaces listing, etc.)                                   |
| `-mock-k8s-client` | `MOCK_K8S_CLIENT` | Use in‑memory stub for namespace/user resolution                                       |
| `-mock-pipeline-server-client` | `MOCK_PIPELINE_SERVER_CLIENT` | Use mock client for Kubeflow Pipelines API calls                                       |
| `-mock-s3-client` | `MOCK_S3_CLIENT` | Use mock client for S3 SDK calls                                                       |
| `-autorag-pipeline-name-prefix` | `AUTORAG_PIPELINE_NAME_PREFIX` | Prefix for identifying AutoRAG managed pipelines during discovery (default: `documents-rag-optimization-pipeline`) |
| `-static-assets-dir` | `STATIC_ASSETS_DIR` | Directory to serve single‑page frontend assets                                         |
| `-log-level` | `LOG_LEVEL` | ERROR, WARN, INFO, DEBUG (default INFO)                                                |
| `-allowed-origins` | `ALLOWED_ORIGINS` | Comma separated CORS origins                                                           |
| `-auth-method` | `AUTH_METHOD` | Authentication method: `disabled`, `internal`, or `user_token` (default: `user_token`) |
| `-auth-header` | `AUTH_HEADER` | Header to read bearer token from (default Authorization)                               |
| `-auth-prefix` | `AUTH_PREFIX` | Expected value prefix (default Bearer)                                                 |
| `-cert-file` | `CERT_FILE` | TLS certificate path (enables TLS when paired with key)                                |
| `-key-file` | `KEY_FILE` | TLS key path                                                                           |
| `-insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | Skip upstream TLS verify (dev only)                                                    |

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
GET /healthcheck
GET /api/v1/user
GET /api/v1/namespaces             (dev / mock mode only)
GET  /api/v1/secrets                 (requires namespace parameter)
GET  /api/v1/s3/file                 (requires namespace, secretName, and key parameters)
GET  /api/v1/lsd/models              (requires namespace and secretName parameters)
GET  /api/v1/lsd/vector-stores       (requires namespace and secretName parameters)
GET  /api/v1/pipeline-runs          (requires namespace parameter)
GET  /api/v1/pipeline-runs/:runId   (requires namespace parameter)
POST /api/v1/pipeline-runs          (requires namespace parameter)
```

### Authentication modes

Three modes are supported (flag `--auth-method` / env `AUTH_METHOD`):

- **`user_token` (default)**: extracts a bearer token from the configured header/prefix (default `Authorization: Bearer <token>`) and performs SelfSubjectAccessReview. This is the production mode and the default for `make run`.
- **`internal`**: impersonates the provided `kubeflow-userid` (and optional `kubeflow-groups`) headers using a cluster or local kubeconfig credential. Useful for local development when you don't have a bearer token readily available.
- **`disabled`**: skips all authentication and authorization checks. Automatically enabled when mock clients are used (`MOCK_K8S_CLIENT=true` or `MOCK_LS_CLIENT=true`). Useful for local testing. **Not recommended for production.**

### Sample local calls

When running with the mocked Kubernetes client (MOCK_K8S_CLIENT=true), the user `user@example.com` has RBAC allowing all endpoints.


```shell
curl -i localhost:4000/healthcheck
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/user
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/namespaces   # (dev / mock only)
curl -i -H "kubeflow-userid: user@example.com" "localhost:4000/api/v1/pipeline-runs?namespace=test-namespace"
curl -i -H "kubeflow-userid: user@example.com" "localhost:4000/api/v1/pipeline-runs/run-abc123-def456?namespace=test-namespace"

# Create a pipeline run
curl -i -X POST -H "kubeflow-userid: user@example.com" -H "Content-Type: application/json" \
  "localhost:4000/api/v1/pipeline-runs?namespace=test-namespace" \
  -d '{"display_name":"test-run","test_data_secret_name":"s","test_data_bucket_name":"b","test_data_key":"k","input_data_secret_name":"s","input_data_bucket_name":"b","input_data_key":"k","llama_stack_secret_name":"s"}'
```

For detailed API documentation, see:
- [Secrets API](docs/secrets-endpoint.md)
- [Pipeline Runs API](../docs/pipeline-runs-api.md)
- [LSD Models API](docs/lsd-models-endpoint.md)
- [LSD Vector Stores API](docs/lsd-vector-stores-endpoint.md)

<!-- Minimal scope: all former Mod Arch examples removed -->

### Authentication modes

Three modes are supported (flag `--auth-method` / env `AUTH_METHOD`):

- user_token (default): extracts a bearer token from the configured header/prefix (default `Authorization: Bearer <token>`) and performs SelfSubjectAccessReview.
- internal: impersonates the provided `kubeflow-userid` (and optional `kubeflow-groups`) headers using a cluster or local kubeconfig credential.
- disabled: no authentication (for development/testing only).

### Overriding token header / prefix

By default, the BFF expects the token to be passed in the standard Authorization header with a Bearer prefix:

```shell
Authorization: Bearer <your-token>
```

If you're integrating with a proxy or tool that uses a custom header (e.g., X-Forwarded-Access-Token without a prefix), you can override this behavior using environment variables or Makefile arguments.

```shell
make run AUTH_METHOD=user_token AUTH_TOKEN_HEADER=X-Forwarded-Access-Token AUTH_TOKEN_PREFIX=""
```

### Service connectivity in dev mode

When running in dev mode (via `make dev-start-federated`), the BFF uses **dynamic port-forwarding** to automatically establish connections to in-cluster services such as the Kubeflow Pipelines server and managed MinIO. This eliminates the need for manual `kubectl port-forward` commands or environment variable overrides like `PIPELINE_SERVER_URL`.

Under the covers, the BFF discovers the DSPipelineApplication (DSPA) in the target namespace, identifies the pipeline server and any managed MinIO services, and sets up local port-forwards on-demand. The forwarded connections are managed for the lifetime of the BFF process and cleaned up automatically on shutdown.

This means you can simply start the BFF in dev mode and it will handle all service connectivity transparently using your current kubeconfig context.

### Setting up a LlamaStack secret

The AutoRAG BFF requires a Kubernetes secret with LlamaStack credentials to access models and vector stores. The secret must contain the LlamaStack server URL and an API key (OAuth2 token from Keycloak).

#### Secret format

```yaml
kind: Secret
apiVersion: v1
metadata:
  name: my-lls-secret
  namespace: <your-namespace>
type: Opaque
data:
  llama_stack_client_base_url: <base64-encoded URL>
  llama_stack_client_api_key: <base64-encoded token>
```

The secret keys `llama_stack_client_base_url` and `llama_stack_client_api_key` are required (exact match, case-sensitive). The BFF reads these to create the LlamaStack client.

#### Generating the API key

The LlamaStack server uses Keycloak for authentication. To obtain an OAuth2 access token:

```shell
# 1. Retrieve Keycloak client credentials from the cluster
CLIENT_ID=$(oc get secret llama-stack-client-secret -n keycloak -o jsonpath='{.data.client-id}' | base64 -d)
CLIENT_SECRET=$(oc get secret llama-stack-client-secret -n keycloak -o jsonpath='{.data.client-secret}' | base64 -d)

# 2. Request a token via the Keycloak token endpoint (from inside the cluster)
TOKEN=$(oc exec -n llama-stack $(oc get pods -n llama-stack -l app=llama-stack -o jsonpath='{.items[0].metadata.name}') -- \
  curl -s -X POST 'http://keycloak-service.keycloak.svc.cluster.local:8080/realms/llamastack/protocol/openid-connect/token' \
  -d "client_id=${CLIENT_ID}&grant_type=client_credentials&client_secret=${CLIENT_SECRET}" | jq -r '.access_token')

# 3. Verify the token works
curl -s -H "Authorization: Bearer ${TOKEN}" \
  'https://<llamastack-route>/v1/vector_stores' | jq
```

#### Creating the secret

Once you have the token and know your LlamaStack server URL, create the secret:

```shell
oc create secret generic my-lls-secret \
  --namespace=<your-namespace> \
  --from-literal=llama_stack_client_base_url=https://<llamastack-route> \
  --from-literal=llama_stack_client_api_key=${TOKEN}
```

**Note:** OAuth2 tokens expire. You will need to regenerate the token and update the secret when it expires. To update an existing secret:

```shell
oc create secret generic my-lls-secret \
  --namespace=<your-namespace> \
  --from-literal=llama_stack_client_base_url=https://<llamastack-route> \
  --from-literal=llama_stack_client_api_key=${TOKEN} \
  --dry-run=client -o yaml | oc apply -f -
```

#### Using the secret with the BFF

The secret name is passed as a query parameter to the LlamaStack endpoints:

```shell
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/lsd/models?namespace=<your-namespace>&secretName=my-lls-secret'
```

For more details on the LlamaStack endpoints, see:
- [LSD Models API](docs/lsd-models-endpoint.md)
- [LSD Vector Stores API](docs/lsd-vector-stores-endpoint.md)

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

### Federated development with a live cluster

To run the AutoRAG module as a federated micro-frontend against the main ODH Dashboard with a real cluster, you need two things running:

1. The AutoRAG BFF + frontend in federated mode
2. The main ODH Dashboard

The BFF automatically handles service connectivity (pipeline server, MinIO, etc.) via dynamic port-forwarding when running in dev mode. No manual port-forward setup is required. See [Service connectivity in dev mode](#service-connectivity-in-dev-mode) for details.

#### 1. Start AutoRAG in federated mode

From the `packages/autorag/` directory:

```shell
make dev-start-federated
```

This starts both the BFF (port 4001) and the frontend webpack dev server (port 9107) in federated mode. The BFF connects to in-cluster services using dynamic port-forwarding and uses your cluster credentials for RBAC.

**Pipeline name prefix:** The BFF discovers AutoRAG pipelines by matching display names that start with a configurable prefix. The default is `documents-rag-optimization-pipeline`. If your pipelines use a different naming convention, override it:

```shell
AUTORAG_PIPELINE_NAME_PREFIX=my-custom-prefix make dev-start-federated
```

#### 2. Start the main ODH Dashboard

In a separate terminal, from the repo root:

```shell
npm run dev
```

Then access the dashboard at **http://localhost:4010** and navigate to the AutoRAG section.

#### Mock mode (no cluster required)

If you don't have a cluster available, you can run with fully mocked backends:

```shell
make dev-start-federated-mock
```
