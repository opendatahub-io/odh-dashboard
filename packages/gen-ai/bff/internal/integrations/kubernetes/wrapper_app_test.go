package kubernetes_test

import (
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
)

func TestGenerateWrapperAppScript_ContainsRequiredElements(t *testing.T) {
	script := kubernetes.GenerateWrapperAppScript()

	assert.NotEmpty(t, script)

	// Directory bootstrap before create_app
	assert.Contains(t, script, `/opt/app-root/.llama/providers.d`)
	assert.Contains(t, script, `/opt/app-root/src/.llama/distributions/rh/files`)
	assert.Contains(t, script, `os.makedirs`)

	// OGX import (not llama_stack)
	assert.Contains(t, script, `from ogx.core.server.server import create_app`)
	assert.NotContains(t, script, `llama_stack`)

	// MaaS token middleware
	assert.Contains(t, script, `MaaSTokenMiddleware`)
	assert.Contains(t, script, `x-ogx-provider-data`)
	assert.Contains(t, script, `openai_api_key`)
	assert.Contains(t, script, `/v1/api-keys`)
	assert.Contains(t, script, `ephemeral`)
	assert.Contains(t, script, `MAAS_HTTP_CLIENT = httpx.AsyncClient()`)
	assert.NotContains(t, script, `verify=False`)
	assert.Contains(t, script, `MAX_TOKEN_CACHE_ENTRIES = 1024`)
	assert.Contains(t, script, `asyncio.Lock()`)
	assert.Contains(t, script, `header[0].lower() != b"x-ogx-provider-data"`)
	assert.Contains(t, script, `await _send_json(send, 401, {"detail": "Unauthorized"})`)

	// Token cache with expiry parsed from expiresAt
	assert.Contains(t, script, `expiresAt`)

	// Env vars — not hardcoded
	assert.Contains(t, script, `MAAS_GATEWAY_URL`)
	assert.Contains(t, script, `MAAS_SUBSCRIPTION`)
	assert.Contains(t, script, `AGENT_MODEL_SOURCE_TYPE`)
	assert.Contains(t, script, `if AGENT_MODEL_SOURCE_TYPE == "maas":`)
	assert.Contains(t, script, `elif AGENT_MODEL_SOURCE_TYPE == "custom_endpoint":`)
	assert.Contains(t, script, `elif AGENT_MODEL_SOURCE_TYPE == "namespace":`)
	assert.Contains(t, script, `AGENT_MODEL_API_KEY`)
	assert.Contains(t, script, `sanitized_headers`)
	assert.Contains(t, script, `"detail": "Unsupported model source type"`)

	// Every HTTP endpoint is authorized against the caller's access to this exact Sandbox
	// before model credentials, MCP credentials, or the profile snapshot are made available.
	assert.Contains(t, script, `SandboxAuthorizationMiddleware`)
	assert.Contains(t, script, `selfsubjectaccessreviews`)
	assert.Contains(t, script, `KUBERNETES_CA_PATH`)
	assert.Contains(t, script, `KUBERNETES_SERVICE_PORT_HTTPS`)
	assert.Contains(t, script, `AGENT_NAMESPACE`)
	assert.Contains(t, script, `AGENT_SANDBOX_NAME`)
	assert.Contains(t, script, `"group": "agents.x-k8s.io"`)
	assert.Contains(t, script, `"resource": "sandboxes"`)
	assert.Contains(t, script, `"verb": "get"`)
	assert.Contains(t, script, `e.response.status_code == 403`)

	// Agent config snapshot endpoint is protected by the outer authorization middleware.
	assert.Contains(t, script, `AGENT_CONFIG_JSON`)
	assert.Contains(t, script, `AgentConfigMiddleware`)
	assert.Contains(t, script, `"/internal/agent_config"`)
	assert.Contains(t, script, `auth.startswith("Bearer ")`)
	assert.Contains(t, script, `"application/json"`)

	// Selected MCP servers are injected into every OGX Responses API request.
	assert.Contains(t, script, `AGENT_OGX_MODEL_ID`)
	assert.Contains(t, script, `request["model"] = AGENT_OGX_MODEL_ID`)
	assert.Contains(t, script, `AGENT_SYSTEM_PROMPT`)
	assert.Contains(t, script, `request["instructions"] = AGENT_SYSTEM_PROMPT`)
	assert.Contains(t, script, `AGENT_MCP_SERVERS_JSON`)
	assert.Contains(t, script, `json.loads(os.environ.get("AGENT_MCP_SERVERS_JSON", "[]")) or []`)
	assert.Contains(t, script, `AGENT_VECTOR_STORE_IDS_JSON`)
	assert.Contains(t, script, `json.loads(os.environ.get("AGENT_VECTOR_STORE_IDS_JSON", "[]")) or []`)
	assert.Contains(t, script, `MCPServerMiddleware`)
	assert.Contains(t, script, `"/v1/responses"`)
	assert.Contains(t, script, `if body_size > 20 * 1024 * 1024:`)
	assert.Contains(t, script, `if message["type"] == "http.disconnect":`)
	assert.Contains(t, script, `body = b"".join(chunks)`)
	assert.Contains(t, script, `Request body must be a JSON object`)
	assert.Contains(t, script, `if tools is None:`)
	assert.Contains(t, script, `tools must be an array`)
	assert.Contains(t, script, `Unable to configure agent tools`)
	assert.Contains(t, script, `"type": "mcp"`)
	assert.Contains(t, script, `"authorization"] = os.environ[auth_env_var]`)
	assert.Contains(t, script, `"allowed_tools"] = server["allowed_tools"]`)
	assert.Contains(t, script, `"type": "file_search"`)
	assert.Contains(t, script, `"vector_store_ids": VECTOR_STORE_IDS`)

	// create_app synchronous + uvicorn on port 8321
	assert.Contains(t, script, `create_app()`)
	assert.Contains(t, script, `SandboxAuthorizationMiddleware(AgentConfigMiddleware(MaaSTokenMiddleware(MCPServerMiddleware(ogx_app))))`)
	assert.Contains(t, script, `uvicorn`)
	assert.Contains(t, script, `8321`)
}
