# Modular Architecture Starter BFF (Minimal)

Minimal backend-for-frontend providing only core endpoints required by the starter UI.

## Dependencies

- Go >= 1.26

## Scope

This service exposes the following endpoints:

- GET `/healthcheck` – liveness probe
- GET `/api/v1/user` – returns the authenticated (mock) user
- GET `/api/v1/namespaces` – list namespaces (available only when DEV_MODE=true or mock k8s enabled)
- GET `/api/v1/secrets` – list and filter Kubernetes secrets by type
- GET `/api/v1/s3/file` – retrieve a file from S3 storage
- GET `/api/v1/maas/models` – list all models from hosted MaaS using a selected Kubernetes Secret
- GET `/api/v1/pipeline-runs` – query AutoRAG pipeline runs from Kubeflow Pipelines
- GET `/api/v1/pipeline-runs/:runId` – get a single managed pipeline run (AutoRAG or indexing) with full task details
- POST `/api/v1/pipeline-runs` – create a new AutoRAG pipeline run
- POST `/api/v1/indexing-pipeline-runs` – create a documents indexing pipeline run
- GET `/api/v1/managed-pipelines` – list discovered managed pipelines (autorag, indexing)
- POST `/api/v1/managed-pipelines/enable` – enable managed pipelines on a DSPA
- POST `/api/v1/responses` – RAG query endpoint; streams an OpenAI Responses API SSE response using MaaS for embeddings and chat completion and a vector DB for retrieval

## Development

Run the following command to build the BFF:

```shell
make build
```

After building it, you can run our app with:

```shell
make run
```

For a fully mocked local BFF, including MaaS model discovery, run:

```shell
make run PORT=8000 DEV_MODE=true MOCK_K8S_CLIENT=true MOCK_MAAS_CLIENT=true MOCK_PIPELINE_SERVER_CLIENT=true MOCK_S3_CLIENT=true AUTH_METHOD=disabled
```

If you want to change the log level on deployment, add the LOG_LEVEL argument when running, supported levels are: ERROR, WARN, INFO, DEBUG. The default level is INFO.

```shell
# Run with debug logging
make run LOG_LEVEL=DEBUG
```

## Flags / Environment Variables

| Flag                            | Env Var                        | Description                                                                                                        |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `-port`                         | `PORT`                         | Listen port (default 4000)                                                                                         |
| `-deployment-mode`              | `DEPLOYMENT_MODE`              | `standalone` or `integrated` (default `standalone`)                                                                |
| `-dev-mode`                     | `DEV_MODE`                     | Enables relaxed behaviors (namespaces listing, etc.)                                                               |
| `-mock-k8s-client`              | `MOCK_K8S_CLIENT`              | Use in‑memory stub for namespace/user resolution                                                                   |
| `-mock-maas-client`             | `MOCK_MAAS_CLIENT`             | Use mock client for MaaS model discovery (avoids external MaaS calls)                                              |
| `-mock-pipeline-server-client`  | `MOCK_PIPELINE_SERVER_CLIENT`  | Use mock client for Kubeflow Pipelines API calls                                                                   |
| `-mock-s3-client`               | `MOCK_S3_CLIENT`               | Use mock client for S3 SDK calls                                                                                   |
| `-autorag-pipeline-name-prefix` | `AUTORAG_PIPELINE_NAME_PREFIX` | Prefix for identifying AutoRAG managed pipelines during discovery (default: `documents-rag-optimization-pipeline`) |
| `-static-assets-dir`            | `STATIC_ASSETS_DIR`            | Directory to serve single‑page frontend assets                                                                     |
| `-log-level`                    | `LOG_LEVEL`                    | ERROR, WARN, INFO, DEBUG (default INFO)                                                                            |
| `-allowed-origins`              | `ALLOWED_ORIGINS`              | Comma separated CORS origins                                                                                       |
| `-auth-method`                  | `AUTH_METHOD`                  | Authentication method: `disabled`, `internal`, or `user_token` (default: `user_token`)                             |
| `-auth-header`                  | `AUTH_HEADER`                  | Header to read bearer token from (default Authorization)                                                           |
| `-auth-prefix`                  | `AUTH_PREFIX`                  | Expected value prefix (default Bearer)                                                                             |
| `-cert-file`                    | `CERT_FILE`                    | TLS certificate path (enables TLS when paired with key)                                                            |
| `-key-file`                     | `KEY_FILE`                     | TLS key path                                                                                                       |
| `-insecure-skip-verify`         | `INSECURE_SKIP_VERIFY`         | Skip upstream TLS verify (dev only)                                                                                |

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
GET  /api/v1/maas/models             (requires namespace and secretName parameters)
GET  /api/v1/pipeline-runs          (requires namespace parameter)
GET  /api/v1/pipeline-runs/:runId   (requires namespace parameter)
POST /api/v1/pipeline-runs          (requires namespace parameter)
POST /api/v1/responses              (requires namespace, dbSecretName, maasSecretName query params)
```

### Authentication modes

Three modes are supported (flag `--auth-method` / env `AUTH_METHOD`):

- **`user_token` (default)**: extracts a bearer token from the configured header/prefix (default `Authorization: Bearer <token>`) and performs SelfSubjectAccessReview. This is the production mode and the default for `make run`.
- **`internal`**: impersonates the provided `kubeflow-userid` (and optional `kubeflow-groups`) headers using a cluster or local kubeconfig credential. Useful for local development when you don't have a bearer token readily available.
- **`disabled`**: skips all authentication and authorization checks. Automatically enabled when mock clients are used (`MOCK_K8S_CLIENT=true`). Useful for local testing. **Not recommended for production.**
- Mock MaaS model discovery is enabled with `MOCK_MAAS_CLIENT=true`; fully mocked Makefile targets set this automatically so fake MaaS credentials never reach an external service.

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
  -d '{"display_name":"test-run","test_data_secret_name":"s","test_data_bucket_name":"b","test_data_key":"k","input_data_secret_name":"s","input_data_bucket_name":"b","input_data_keys":["k"],"maas_secret_name":"maas","db_secret_name":"database"}'
```

### Responses endpoint (`POST /api/v1/responses`)

Executes a RAG query and streams the answer back as [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses) Server-Sent Events.

**Query parameters** (all required):

| Parameter | Description |
|---|---|
| `namespace` | Kubernetes namespace where the secrets live |
| `dbSecretName` | Name of the K8s secret with database credentials (auto-detected: Milvus or pgvector) |
| `maasSecretName` | Name of the K8s secret with MaaS credentials (`MAAS_BASE_URL`, `MAAS_API_KEY`) |

**Request body** — OpenAI Responses API format. The `ranking_options` shown below requests hybrid RRF, which is supported by the pgvector adapter only:

```json
{
  "model": "granite-3-3-8b-instruct",
  "input": [
    { "type": "message", "role": "system", "content": [{ "type": "input_text", "text": "You are helpful." }] },
    { "type": "message", "role": "user",   "content": [{ "type": "input_text", "text": "What is RAG?" }] }
  ],
  "tools": [
    {
      "type": "file_search",
      "vector_store_ids": ["my-collection.v1"],
      "max_num_results": 5,
      "ranking_options": { "ranker": "rrf", "alpha": 0.5 }
    }
  ],
  "metadata": {
    "embedding_model": "nomic-embed-text",
    "context_template_text": "Document {doc_number}:\n{document}",
    "user_message_text": "Context:\n{reference_documents}\n\nQuestion: {question}"
  },
  "stream": true,
  "max_output_tokens": 2048,
  "temperature": 0.7
}
```

**Key fields:**

- `input` — conversation history; the last `user` message is the question; an optional `system` message is injected into the chat prompt
- `tools[].vector_store_ids[0]` — logical vector DB collection name. IDs may contain only letters, numbers, `_`, `-`, and `.`; `-` and `.` are canonicalized to `_` before adapter lookup. Logical names that canonicalize to the same ID cannot coexist (for example, `my-store` and `my.store`).
- `tools[].ranking_options` — optional supported fields are `ranker: "rrf"` and `alpha` from 0 through 1. Omit the object for dense search; include it for pgvector hybrid RRF search. Milvus rejects hybrid requests because sparse hybrid retrieval is not implemented. `search_mode`, `ranker_strategy`, `ranker_k`, and other ranking fields are rejected rather than ignored.
- `metadata.embedding_model` — required; model used for query embedding
- `metadata.context_template_text` — optional; template for each retrieved chunk (`{document}`, `{doc_number}` placeholders)
- `metadata.user_message_text` — optional; wraps context + question (`{reference_documents}`, `{question}` placeholders)
- `stream` — when `true`, returns the answer as Responses API SSE events; when `false` or omitted, returns a single JSON response with the answer and retrieved sources
- `max_output_tokens` — nonnegative; zero uses the 2048-token default and values above 4096 are rejected with HTTP 400. Requests run for at most two minutes, and request input, retrieved context, and accumulated streamed output are bounded.
- Request safety limits — the raw body is capped at 10 MiB, strings at 1 MiB, input messages at 1,000, content parts at 1,000 per message and 2,000 cumulatively, tools at 100, vector store IDs at 100 per tool and 200 cumulatively, include items at 100, and metadata entries at 100. Input message, content, tool, ranking-options, and tool-choice objects are limited to the documented contract properties. MaaS response bodies are capped at 4 MiB before SDK parsing; embedding responses are limited to 16 vectors of at most 16,384 dimensions.

**SSE event sequence (streaming):**

```text
data: {"type":"response.created",       "sequence_number":0, "response":{...}}
data: {"type":"response.content_part.added",  "sequence_number":1, "response":{...}, "output_index":1, ...}
data: {"type":"response.output_text.delta",   "sequence_number":2, "response":{},    "output_index":1, "delta":"token..."}
... (one event per token)
data: {"type":"response.content_part.done",   "sequence_number":N, "response":{...}, "output_index":1, ...}
data: {"type":"response.completed",     "sequence_number":N+1, "response":{...}}
data: {"type":"response.metrics",       "sequence_number":N+2, "metrics":{"latency_ms":100,"time_to_first_token_ms":20,"usage":{"input_tokens":10,"output_tokens":5,"total_tokens":15}}}
data: [DONE]
```

The `response.completed` event includes a `file_search_call` output item with the retrieved source chunks and a `message` output item with the full answer text. The `response.metrics` event contains top-level `metrics` fields; it does not contain a `response` field. Each source result contains `text`, `score`, and `file_id` when the adapter returned an ID. On an unrelated streaming failure, the completion events are replaced by an `error` event with the safe message `The response could not be completed.`, followed by `data: [DONE]`. Milvus connection failures and operation timeouts use the same event shape with safe `code` values `vector_database_unavailable` or `vector_database_timeout` and corresponding safe messages. Non-streaming Milvus failures return HTTP 503 with the same safe error classification. No endpoint, credential, or raw network details are exposed:

```json
{"type":"file_search_call","results":[{"text":"retrieved chunk","score":0.9,"file_id":"document-1"}]}
```

```text
data: {"type":"error","sequence_number":N,"code":"vector_database_timeout","message":"The vector database request timed out."}
data: [DONE]
```

Vector database destinations are restricted to either an exact Kubernetes Service FQDN
(`service.namespace.svc.cluster.local`, where plaintext is allowed for the in-cluster adapter
contract) or a public DNS name using TLS. Userinfo, queries, fragments, unsafe paths, and literal
IP addresses are rejected. External DNS results are checked again at connection time and private,
loopback, link-local, multicast, unspecified, and metadata-style addresses are not dialed.

**Sample call (streaming):**

```shell
curl -N -X POST \
  "http://localhost:4000/api/v1/responses?namespace=my-namespace&dbSecretName=milvus-secret&maasSecretName=maas-secret" \
  -H "Authorization: Bearer $(oc whoami -t)" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "granite-3-3-8b-instruct",
    "input": [{"type":"message","role":"user","content":[{"type":"input_text","text":"What is RAG?"}]}],
    "tools": [{"type":"file_search","vector_store_ids":["my-collection"],"max_num_results":5}],
    "metadata": {"embedding_model": "nomic-embed-text"},
    "stream": true
  }'
```

**MaaS secret format:**

```yaml
kind: Secret
apiVersion: v1
metadata:
  name: my-maas-secret
  namespace: <your-namespace>
type: Opaque
data:
  MAAS_BASE_URL: <base64-encoded URL>
  MAAS_API_KEY:  <base64-encoded API key>
```

For detailed API documentation, see:

- [Secrets API](docs/secrets-endpoint.md)
- [Pipeline Runs API](../docs/pipeline-runs-api.md)

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

Cross-namespace Kubernetes Service references are intentionally supported in both DevMode and production, subject to readable Secret endpoint configuration, Kubernetes/service authorization, network policy, and service reachability. For example, a database Secret selected in the request namespace may refer to `milvus.milvus.svc.cluster.local` for a request in `dduong-36-ga`.

This means you can simply start the BFF in dev mode and it will handle all service connectivity transparently using your current kubeconfig context.

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

This starts both the BFF (port 4001) and the frontend dev server (port 9107) in federated mode. The BFF connects to in-cluster services using dynamic port-forwarding and uses your cluster credentials for RBAC.

**Pipeline name prefix:** The BFF discovers AutoRAG pipelines by matching display names that start with a configurable prefix. The default is `documents-rag-optimization-pipeline`. If your pipelines use a different naming convention, override it:

```shell
AUTORAG_PIPELINE_NAME_PREFIX=my-custom-prefix make dev-start-federated
```

#### 2. Start the main ODH Dashboard

In a separate terminal, from the repo root:

```shell
pnpm run dev
```

Then access the dashboard at **http://localhost:4010** and navigate to the AutoRAG section.

#### Mock mode (no cluster required)

If you don't have a cluster available, you can run with fully mocked backends:

```shell
make dev-start-federated-mock
```
