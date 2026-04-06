# LSD Models Endpoint Documentation

## Overview

This document describes the GET endpoint for retrieving available models from a LlamaStack server using credentials stored in a Kubernetes secret.

## Endpoint

**GET** `/api/v1/lsd/models`

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
5. Calls the LlamaStack server to list available models
6. Translates the response from LlamaStack's native format into a stable public API format
7. Returns the models wrapped in a data envelope

### Secret Requirements

The secret must contain the following keys (exact match, case-sensitive):

| Key | Description |
|-----|-------------|
| `llama_stack_client_base_url` | The URL of the LlamaStack server (e.g., `http://lls-svc.my-namespace.svc.cluster.local:8321`) |
| `llama_stack_client_api_key` | The API key for authenticating with the LlamaStack server |

### Middleware Chain

The request passes through the following middleware:

```
AttachNamespace -> AttachLlamaStackClientFromSecret -> LlamaStackModelsHandler
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
| 502 | Bad Gateway - LlamaStack server connection failed |

## Examples

### Retrieve models using a secret

```bash
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/lsd/models?namespace=my-namespace&secretName=my-lls-secret'
```

### Error: Missing secretName

```bash
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/lsd/models?namespace=my-namespace'
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
  'http://localhost:4000/api/v1/lsd/models?namespace=my-namespace&secretName=nonexistent'
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

Start the BFF with mock clients to test without a cluster or LlamaStack server:

```bash
cd packages/autorag/bff
make run MOCK_K8S_CLIENT=true MOCK_LS_CLIENT=true
```

```bash
curl 'http://localhost:4000/api/v1/lsd/models?namespace=default&secretName=any-secret'
```

### Developer Override

Start the BFF with `LLAMA_STACK_URL` to skip secret lookup and point to a specific LlamaStack server:

```bash
cd packages/autorag/bff
make run LLAMA_STACK_URL=http://localhost:8321
```

```bash
curl -H "Authorization: Bearer $(oc whoami -t)" \
  'http://localhost:4000/api/v1/lsd/models?namespace=default&secretName=any-secret'
```

### Full E2E

1. Port-forward the LlamaStack service:
   ```bash
   oc port-forward svc/<llamastack-service> -n <namespace> 8321:8321
   ```

2. Create a secret with LlamaStack credentials:
   ```bash
   oc create secret generic my-lls-secret \
     --namespace=<namespace> \
     --from-literal=llama_stack_client_base_url=http://localhost:8321 \
     --from-literal=llama_stack_client_api_key=dummy
   ```

3. Start the BFF without mock flags:
   ```bash
   cd packages/autorag/bff
   make run
   ```

4. Call the endpoint:
   ```bash
   curl -H "Authorization: Bearer $(oc whoami -t)" \
     'http://localhost:4000/api/v1/lsd/models?namespace=<namespace>&secretName=my-lls-secret'
   ```

## Security

- Authentication is enforced by the `InjectRequestIdentity` global middleware
- Secret access is authorized by Kubernetes RBAC — the user must have `list` permission on secrets in the namespace
- The `secretName` parameter is validated as a DNS-1123 label to prevent injection
- The LlamaStack base URL from the secret is validated to reject loopback, link-local, and unspecified addresses (SSRF protection)
- Secret values (API keys) are not logged

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `internal/api/middleware.go` | `AttachLlamaStackClientFromSecret` middleware — reads secret, creates client |
| `internal/api/lsd_models_handler.go` | HTTP handler — calls repository, returns envelope response |
| `internal/repositories/lsd_models.go` | Repository — calls LlamaStack client, translates response format |
| `internal/integrations/llamastack/llamastack_client.go` | LlamaStack client — wraps OpenAI SDK for model listing |
| `internal/helpers/llamastack.go` | Context helper — retrieves LlamaStack client from request context |
| `internal/api/app.go` | Route registration and API path constants |
| `api/openapi/autorag.yaml` | OpenAPI specification |

### Testing

```bash
# Run handler tests
go test -v ./internal/api -run TestLlamaStackModelsHandler

# Run middleware tests
go test -v ./internal/api -run TestAttachLlamaStackClientFromSecret

# Run all tests
go test ./...
```
