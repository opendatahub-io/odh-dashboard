# MaaS Vector Store Providers Endpoint Documentation

## Overview

This document describes the GET endpoint for retrieving available vector store providers from a Models as a Service server using credentials stored in a Kubernetes secret.

## Endpoint

**GET** `/api/v1/maas/vector-stores`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | **Yes** | Kubernetes namespace containing the Models as a Service credentials secret |
| `secretName` | string | **Yes** | Name of the Kubernetes secret containing Models as a Service credentials. Must be a valid DNS-1123 label. |

## Functionality

The endpoint:
1. Validates `namespace` and `secretName` query parameters
2. Reads the specified Kubernetes secret from the namespace
3. Extracts `MAAS_BASE_URL` and `MAAS_API_KEY` from the secret (key names are matched case-insensitively; legacy `OGX_CLIENT_*` keys are accepted)
4. Creates a Models as a Service client using those credentials
5. Calls the Models as a Service server's native `GET /v1/providers` endpoint to list all registered providers
6. Filters the response to include only providers with `api == "vector_io"`
7. Returns the filtered providers wrapped in a data envelope

### Secret Requirements

The secret must contain a matching pair of keys (names are matched case-insensitively):

| Key | Description |
|-----|-------------|
| `MAAS_BASE_URL` (or legacy `OGX_CLIENT_BASE_URL`) | The URL of the Models as a Service server (e.g., `http://maas-svc.my-namespace.svc.cluster.local:8321`) |
| `MAAS_API_KEY` (or legacy `OGX_CLIENT_API_KEY`) | The API key for authenticating with the Models as a Service server. The key may be present but empty for no-auth servers. |

### Middleware Chain

The request passes through the following middleware:

```text
AttachNamespace -> RequireAccessToService -> AttachMaaSClientFromSecret -> MaaSVectorStoresHandler
```

### Client Creation Precedence

The `AttachMaaSClientFromSecret` middleware determines how to create the Models as a Service client using the following precedence:

| Priority | Condition | Behavior |
|----------|-----------|----------|
| 1 | `MockMaaSClient` flag is set | Creates a mock client, skips secret lookup |
| 2 | Normal | Reads credentials from the named Kubernetes secret (`secretName` + `namespace`) |

There is no `MaaS_URL` environment override. Local development should use `MOCK_MAAS_CLIENT=true`, or a secret whose base URL is a reachable in-cluster address. Loopback URLs in the secret are rejected.

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
| 404 | Not Found - Secret does not exist in the namespace, or Models as a Service /v1/providers not available |
| 500 | Internal Server Error |
| 502 | Bad Gateway - Models as a Service server connection failed |

## Examples

### Retrieve vector store providers using a secret

```bash
curl -s -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/maas/vector-stores?namespace=my-namespace&secretName=my-maas-secret' | jq
```

### Error: Missing secretName

```bash
curl -s -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/maas/vector-stores?namespace=my-namespace' | jq
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

Start the BFF with mock clients to test without a cluster or Models as a Service server:

```bash
cd packages/autorag/bff
make run MOCK_K8S_CLIENT=true MOCK_MAAS_CLIENT=true
```

```bash
curl -s 'http://localhost:4000/api/v1/maas/vector-stores?namespace=default&secretName=any-secret' | jq
```

### Full E2E

1. Create a secret with Models as a Service credentials (use the in-cluster service DNS name):

   ```bash
   oc create secret generic my-maas-secret \
     --namespace=<namespace> \
     --from-literal=MAAS_BASE_URL=http://<maas-service>.<namespace>.svc.cluster.local:8321 \
     --from-literal=MAAS_API_KEY=dummy
   ```

   > **Note:** The secret-sourced base URL is validated to reject loopback addresses.
   > For a BFF running on your laptop, use mock mode (`MOCK_MAAS_CLIENT=true`) instead of a localhost URL in the secret.

2. Start the BFF without mock flags:

   ```bash
   cd packages/autorag/bff
   make run
   ```

3. Call the endpoint. This HTTP example is loopback-only and non-portable; do not send the bearer token to a non-localhost host:

   ```bash
   curl -s -H "Authorization: Bearer $(oc whoami -t)" \
     'http://localhost:4000/api/v1/maas/vector-stores?namespace=<namespace>&secretName=my-maas-secret' | jq
   ```

## Security

- Authentication is enforced by the `InjectRequestIdentity` global middleware
- Secret access is authorized by Kubernetes RBAC — the user must have `get` permission on the specific Secret
- The `secretName` parameter is validated as a DNS-1123 label to prevent injection
- The Models as a Service base URL from the secret is validated to reject loopback, link-local, and unspecified addresses (SSRF protection)
- Secret values (API keys) are not logged
- Authorization header is only sent over HTTPS to prevent token leakage

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `internal/api/middleware.go` | `AttachMaaSClientFromSecret` middleware — reads secret, creates client |
| `internal/api/maas_vector_stores_handler.go` | HTTP handler — calls repository, returns envelope response |
| `internal/repositories/maas_vector_stores.go` | Repository — calls Models as a Service client, filters for vector_io providers |
| `internal/integrations/maas/maas_client.go` | Models as a Service client — calls native /v1/providers endpoint |
| `internal/models/maas_vector_stores.go` | Models — Models as a ServiceProvider, MaaSVectorStoreProvider, MaaSVectorStoreProvidersData |
| `internal/helpers/maas.go` | Context helper — retrieves Models as a Service client from request context |
| `api/openapi/autorag.yaml` | OpenAPI specification |

### Provider Filtering

The BFF calls Models as a Service's native `/v1/providers` endpoint which returns all registered providers across all API types (inference, vector_io, agents, etc.). The repository filters for providers where `api == "vector_io"` and returns only the `provider_id` and `provider_type` fields.

The frontend further filters by `provider_type` (e.g., `remote::milvus`) using the `SUPPORTED_VECTOR_STORE_PROVIDER_TYPES` allowlist.

### Testing

```bash
# Run handler tests
go test -v ./internal/api -run TestMaaSVectorStoresHandler

# Run all tests
go test ./...
```
