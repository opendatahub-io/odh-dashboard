# BFF Testing Guide

This guide shows how to test the BFF (Backend for Frontend) that integrates LlamaStack AI services with Kubernetes cluster management.

## Prerequisites

// TODO: Update example to use Openshift. 
- Kubernetes cluster running (this example uses Kind)
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

## Testing with Mock Endpoints

The BFF supports mock clients for both Kubernetes and LlamaStack, allowing you to test the API without external dependencies. This is perfect for development, testing, and CI/CD environments.

### Mock Configuration

#### 1. Mock Kubernetes Client

**Start BFF with Mock K8s Client:**
```bash
LLAMA_STACK_URL=http://localhost:8321 \
AUTH_METHOD=user_token \
AUTH_TOKEN_HEADER=Authorization \
AUTH_TOKEN_PREFIX="Bearer " \
MOCK_K8S_CLIENT=true \
make run STATIC_ASSETS_DIR=../frontend/dist
```

**Environment Variables:**
- `MOCK_K8S_CLIENT=true`: Enables mock Kubernetes client
- `MOCK_K8S_CLIENT=false` (or not set): Uses real Kubernetes cluster

#### 2. Mock LlamaStack Client

**Start BFF with Mock LS Client:**
```bash
LLAMA_STACK_URL=http://localhost:8321 \
AUTH_METHOD=user_token \
AUTH_TOKEN_HEADER=Authorization \
AUTH_TOKEN_PREFIX="Bearer " \
MOCK_LS_CLIENT=true \
make run STATIC_ASSETS_DIR=../frontend/dist
```

**Environment Variables:**
- `MOCK_LS_CLIENT=true`: Enables mock LlamaStack client
- `MOCK_LS_CLIENT=false` (or not set): Uses real LlamaStack server

#### 3. Combined Mock Mode

**Start BFF with Both Mock Clients:**
```bash
LLAMA_STACK_URL=http://localhost:8321 \
AUTH_METHOD=user_token \
AUTH_TOKEN_HEADER=Authorization \
AUTH_TOKEN_PREFIX="Bearer " \
MOCK_K8S_CLIENT=true \
MOCK_LS_CLIENT=true \
make run STATIC_ASSETS_DIR=../frontend/dist
```

### Mock Authentication Tokens

When using mock clients, you must use predefined test tokens:

**Valid Mock Tokens:**
- `FAKE_BEARER_TOKEN` 

**Invalid Tokens (will fail):**
- `dummy-token` ❌ → `"unknown test token: dummy-token"`
- `some-random-token` ❌ → `"unknown test token: some-random-token"`
- Any other token ❌ → `"unknown test token: [token]"`

### Testing Mock Kubernetes Endpoints

#### List Namespaces (Mock K8s)

**Request:**
```bash
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/genai/v1/namespaces"
```

**Expected Response (200 OK):**
```json
{
  "data": [
    {
      "name": "mock-test-namespace-1",
      "displayName": "mock-test-namespace-1"
    },
    {
      "name": "mock-test-namespace-2", 
      "displayName": "mock-test-namespace-2"
    },
    {
      "name": "mock-test-namespace-3",
      "displayName": "mock-test-namespace-3"
    }
  ]
}
```

**Mock Data Source:** Hardcoded in `internal/api/integrations/kubernetes/k8smocks/token_k8s_client_mock.go`

### Testing Mock LlamaStack Endpoints

#### List Models (Mock LS)

**Request:**
```bash
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/genai/v1/models"
```

**Expected Response (200 OK):**
```json
{
  "data": [
    {
      "id": "ollama/llama3.2:3b",
      "created": 1755721063,
      "object": "model",
      "owned_by": "llama_stack"
    },
    {
      "id": "ollama/all-minilm:l6-v2",
      "created": 1755721063,
      "object": "model",
      "owned_by": "llama_stack"
    }
  ]
}
```

#### List Vector Stores (Mock LS)

**Request:**
```bash
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/genai/v1/vectorstores"
```

**Expected Response (200 OK):**
```json
{
  "data": [
    {
      "id": "vs_mock123",
      "created_at": 1755721097,
      "file_counts": {
        "cancelled": 0,
        "completed": 1,
        "failed": 0,
        "in_progress": 0,
        "total": 1
      },
      "last_active_at": 1755721097,
      "metadata": {
        "provider_id": "milvus",
        "provider_vector_db_id": "vs_mock123"
      },
      "name": "Mock Vector Store",
      "object": "vector_store",
      "status": "completed",
      "usage_bytes": 0
    }
  ]
}
```

#### Create AI Response (Mock LS)

**Request:**
```bash
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" \
  "http://localhost:8080/genai/v1/responses" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello, how are you?", "model": "ollama/llama2:latest"}'
```

**Expected Response (201 Created):**
```json
{
  "data": {
    "id": "resp_mock123",
    "model": "ollama/llama2:latest",
    "status": "completed",
    "created_at": 1234567890,
    "content": "This is a mock response to your query: Hello, how are you?"
  }
}
```

### Troubleshooting Mock Mode

**Common Issues:**

1. **"unknown test token" Error:**
   - Ensure you're using one of the valid mock tokens
   - Check that `MOCK_K8S_CLIENT=true` is set

2. **Still Getting Real Data:**
   - Verify environment variables are set correctly
   - Check BFF startup logs for "Using mocked Kubernetes client" or "Using mock LlamaStack client"
   - Restart BFF after changing mock settings

3. **Mock Data Not Matching Expected:**
   - Check the mock client source files for current mock data
   - Mock data is hardcoded and may be updated in newer versions

**Mock Data Locations:**
- **K8s Mock Data:** `internal/api/integrations/kubernetes/k8smocks/`
- **LS Mock Data:** `internal/integrations/llamastack/lsmocks/`


