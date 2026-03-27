# LSD Vector Stores Endpoint Documentation

## Overview

This document describes the GET endpoint for retrieving available vector stores from a LlamaStack server using credentials stored in a Kubernetes secret.

## Endpoint

**GET** `/api/v1/lsd/vector-stores`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | **Yes** | Kubernetes namespace containing the LlamaStack credentials secret |
| `secretName` | string | **Yes** | Name of the Kubernetes secret containing LlamaStack credentials. Must be a valid DNS-1123 label. |

## Functionality

The endpoint:
1. Validates `namespace` and `secretName` query parameters
2. Reads the specified Kubernetes secret from the namespace
3. Extracts `llama_stack_client_base_url` and `llama_stack_client_api_key` from the secret (exact key match, case-sensitive)
4. Creates a LlamaStack client using those credentials
5. Calls the LlamaStack server to list available vector stores via the OpenAI-compatible `GET /v1/vector_stores` endpoint
6. Extracts `provider_id` from each vector store's `metadata` field (LlamaStack stores provider info in OpenAI metadata)
7. Returns the vector stores wrapped in a data envelope

### Secret Requirements

The secret must contain the following keys (exact match, case-sensitive):

| Key | Description |
|-----|-------------|
| `llama_stack_client_base_url` | The URL of the LlamaStack server (e.g., `http://lls-svc.my-namespace.svc.cluster.local:8321`) |
| `llama_stack_client_api_key` | The API key for authenticating with the LlamaStack server |

### Middleware Chain

The request passes through the following middleware:

```text
AttachNamespace -> RequireAccessToService -> AttachLlamaStackClientFromSecret -> LlamaStackVectorStoresHandler
```

### Client Creation Precedence

The `AttachLlamaStackClientFromSecret` middleware determines how to create the LlamaStack client using the following precedence:

| Priority | Condition | Behavior |
|----------|-----------|----------|
| 1 | `MockLSClient` flag is set | Creates a mock client, skips secret lookup |
| 2 | Auth is disabled | Requires `LLAMA_STACK_URL` env var, uses it with empty token |
| 3 | `LLAMA_STACK_URL` env var is set | Developer override, skips secret lookup, uses env var URL |
| 4 | Normal (production) | Reads credentials from the named Kubernetes secret |

## Response Format

The response follows the envelope pattern:

```json
{
  "data": {
    "vector_stores": [
      {
        "id": "vs_136a08ec-60da-4f68-b587-54f3def2a84c",
        "name": "Milvus Vector Store",
        "status": "completed",
        "provider": "milvus"
      },
      {
        "id": "vs_abc12345-def6-7890-abcd-ef1234567890",
        "name": "FAISS In-Memory Store",
        "status": "completed",
        "provider": "faiss"
      }
    ]
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique vector store identifier (e.g., `vs_136a08ec-...`) |
| `name` | string | Human-readable name |
| `status` | string | Vector store status: `expired`, `in_progress`, or `completed` |
| `provider` | string | Database provider identifier (e.g., `milvus`, `faiss`, `chromadb`). Extracted from LlamaStack's `metadata.provider_id` field. |

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Missing or invalid `namespace` or `secretName`, or secret missing required keys |
| 401 | Unauthorized - Missing authentication |
| 404 | Not Found - Secret does not exist in the namespace |
| 500 | Internal Server Error |
| 502 | Bad Gateway - LlamaStack server connection failed |

## Examples

### Retrieve vector stores using a secret

```bash
curl -s -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/lsd/vector-stores?namespace=my-namespace&secretName=my-lls-secret' | jq
```

### Error: Missing secretName

```bash
curl -s -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/lsd/vector-stores?namespace=my-namespace' | jq
```

Response (400):
```json
{
  "error": {
    "code": "400",
    "message": "missing required query parameter: secretName"
  }
}
```

## Local Development

### Mock Mode

Start the BFF with mock clients to test without a cluster or LlamaStack server:

```bash
cd packages/autorag/bff
make run MOCK_K8S_CLIENT=true MOCK_LS_CLIENT=true
```

```bash
curl -s 'http://localhost:4000/api/v1/lsd/vector-stores?namespace=default&secretName=any-secret' | jq
```

### Developer Override

Start the BFF with `LLAMA_STACK_URL` to skip secret lookup and point to a specific LlamaStack server:

```bash
cd packages/autorag/bff
make run LLAMA_STACK_URL=http://localhost:8321
```

```bash
curl -s -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/lsd/vector-stores?namespace=default&secretName=any-secret' | jq
```

### Full E2E

1. Port-forward the LlamaStack service:
   ```bash
   oc port-forward svc/<llamastack-service> -n <namespace> 8321:8321
   ```

2. Create a secret with LlamaStack credentials (use the in-cluster service DNS name):
   ```bash
   oc create secret generic my-lls-secret \
     --namespace=<namespace> \
     --from-literal=llama_stack_client_base_url=http://<llamastack-service>.<namespace>.svc.cluster.local:8321 \
     --from-literal=llama_stack_client_api_key=dummy
   ```

   > **Note:** The secret-sourced base URL is validated to reject loopback addresses.
   > For local development with port-forwarded LlamaStack, use the `LLAMA_STACK_URL`
   > environment variable override instead: `make run LLAMA_STACK_URL=http://localhost:8321`

3. Start the BFF without mock flags:
   ```bash
   cd packages/autorag/bff
   make run
   ```

4. Call the endpoint:
   ```bash
   curl -s -H "Authorization: Bearer $(oc whoami -t)" \
     'http://localhost:4000/api/v1/lsd/vector-stores?namespace=<namespace>&secretName=my-lls-secret' | jq
   ```

## Security

- Authentication is enforced by the `InjectRequestIdentity` global middleware
- Secret access is authorized by Kubernetes RBAC — the user must have `get` permission on the specific Secret
- The `secretName` parameter is validated as a DNS-1123 label to prevent injection
- The LlamaStack base URL from the secret is validated to reject loopback, link-local, and unspecified addresses (SSRF protection)
- Secret values (API keys) are not logged

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `internal/api/middleware.go` | `AttachLlamaStackClientFromSecret` middleware — reads secret, creates client |
| `internal/api/lsd_vector_stores_handler.go` | HTTP handler — calls repository, returns envelope response |
| `internal/repositories/lsd_vector_stores.go` | Repository — calls LlamaStack client, extracts provider from metadata |
| `internal/integrations/llamastack/llamastack_client.go` | LlamaStack client — wraps OpenAI SDK for vector store listing |
| `internal/helpers/llamastack.go` | Context helper — retrieves LlamaStack client from request context |
| `api/openapi/autorag.yaml` | OpenAPI specification |

### Provider ID Source

LlamaStack stores the vector database provider identifier in the `metadata` field of the OpenAI-compatible vector store response, not as a top-level field. The BFF extracts it via `metadata["provider_id"]`. Known provider values include `milvus`, `faiss`, and `chromadb`.

### Testing

```bash
# Run handler tests
go test -v ./internal/api -run TestLlamaStackVectorStoresHandler

# Run all tests
go test ./...
```
