# LSD Vector Store Providers Endpoint Documentation

## Overview

This document describes the GET endpoint for retrieving available vector store providers from a LlamaStack server using credentials stored in a Kubernetes secret.

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
5. Calls the LlamaStack server's native `GET /v1/providers` endpoint to list all registered providers
6. Filters the response to include only providers with `api == "vector_io"`
7. Returns the filtered providers wrapped in a data envelope

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
    "vector_store_providers": [
      {
        "provider_id": "milvus",
        "provider_type": "remote::milvus"
      },
      {
        "provider_id": "faiss",
        "provider_type": "inline::faiss"
      }
    ]
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `provider_id` | string | Provider identifier (e.g., `milvus`, `faiss`) |
| `provider_type` | string | Provider implementation type (e.g., `remote::milvus`, `inline::faiss`) |

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Missing or invalid `namespace` or `secretName`, or secret missing required keys |
| 401 | Unauthorized - Missing authentication |
| 404 | Not Found - Secret does not exist in the namespace, or LlamaStack /v1/providers not available |
| 500 | Internal Server Error |
| 502 | Bad Gateway - LlamaStack server connection failed |

## Examples

### Retrieve vector store providers using a secret

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
- Authorization header is only sent over HTTPS to prevent token leakage

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `internal/api/middleware.go` | `AttachLlamaStackClientFromSecret` middleware — reads secret, creates client |
| `internal/api/lsd_vector_stores_handler.go` | HTTP handler — calls repository, returns envelope response |
| `internal/repositories/lsd_vector_stores.go` | Repository — calls LlamaStack client, filters for vector_io providers |
| `internal/integrations/llamastack/llamastack_client.go` | LlamaStack client — calls native /v1/providers endpoint |
| `internal/models/lsd_vector_stores.go` | Models — LlamaStackProvider, LSDVectorStoreProvider, LSDVectorStoreProvidersData |
| `internal/helpers/llamastack.go` | Context helper — retrieves LlamaStack client from request context |
| `api/openapi/autorag.yaml` | OpenAPI specification |

### Provider Filtering

The BFF calls LlamaStack's native `/v1/providers` endpoint which returns all registered providers across all API types (inference, vector_io, agents, etc.). The repository filters for providers where `api == "vector_io"` and returns only the `provider_id` and `provider_type` fields.

The frontend further filters by `provider_type` (e.g., `remote::milvus`) using the `SUPPORTED_VECTOR_STORE_PROVIDER_TYPES` allowlist.

### Testing

```bash
# Run handler tests
go test -v ./internal/api -run TestLlamaStackVectorStoresHandler

# Run all tests
go test ./...
```
