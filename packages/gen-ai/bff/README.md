# BFF Testing Guide

This guide shows how to test the BFF (Backend for Frontend) that integrates LlamaStack AI services with Kubernetes cluster management.

## Prerequisites

// TODO: Update example to use Openshift.

- Kubernetes cluster running (this example uses Kind)
- LlamaStack server running on `http://localhost:8321`
- Go development environment

## Getting Started

### 1. Get Authentication Token from Kind Cluster

**Option A: Extract from kubeconfig (may not work with Kind clusters)**

```bash
# Try to extract token from kubeconfig (often empty for Kind clusters)
export TOKEN="$(kubectl config view --raw -o jsonpath='{.users[0].user.token}')"
echo "Token: ${TOKEN:-<empty>}"

# If token is empty, proceed to Option B
if [ -z "$TOKEN" ]; then
    echo "No token found in kubeconfig, using service account approach..."
fi
```

**Option B: Create Service Account with Token (Recommended for dev)**

```bash
# Create a service account for BFF testing
kubectl -n default create sa bff-user --dry-run=client -o yaml | kubectl apply -f -

# Create a ClusterRole with minimal permissions to list namespaces
kubectl create clusterrole bff-ns-reader \
  --verb=list,get,watch \
  --resource=namespaces \
  --dry-run=client -o yaml | kubectl apply -f -

# Bind the ClusterRole to the service account
kubectl create clusterrolebinding bff-ns-reader-binding \
  --clusterrole=bff-ns-reader \
  --serviceaccount=default:bff-user \
  --dry-run=client -o yaml | kubectl apply -f -

# Get an authentication token for the service account (Kubernetes >= 1.24)
export TOKEN="$(kubectl -n default create token bff-user)"
echo "Token: $TOKEN"
```

**Option C: Cluster Admin Access (Dev only, use with caution)**

```bash
# For testing cluster-admin flows, bind cluster-admin role (DEV ONLY)
kubectl create clusterrolebinding bff-admin-binding \
  --clusterrole=cluster-admin \
  --serviceaccount=default:bff-user \
  --dry-run=client -o yaml | kubectl apply -f -

# Get token for the admin service account
export TOKEN="$(kubectl -n default create token bff-user)"
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
- `MAAS_URL`: URL of your MaaS (Model as a Service) backend
- `AUTH_METHOD=user_token`: Enables token-based authentication
- `AUTH_TOKEN_HEADER=Authorization`: Header name for the bearer token
- `AUTH_TOKEN_PREFIX="Bearer "`: Token prefix format

### 3. Test the Endpoints

#### Test LlamaStack AI Endpoints

**List Available AI Models:**

```bash
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/models"
```

**List Vector Stores:**

```bash
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/vectorstores"
```

#### Test Kubernetes Endpoints

**List Namespaces:**

```bash
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/namespaces"
```

**Get LlamaStack Distribution Status:**

```bash
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/llamastack-distribution/status?namespace=default"
```

#### Test MaaS (Model as a Service) Endpoints

**List Available MaaS Models:**

```bash
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/maas/models"
```

**Issue New Token:**

```bash
# Issue token with default 4h TTL
curl -i -X POST -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/maas/tokens"

# Issue token with custom TTL
curl -i -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"expiration": "2h"}' \
     "http://localhost:8080/gen-ai/api/v1/maas/tokens"
```

**Revoke All Tokens:**

```bash
curl -i -X DELETE -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/maas/tokens"
```

#### Test MCP (Model Context Protocol) Endpoints

**List Available MCP Servers:**

```bash
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/aa/mcps?namespace=default"
```

**Get MCP Server Status:**

```bash
# URL-encode the server URL parameter
SERVER_URL="http%3A%2F%2Flocalhost%3A9090%2Fsse"
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/mcp/status?namespace=default&server_url=$SERVER_URL"
```

**Get MCP Server Tools:**

```bash
# URL-encode the server URL parameter
SERVER_URL="http%3A%2F%2Flocalhost%3A9090%2Fsse"
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/mcp/tools?namespace=default&server_url=$SERVER_URL"
```

**Optional: With MCP Server Authentication:**

```bash
# Include MCP server bearer token if the MCP server requires authentication
SERVER_URL="http%3A%2F%2Flocalhost%3A9090%2Fsse"
curl -i -H "Authorization: Bearer $TOKEN" \
     -H "X-MCP-Bearer: Bearer mcp_server_token_123" \
     "http://localhost:8080/gen-ai/api/v1/mcp/status?namespace=default&server_url=$SERVER_URL"
```

#### Test Authentication (Should Fail)

**Request without token:**

```bash
curl -i "http://localhost:8080/gen-ai/api/v1/models"
# Expected: 400 Bad Request - missing required Header: Authorization
```

**Request without namespace parameter (LSD endpoint):**

```bash
curl -i -H "Authorization: Bearer $TOKEN" "http://localhost:8080/gen-ai/api/v1/llamastack-distribution/status"
# Expected: 400 Bad Request - missing required query parameter: namespace
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

**MaaS Models Response:**

```json
{
  "object": "list",
  "data": [
    {
      "id": "llama-2-7b-chat",
      "object": "model",
      "created": 1672531200,
      "owned_by": "model-namespace",
      "ready": true,
      "url": "http://llama-2-7b-chat.openshift-ai-inference-tier-premium.svc.cluster.local"
    },
    {
      "id": "mistral-7b-instruct",
      "object": "model",
      "created": 1672531200,
      "owned_by": "model-namespace",
      "ready": false,
      "url": "http://mistral-7b-instruct.openshift-ai-inference-tier-premium.svc.cluster.local"
    }
  ]
}
```

**MaaS Token Issue Response:**

```json
{
  "token": "maas-token-placeholder-12345",
  "expiresAt": 1735406400
}
```

**MaaS Token Revoke Response:**

```http
HTTP/1.1 204 No Content
(empty body)
```

**LlamaStack Distribution Status Response (LSD Found):**

```json
{
  "data": {
    "name": "test-lsd",
    "phase": "Ready",
    "version": "v0.2.0",
    "distributionConfig": {
      "activeDistribution": "ollama",
      "availableDistributions": {
        "ollama": "docker.io/llamastack/distribution-ollama:latest",
        "bedrock": "docker.io/llamastack/distribution-bedrock:latest"
      },
      "providers": [
        {
          "api": "mock-api",
          "provider_id": "mock-provider",
          "provider_type": "mock-type",
          "config": null,
          "health": {
            "status": "healthy",
            "message": "Provider is responding normally"
          }
        }
      ]
    }
  }
}
```

**LlamaStack Distribution Status Response (No LSD Found):**

```json
{
  "data": null
}
```

**MCP Servers List Response:**

```json
{
  "data": {
    "servers": [
      {
        "name": "brave",
        "url": "http://localhost:9090/sse",
        "transport": "sse",
        "description": "Search the Internet.",
        "logo": null,
        "status": "healthy"
      },
      {
        "name": "kubernetes",
        "url": "http://localhost:9091/mcp",
        "transport": "streamable-http",
        "description": "Manage resources in a Kubernetes cluster.",
        "logo": "https://kubernetes.io/_common-resources/images/flower.svg",
        "status": "healthy"
      }
    ],
    "total_count": 2,
    "config_map_info": {
      "name": "gen-ai-aa-mcp-servers",
      "namespace": "mcp-servers",
      "last_updated": "2025-01-21T10:30:00Z"
    }
  }
}
```

**MCP Server Status Response:**

```json
{
  "data": {
    "server_url": "http://localhost:9090/sse",
    "status": "connected",
    "message": "Successfully connected to MCP server",
    "last_checked": 1755721435,
    "server_info": {
      "name": "brave-search-server",
      "version": "1.0.0",
      "protocol_version": "2024-11-05"
    },
    "ping_response_time_ms": 45
  }
}
```

**MCP Server Tools Response:**

```json
{
  "data": {
    "server_url": "http://localhost:9090/sse",
    "status": "success",
    "message": "Successfully retrieved tools from MCP server",
    "last_checked": 1755721435,
    "server_info": {
      "name": "brave-search-server",
      "version": "1.0.0",
      "protocol_version": "2024-11-05"
    },
    "tools_count": 2,
    "tools": [
      {
        "name": "brave_web_search",
        "description": "Search the web using Brave Search API",
        "input_schema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Search query"
            }
          },
          "required": ["query"]
        }
      },
      {
        "name": "brave_local_search",
        "description": "Search for local businesses and places",
        "input_schema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Local search query"
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
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

#### 4. Mock MCP Client

**Start BFF with Mock MCP Client:**

```bash
LLAMA_STACK_URL=http://localhost:8321 \
AUTH_METHOD=user_token \
AUTH_TOKEN_HEADER=Authorization \
AUTH_TOKEN_PREFIX="Bearer " \
MOCK_MCP_CLIENT=true \
make run STATIC_ASSETS_DIR=../frontend/dist
```

**Environment Variables:**

- `MOCK_MCP_CLIENT=true`: Enables mock MCP client
- `MOCK_MCP_CLIENT=false` (or not set): Uses real MCP servers

#### 5. Mock MaaS Client

**Start BFF with Mock MaaS Client:**

```bash
LLAMA_STACK_URL=http://localhost:8321 \
AUTH_METHOD=user_token \
AUTH_TOKEN_HEADER=Authorization \
AUTH_TOKEN_PREFIX="Bearer " \
MOCK_MAAS_CLIENT=true \
make run STATIC_ASSETS_DIR=../frontend/dist
```

**Environment Variables:**

- `MOCK_MAAS_CLIENT=true`: Enables mock MaaS client
- `MOCK_MAAS_CLIENT=false` (or not set): Uses real MaaS server

#### 6. Combined Mock Mode (All Services)

**Start BFF with All Mock Clients:**

```bash
LLAMA_STACK_URL=http://localhost:8321 \
AUTH_METHOD=user_token \
AUTH_TOKEN_HEADER=Authorization \
AUTH_TOKEN_PREFIX="Bearer " \
MOCK_K8S_CLIENT=true \
MOCK_LS_CLIENT=true \
MOCK_MCP_CLIENT=true \
MOCK_MAAS_CLIENT=true \
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
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/gen-ai/api/v1/namespaces"
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

**Mock Data Source:** Hardcoded in `internal/integrations/kubernetes/k8smocks/token_k8s_client_mock.go`

#### Get LlamaStack Distribution Status (Mock K8s)

**Request:**

```bash
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/gen-ai/api/v1/llamastack-distribution/status?namespace=test-namespace"
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "name": "mock-lsd",
    "phase": "Ready",
    "version": "v0.2.0",
    "distributionConfig": {
      "activeDistribution": "mock-distribution",
      "availableDistributions": {
        "mock-distribution": "mock-image:latest"
      },
      "providers": [
        {
          "api": "mock-api",
          "provider_id": "mock-provider",
          "provider_type": "mock-type",
          "config": null,
          "health": {
            "status": "",
            "message": ""
          }
        }
      ]
    }
  }
}
```

**Mock Data Source:** Hardcoded in `internal/integrations/kubernetes/k8smocks/token_k8s_client_mock.go`

### Testing Mock LlamaStack Endpoints

#### List Models (Mock LS)

**Request:**

```bash
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/gen-ai/api/v1/models"
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
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/gen-ai/api/v1/vectorstores"
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
  "http://localhost:8080/gen-ai/api/v1/responses" \
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

### Testing Mock MCP Endpoints

#### List MCP Servers (Mock MCP)

**Request:**

```bash
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/gen-ai/api/v1/aa/mcps?namespace=default"
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "servers": [
      {
        "name": "mock-brave-server",
        "url": "http://localhost:9090/sse",
        "transport": "sse",
        "description": "Mock Brave Search MCP server",
        "logo": null,
        "status": "healthy"
      },
      {
        "name": "mock-kubernetes-server",
        "url": "http://localhost:9091/mcp",
        "transport": "streamable-http",
        "description": "Mock Kubernetes MCP server",
        "logo": "https://kubernetes.io/images/flower.svg",
        "status": "healthy"
      }
    ],
    "total_count": 2,
    "config_map_info": {
      "name": "mock-mcp-config",
      "namespace": "mock-namespace",
      "last_updated": "2025-01-21T10:00:00Z"
    }
  }
}
```

#### Get MCP Server Status (Mock MCP)

**Request:**

```bash
SERVER_URL="http%3A%2F%2Flocalhost%3A9090%2Fsse"
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/gen-ai/api/v1/mcp/status?namespace=default&server_url=$SERVER_URL"
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "server_url": "http://localhost:9090/sse",
    "status": "connected",
    "message": "Mock: Successfully connected to MCP server",
    "last_checked": 1755721435,
    "server_info": {
      "name": "mock-brave-server",
      "version": "1.0.0-mock",
      "protocol_version": "2024-11-05"
    },
    "ping_response_time_ms": 25
  }
}
```

#### Get MCP Server Tools (Mock MCP)

**Request:**

```bash
SERVER_URL="http%3A%2F%2Flocalhost%3A9090%2Fsse"
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/gen-ai/api/v1/mcp/tools?namespace=default&server_url=$SERVER_URL"
```

**Expected Response (200 OK):**

```json
{
  "data": {
    "server_url": "http://localhost:9090/sse",
    "status": "success",
    "message": "Mock: Successfully retrieved tools from MCP server",
    "last_checked": 1755721435,
    "server_info": {
      "name": "mock-brave-server",
      "version": "1.0.0-mock",
      "protocol_version": "2024-11-05"
    },
    "tools_count": 2,
    "tools": [
      {
        "name": "mock_web_search",
        "description": "Mock web search tool",
        "input_schema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Search query"
            }
          },
          "required": ["query"]
        }
      },
      {
        "name": "mock_local_search",
        "description": "Mock local search tool",
        "input_schema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Local search query"
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

**Mock Data Source:** Hardcoded in `internal/integrations/mcp/mcpmocks/`

### Testing Mock MaaS Endpoints

#### List MaaS Models (Mock MaaS)

**Request:**

```bash
curl -i -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/gen-ai/api/v1/maas/models"
```

**Expected Response (200 OK):**

```json
{
  "object": "list",
  "data": [
    {
      "id": "llama-2-7b-chat",
      "object": "model",
      "created": 1672531200,
      "owned_by": "model-namespace",
      "ready": true,
      "url": "http://llama-2-7b-chat.openshift-ai-inference-tier-premium.svc.cluster.local"
    },
    {
      "id": "llama-2-13b-chat",
      "object": "model",
      "created": 1672531200,
      "owned_by": "model-namespace",
      "ready": true,
      "url": "http://llama-2-13b-chat.openshift-ai-inference-tier-premium.svc.cluster.local"
    },
    {
      "id": "mistral-7b-instruct",
      "object": "model",
      "created": 1672531200,
      "owned_by": "model-namespace",
      "ready": false,
      "url": "http://mistral-7b-instruct.openshift-ai-inference-tier-premium.svc.cluster.local"
    },
    {
      "id": "granite-7b-lab",
      "object": "model",
      "created": 1672531200,
      "owned_by": "model-namespace",
      "ready": true,
      "url": "http://granite-7b-lab.openshift-ai-inference-tier-premium.svc.cluster.local"
    }
  ]
}
```

#### Issue Token (Mock MaaS)

**Request:**

```bash
# Default TTL (4h)
curl -i -X POST -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/gen-ai/api/v1/maas/tokens"

# Custom TTL (Go duration format: ns, us, ms, s, m, h)
curl -i -X POST -H "Authorization: Bearer FAKE_BEARER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"expiration": "2h"}' \
     "http://localhost:8080/gen-ai/api/v1/maas/tokens"
```

**Expected Response (201 Created):**

```json
{
  "token": "maas-token-placeholder-67890",
  "expiresAt": 1735406400
}
```

#### Revoke All Tokens (Mock MaaS)

**Request:**

```bash
curl -i -X DELETE -H "Authorization: Bearer FAKE_BEARER_TOKEN" "http://localhost:8080/gen-ai/api/v1/maas/tokens"
```

**Expected Response (204 No Content):**

```http
HTTP/1.1 204 No Content
(empty body)
```

**Mock Data Source:** Hardcoded in `internal/integrations/maas/maasmocks/`

### Troubleshooting Mock Mode

**Common Issues:**

1. **"unknown test token" Error:**

   - Ensure you're using one of the valid mock tokens
   - Check that `MOCK_K8S_CLIENT=true` is set

2. **Still Getting Real Data:**

   - Verify environment variables are set correctly
   - Check BFF startup logs for "Using mocked Kubernetes client", "Using mock LlamaStack client", "Using mocked MCP client", or "Using mock MaaS client factory"
   - Restart BFF after changing mock settings

3. **Mock Data Not Matching Expected:**

   - Check the mock client source files for current mock data
   - Mock data is hardcoded and may be updated in newer versions

4. **MCP Server URL Encoding Issues:**
   - Ensure server URLs are properly URL-encoded when testing MCP endpoints
   - Use online URL encoder or shell command: `python3 -c "import urllib.parse; print(urllib.parse.quote('http://localhost:9090/sse', safe=''))"`

**Mock Data Locations:**

- **K8s Mock Data:** `internal/integrations/kubernetes/k8smocks/`
- **LS Mock Data:** `internal/integrations/llamastack/lsmocks/`
- **MCP Mock Data:** `internal/integrations/mcp/mcpmocks/`
- **MaaS Mock Data:** `internal/integrations/maas/maasmocks/`
