# MaaS Models Endpoint Documentation

## Overview

This document describes the GET endpoint for retrieving available models from a Models as a Service server using credentials stored in a Kubernetes secret.

## Endpoint

**GET** `/api/v1/maas/models`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | **Yes** | Kubernetes namespace containing the Models as a Service credentials secret |
| `secretName` | string | **Yes** | Name of the Kubernetes secret containing Models as a Service credentials. Must be a valid DNS-1123 label. |

## Functionality

The endpoint:
1. Validates `namespace` and `secretName` query parameters
2. Reads the specified Kubernetes secret from the namespace
3. Extracts `maas_base_url` and `maas_api_key` from the secret (exact key match, case-sensitive)
4. Creates a Models as a Service client using those credentials
5. Calls the Models as a Service server to list available models
6. Translates the response from Models as a Service's native format into a stable public API format
7. Returns the models wrapped in a data envelope

### Secret Requirements

The secret must contain the following keys (exact match, case-sensitive):

| Key | Description |
|-----|-------------|
| `maas_base_url` | The URL of the Models as a Service server (e.g., `http://maas-svc.my-namespace.svc.cluster.local:8321`) |
| `maas_api_key` | The API key for authenticating with the Models as a Service server |

### Middleware Chain

The request passes through the following middleware:

```text
AttachNamespace -> AttachMaaSClientFromSecret -> MaaSModelsHandler
```

### Client Creation Precedence

The `AttachMaaSClientFromSecret` middleware determines how to create the Models as a Service client using the following precedence:

| Priority | Condition | Behavior |
|----------|-----------|----------|
| 1 | `MockMaaSClient` flag is set | Creates a mock client, skips secret lookup |
| 2 | Auth is disabled | Requires `MaaS_URL` env var, uses it with empty token |
| 3 | `MaaS_URL` env var is set | Developer override, skips secret lookup, uses env var URL |
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
| 502 | Bad Gateway - Models as a Service server connection failed |

## Examples

### Retrieve models using a secret

```bash
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/maas/models?namespace=my-namespace&secretName=my-maas-secret'
```

### Error: Missing secretName

```bash
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/maas/models?namespace=my-namespace'
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
  'http://localhost:4000/api/v1/maas/models?namespace=my-namespace&secretName=nonexistent'
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

Start the BFF with mock clients to test without a cluster or Models as a Service server:

```bash
cd packages/autorag/bff
make run MOCK_K8S_CLIENT=true MOCK_MAAS_CLIENT=true
```

```bash
curl 'http://localhost:4000/api/v1/maas/models?namespace=default&secretName=any-secret'
```

### Developer Override

Start the BFF with `MaaS_URL` to skip secret lookup and point to a specific Models as a Service server:

```bash
cd packages/autorag/bff
make run MaaS_URL=http://localhost:8321
```

```bash
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/maas/models?namespace=default&secretName=any-secret'
```

### Full E2E

1. Port-forward the Models as a Service service:
   ```bash
   oc port-forward svc/<maas-service> -n <namespace> 8321:8321
   ```

2. Create a secret with Models as a Service credentials:
   ```bash
   oc create secret generic my-maas-secret \
     --namespace=<namespace> \
     --from-literal=maas_base_url=http://localhost:8321 \
     --from-literal=maas_api_key=dummy
   ```

3. Start the BFF without mock flags:
   ```bash
   cd packages/autorag/bff
   make run
   ```

4. Call the endpoint:
   ```bash
   curl -H "Authorization: Bearer $(oc whoami -t)" \
     'http://localhost:4000/api/v1/maas/models?namespace=<namespace>&secretName=my-maas-secret'
   ```

## Security

- Authentication is enforced by the `InjectRequestIdentity` global middleware
- Secret access is authorized by Kubernetes RBAC — the user must have `get` permission on the named secret in the namespace
- The `secretName` parameter is validated as a DNS-1123 label to prevent injection
- The Models as a Service base URL from the secret is validated to reject loopback, link-local, and unspecified addresses (SSRF protection)
- Secret values (API keys) are not logged

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `internal/api/middleware.go` | `AttachMaaSClientFromSecret` middleware — reads secret, creates client |
| `internal/api/maas_models_handler.go` | HTTP handler — calls repository, returns envelope response |
| `internal/repositories/maas_models.go` | Repository — calls Models as a Service client, translates response format |
| `internal/integrations/maas/maas_client.go` | Models as a Service client — wraps OpenAI SDK for model listing |
| `internal/helpers/maas.go` | Context helper — retrieves Models as a Service client from request context |
| `internal/api/app.go` | Route registration and API path constants |
| `api/openapi/autorag.yaml` | OpenAPI specification |

### Testing

```bash
# Run handler tests
go test -v ./internal/api -run TestMaaSModelsHandler

# Run middleware tests
go test -v ./internal/api -run TestAttachMaaSClientFromSecret

# Run all tests
go test ./...
```
