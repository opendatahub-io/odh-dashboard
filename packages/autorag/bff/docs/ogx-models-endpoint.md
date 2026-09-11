# OGX Models Endpoint Documentation

## Overview

This document describes the GET endpoint for retrieving available models from a Open GenAI Stack server using credentials stored in a Kubernetes secret.

## Endpoint

**GET** `/api/v1/ogx/models`

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
5. Calls the Open GenAI Stack server to list available models
6. Translates the response from Open GenAI Stack's native format into a stable public API format
7. Returns the models wrapped in a data envelope

### Secret Requirements

The secret must contain the following keys (exact match, case-sensitive):

| Key | Description |
|-----|-------------|
| `ogx_client_base_url` | The URL of the Open GenAI Stack server (e.g., `http://ogx-svc.my-namespace.svc.cluster.local:8321`) |
| `ogx_client_api_key` | The API key for authenticating with the Open GenAI Stack server |

### Middleware Chain

The request passes through the following middleware:

```text
AttachNamespace -> AttachOGXClientFromSecret -> OGXModelsHandler
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
    "models": [
      {
        "id": "llama3.2:3b",
        "type": "llm",
        "provider": "ollama",
        "resource_path": "ollama://models/llama3.2:3b"
      },
      {
        "id": "all-minilm:l6-v2",
        "type": "embedding",
        "provider": "ollama",
        "resource_path": "ollama://models/all-minilm:l6-v2"
      }
    ]
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Model identifier (e.g., `llama3.2:3b`) |
| `type` | string | Model type: `llm` or `embedding` |
| `provider` | string | Provider identifier (e.g., `ollama`, `huggingface`) |
| `resource_path` | string | Full provider resource path (e.g., `ollama://models/llama3.2:3b`) |

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Missing or invalid `namespace` or `secretName`, or secret missing required keys |
| 401 | Unauthorized - Missing authentication |
| 404 | Not Found - Secret does not exist in the namespace |
| 500 | Internal Server Error |
| 502 | Bad Gateway - Open GenAI Stack server connection failed |

## Examples

### Retrieve models using a secret

```bash
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/ogx/models?namespace=my-namespace&secretName=my-ogx-secret'
```

### Error: Missing secretName

```bash
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/ogx/models?namespace=my-namespace'
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

### Error: Secret not found

```bash
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/ogx/models?namespace=my-namespace&secretName=nonexistent'
```

Response (404):
```json
{
  "error": {
    "code": "404",
    "message": "secret \"nonexistent\" not found in namespace \"my-namespace\""
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
curl 'http://localhost:4000/api/v1/ogx/models?namespace=default&secretName=any-secret'
```

### Developer Override

Start the BFF with `OGX_URL` to skip secret lookup and point to a specific Open GenAI Stack server:

```bash
cd packages/autorag/bff
make run OGX_URL=http://localhost:8321
```

```bash
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/ogx/models?namespace=default&secretName=any-secret'
```

### Full E2E

1. Port-forward the Open GenAI Stack service:
   ```bash
   oc port-forward svc/<ogx-service> -n <namespace> 8321:8321
   ```

2. Create a secret with Open GenAI Stack credentials:
   ```bash
   oc create secret generic my-ogx-secret \
     --namespace=<namespace> \
     --from-literal=ogx_client_base_url=http://localhost:8321 \
     --from-literal=ogx_client_api_key=dummy
   ```

3. Start the BFF without mock flags:
   ```bash
   cd packages/autorag/bff
   make run
   ```

4. Call the endpoint:
   ```bash
   curl -H "Authorization: Bearer $(oc whoami -t)" \
     'http://localhost:4000/api/v1/ogx/models?namespace=<namespace>&secretName=my-ogx-secret'
   ```

## Security

- Authentication is enforced by the `InjectRequestIdentity` global middleware
- Secret access is authorized by Kubernetes RBAC — the user must have `get` permission on the named secret in the namespace
- The `secretName` parameter is validated as a DNS-1123 label to prevent injection
- The Open GenAI Stack base URL from the secret is validated to reject loopback, link-local, and unspecified addresses (SSRF protection)
- Secret values (API keys) are not logged

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `internal/api/middleware.go` | `AttachOGXClientFromSecret` middleware — reads secret, creates client |
| `internal/api/ogx_models_handler.go` | HTTP handler — calls repository, returns envelope response |
| `internal/repositories/ogx_models.go` | Repository — calls Open GenAI Stack client, translates response format |
| `internal/integrations/ogx/ogx_client.go` | Open GenAI Stack client — wraps OpenAI SDK for model listing |
| `internal/helpers/ogx.go` | Context helper — retrieves Open GenAI Stack client from request context |
| `internal/api/app.go` | Route registration and API path constants |
| `api/openapi/autorag.yaml` | OpenAPI specification |

### Testing

```bash
# Run handler tests
go test -v ./internal/api -run TestOGXModelsHandler

# Run middleware tests
go test -v ./internal/api -run TestAttachOGXClientFromSecret

# Run all tests
go test ./...
```
