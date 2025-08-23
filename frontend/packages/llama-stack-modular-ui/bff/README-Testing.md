# BFF Testing Guide

This guide shows how to test the BFF (Backend for Frontend) that integrates LlamaStack AI services with Kubernetes cluster management.

## Prerequisites

- Local Kind cluster running
- LlamaStack server running on `http://localhost:8321`
- Go development environment

## Getting Started

### 1. Get Authentication Token from Kind Cluster

Extract the bearer token from your Kind cluster's kubeconfig:

```bash
export TOKEN=$(kubectl config view --raw -o jsonpath='{.users[0].user.token}')
echo "Token: $TOKEN"
```

### 2. Start the BFF Server

Run the BFF with proper authentication configuration:

```bash
LLAMA_STACK_URL=http://localhost:8321 \
AUTH_METHOD=user_token \
AUTH_TOKEN_HEADER=Authorization \
AUTH_TOKEN_PREFIX="Bearer " \
make run STATIC_ASSETS_DIR=../frontend/dist
```

**Environment Variables:**
- `LLAMA_STACK_URL`: URL of your LlamaStack backend
- `AUTH_METHOD=user_token`: Enables token-based authentication
- `AUTH_TOKEN_HEADER=Authorization`: Header name for the bearer token
- `AUTH_TOKEN_PREFIX="Bearer "`: Token prefix format

### 3. Test the Endpoints

#### Test LlamaStack AI Endpoints

**List Available AI Models:**
```bash
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/genai/v1/models"
```

**List Vector Stores:**
```bash
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/genai/v1/vectorstores"
```

#### Test Kubernetes Endpoints

**List Namespaces:**
```bash
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/genai/v1/namespaces"
```

#### Test Authentication (Should Fail)

**Request without token:**
```bash
curl -i "http://localhost:8080/genai/v1/models"
# Expected: 400 Bad Request - missing required Header: Authorization
```

## Expected Responses

### Successful Responses (200 OK)

**Models Response:**
```json
{
  "data": [
    {
      "id": "ollama/llama3.2:3b",
      "created": 1755936828,
      "object": "model",
      "owned_by": "llama_stack"
    }
  ]
}
```

**Namespaces Response:**
```json
{
  "data": [
    {
      "name": "default",
      "displayName": "default"
    },
    {
      "name": "kube-system",
      "displayName": "kube-system"
    }
  ]
}
```

### Error Responses

**Missing Authentication (400 Bad Request):**
```json
{
  "error": {
    "code": "400",
    "message": "missing required Header: Authorization"
  }
}
```

## Architecture

The BFF provides a unified API that:
- **AI Operations**: Proxies requests to LlamaStack for models, vector stores, and AI responses
- **Kubernetes Operations**: Direct integration with your Kind cluster for resource management
- **Authentication**: Uses the same bearer token for both AI and Kubernetes operations
- **Authorization**: Validates permissions through middleware chain

## Troubleshooting

### Token Issues
- Verify your Kind cluster is running: `kind get clusters`
- Check token extraction: `kubectl get namespaces --token="$TOKEN"`
- Ensure BFF is started with `AUTH_METHOD=user_token`

### Connection Issues
- Verify LlamaStack is running on port 8321
- Check BFF is running on port 8080: `curl http://localhost:8080/healthcheck`
- Ensure no port conflicts: `lsof -i:8080`

### Authentication Errors
- Restart BFF after any configuration changes
- Verify environment variables are set correctly
- Check that the token has proper Kubernetes permissions

## API Endpoints

| Endpoint | Method | Purpose | Backend |
|----------|--------|---------|---------|
| `/genai/v1/models` | GET | List AI models | LlamaStack |
| `/genai/v1/vectorstores` | GET | List vector stores | LlamaStack |
| `/genai/v1/responses` | POST | Generate AI responses | LlamaStack |
| `/genai/v1/namespaces` | GET | List K8s namespaces | Kubernetes |
| `/healthcheck` | GET | Health status | BFF |

All API endpoints require `Authorization: Bearer <token>` header except `/healthcheck`.
