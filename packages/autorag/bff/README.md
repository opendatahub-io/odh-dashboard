# Modular Architecture Starter BFF (Minimal)

Minimal backend-for-frontend providing only core endpoints required by the starter UI.

## Dependencies

- Go >= 1.24.3

## Scope

This service exposes the following endpoints:

- GET `/healthcheck` – liveness probe
- GET `/api/v1/user` – returns the authenticated (mock) user
- GET `/api/v1/namespaces` – list namespaces (available only when DEV_MODE=true or mock k8s enabled)
- GET `/api/v1/pipeline-servers` – list available Pipeline Servers (DSPipelineApplications) in a namespace
- GET `/api/v1/pipeline-runs` – query pipeline runs from a specific Pipeline Server

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
| `-mock-k8s-client` | `MOCK_K8S_CLIENT` | Use in‑memory stub for namespace/user resolution and Pipeline Servers |
| `-mock-pipeline-server-client` | `MOCK_PIPELINE_SERVER_CLIENT` | Use mock client for Pipeline Server API calls |
| `-pipeline-server-url` | `PIPELINE_SERVER_URL` | Override Pipeline Server URL for local testing (e.g., `http://localhost:8888`) |
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
GET /healthcheck
GET /api/v1/user
GET /api/v1/namespaces        (dev / mock mode only)
GET /api/v1/pipeline-servers  (requires namespace parameter)
GET /api/v1/pipeline-runs     (requires namespace and pipelineServerId parameters)
```

### Sample local calls

When running with the mocked Kubernetes client (MOCK_K8S_CLIENT=true), the user `user@example.com` has RBAC allowing all endpoints.

```shell
curl -i localhost:4000/healthcheck
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/user
curl -i -H "kubeflow-userid: user@example.com" localhost:4000/api/v1/namespaces   # (dev / mock only)
curl -i -H "kubeflow-userid: user@example.com" "localhost:4000/api/v1/pipeline-servers?namespace=test-namespace"
curl -i -H "kubeflow-userid: user@example.com" "localhost:4000/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa"
```

For detailed API documentation, see:
- [Pipeline Servers API](../docs/pipeline-servers-api.md)
- [Pipeline Runs API](../docs/pipeline-runs-api.md)

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

### Local testing with port-forward

When testing the BFF locally against a Pipeline Server running in a cluster, you can use port-forwarding to access the Pipeline Server:

**Terminal 1: Set up port-forward**
```shell
kubectl port-forward -n <namespace> svc/ds-pipeline-<pipeline-server-id> 8888:8443
```

**Terminal 2: Run BFF with override URL and skip TLS verification**
```shell
cd packages/autorag/bff
make run PIPELINE_SERVER_URL=https://localhost:8888 INSECURE_SKIP_VERIFY=true
```

**Terminal 3: Test the endpoints**
```shell
# List pipeline servers
curl -H "kubeflow-userid: user@example.com" \
  -H "Authorization: Bearer $(oc whoami -t)" \
  "http://localhost:4000/api/v1/pipeline-servers?namespace=<namespace>" | jq

# List pipeline runs
curl -H "kubeflow-userid: user@example.com" \
  -H "Authorization: Bearer $(oc whoami -t)" \
  "http://localhost:4000/api/v1/pipeline-runs?namespace=<namespace>&pipelineServerId=<pipeline-server-id>" | jq
```

**Note:** The `INSECURE_SKIP_VERIFY=true` flag is required when using port-forward because the Pipeline Server uses a self-signed certificate. This should only be used for local development and testing, never in production.

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
