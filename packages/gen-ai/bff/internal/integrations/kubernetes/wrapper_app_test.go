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

	// Token cache with expiry parsed from expiresAt
	assert.Contains(t, script, `expiresAt`)

	// Env vars — not hardcoded
	assert.Contains(t, script, `MAAS_GATEWAY_URL`)
	assert.Contains(t, script, `MAAS_SUBSCRIPTION`)

	// Agent config snapshot endpoint is authenticated before it returns data.
	assert.Contains(t, script, `AGENT_CONFIG_JSON`)
	assert.Contains(t, script, `AgentConfigMiddleware`)
	assert.Contains(t, script, `"/internal/agent_config"`)
	assert.Contains(t, script, `auth.startswith("Bearer ")`)
	assert.Contains(t, script, `token validation failed`)
	assert.Contains(t, script, `"application/json"`)

	// Selected MCP servers are injected into every OGX Responses API request.
	assert.Contains(t, script, `AGENT_OGX_MODEL_ID`)
	assert.Contains(t, script, `request["model"] = AGENT_OGX_MODEL_ID`)
	assert.Contains(t, script, `AGENT_SYSTEM_PROMPT`)
	assert.Contains(t, script, `request["instructions"] = AGENT_SYSTEM_PROMPT`)
	assert.Contains(t, script, `AGENT_MCP_SERVERS_JSON`)
	assert.Contains(t, script, `MCPServerMiddleware`)
	assert.Contains(t, script, `"/v1/responses"`)
	assert.Contains(t, script, `"type": "mcp"`)
	assert.Contains(t, script, `"authorization"] = os.environ[auth_env_var]`)
	assert.Contains(t, script, `"allowed_tools"] = server["allowed_tools"]`)

	// create_app synchronous + uvicorn on port 8321
	assert.Contains(t, script, `create_app()`)
	assert.Contains(t, script, `uvicorn`)
	assert.Contains(t, script, `8321`)
}
