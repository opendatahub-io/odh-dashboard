# OGX Vector Store Providers Endpoint Documentation

## Overview

This document describes the GET endpoint for retrieving available vector store providers from a Open GenAI Stack server using credentials stored in a Kubernetes secret.

## Endpoint

**GET** `/api/v1/ogx/vector-stores`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | **Yes** | Kubernetes namespace containing the Open GenAI Stack credentials secret |
| `secretName` | string | **Yes** | Name of the Kubernetes secret containing Open GenAI Stack credentials. Must be a valid DNS-1123 label. |

## Functionality

The endpoint:
1. Validates `namespace` and `secretName` query parameters
2. Reads the specified Kubernetes secret from the namespace
3. Extracts `ogx_client_base_url` and `ogx_client_api_key` from the secret (exact key match, case-sensitive)
4. Creates a Open GenAI Stack client using those credentials
5. Calls the Open GenAI Stack server's native `GET /v1/providers` endpoint to list all registered providers
6. Filters the response to include only providers with `api == "vector_io"`
7. Returns the filtered providers wrapped in a data envelope

### Secret Requirements

The secret must contain the following keys (exact match, case-sensitive):

| Key | Description |
|-----|-------------|
| `ogx_client_base_url` | The URL of the Open GenAI Stack server (e.g., `http://ogx-svc.my-namespace.svc.cluster.local:8321`) |
| `ogx_client_api_key` | The API key for authenticating with the Open GenAI Stack server |

### Middleware Chain

The request passes through the following middleware:

```text
AttachNamespace -> RequireAccessToService -> AttachOGXClientFromSecret -> OGXVectorStoresHandler
```

### Client Creation Precedence

The `AttachOGXClientFromSecret` middleware determines how to create the Open GenAI Stack client using the following precedence:

| Priority | Condition | Behavior |
|----------|-----------|----------|
| 1 | `MockOGXClient` flag is set | Creates a mock client, skips secret lookup |
| 2 | Auth is disabled | Requires `OGX_URL` env var, uses it with empty token |
| 3 | `OGX_URL` env var is set | Developer override, skips secret lookup, uses env var URL |
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
| 404 | Not Found - Secret does not exist in the namespace, or Open GenAI Stack /v1/providers not available |
| 500 | Internal Server Error |
| 502 | Bad Gateway - Open GenAI Stack server connection failed |

## Examples

### Retrieve vector store providers using a secret

```bash
curl -s -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/ogx/vector-stores?namespace=my-namespace&secretName=my-ogx-secret' | jq
```

### Error: Missing secretName

```bash
curl -s -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/ogx/vector-stores?namespace=my-namespace' | jq
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

Start the BFF with mock clients to test without a cluster or Open GenAI Stack server:

```bash
cd packages/autorag/bff
make run MOCK_K8S_CLIENT=true MOCK_OGX_CLIENT=true
```

```bash
curl -s 'http://localhost:4000/api/v1/ogx/vector-stores?namespace=default&secretName=any-secret' | jq
```

### Developer Override

Start the BFF with `OGX_URL` to skip secret lookup and point to a specific Open GenAI Stack server:

```bash
cd packages/autorag/bff
make run OGX_URL=http://localhost:8321
```

```bash
curl -s -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/ogx/vector-stores?namespace=default&secretName=any-secret' | jq
```

### Full E2E

1. Port-forward the Open GenAI Stack service:
   ```bash
   oc port-forward svc/<ogx-service> -n <namespace> 8321:8321
   ```

2. Create a secret with Open GenAI Stack credentials (use the in-cluster service DNS name):
   ```bash
   oc create secret generic my-ogx-secret \
     --namespace=<namespace> \
     --from-literal=ogx_client_base_url=http://<ogx-service>.<namespace>.svc.cluster.local:8321 \
     --from-literal=ogx_client_api_key=dummy
   ```

   > **Note:** The secret-sourced base URL is validated to reject loopback addresses.
   > For local development with port-forwarded Open GenAI Stack, use the `OGX_URL`
   > environment variable override instead: `make run OGX_URL=http://localhost:8321`

3. Start the BFF without mock flags:
   ```bash
   cd packages/autorag/bff
   make run
   ```

4. Call the endpoint:
   ```bash
   curl -s -H "Authorization: Bearer $(oc whoami -t)" \
     'http://localhost:4000/api/v1/ogx/vector-stores?namespace=<namespace>&secretName=my-ogx-secret' | jq
   ```

## Security

- Authentication is enforced by the `InjectRequestIdentity` global middleware
- Secret access is authorized by Kubernetes RBAC — the user must have `get` permission on the specific Secret
- The `secretName` parameter is validated as a DNS-1123 label to prevent injection
- The Open GenAI Stack base URL from the secret is validated to reject loopback, link-local, and unspecified addresses (SSRF protection)
- Secret values (API keys) are not logged
- Authorization header is only sent over HTTPS to prevent token leakage

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `internal/api/middleware.go` | `AttachOGXClientFromSecret` middleware — reads secret, creates client |
| `internal/api/ogx_vector_stores_handler.go` | HTTP handler — calls repository, returns envelope response |
| `internal/repositories/ogx_vector_stores.go` | Repository — calls Open GenAI Stack client, filters for vector_io providers |
| `internal/integrations/ogx/ogx_client.go` | Open GenAI Stack client — calls native /v1/providers endpoint |
| `internal/models/ogx_vector_stores.go` | Models — Open GenAI StackProvider, OGXVectorStoreProvider, OGXVectorStoreProvidersData |
| `internal/helpers/ogx.go` | Context helper — retrieves Open GenAI Stack client from request context |
| `api/openapi/autorag.yaml` | OpenAPI specification |

### Provider Filtering

The BFF calls Open GenAI Stack's native `/v1/providers` endpoint which returns all registered providers across all API types (inference, vector_io, agents, etc.). The repository filters for providers where `api == "vector_io"` and returns only the `provider_id` and `provider_type` fields.

The frontend further filters by `provider_type` (e.g., `remote::milvus`) using the `SUPPORTED_VECTOR_STORE_PROVIDER_TYPES` allowlist.

### Testing

```bash
# Run handler tests
go test -v ./internal/api -run TestOGXVectorStoresHandler

# Run all tests
go test ./...
```
