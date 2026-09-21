package kubernetes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildSandboxEnvVarsIncludesAgentConfigSnapshot(t *testing.T) {
	const agentConfig = `{"apiVersion":"gen-ai.opendatahub.io/v1","kind":"AgentProfile"}`

	vars := buildSandboxEnvVars(SandboxCROptions{AgentConfigJSON: agentConfig}, "pgvector", "pgvector-secret")

	for _, raw := range vars {
		variable := raw.(map[string]interface{})
		if variable["name"] == "AGENT_CONFIG_JSON" {
			assert.Equal(t, agentConfig, variable["value"])
			return
		}
	}
	t.Fatal("AGENT_CONFIG_JSON not found")
}

func TestBuildSandboxEnvVarsIncludesMCPServerConfiguration(t *testing.T) {
	vars := buildSandboxEnvVars(SandboxCROptions{
		MCPServersJSON: `[{"server_label":"github","server_url":"https://example.com/mcp","authorization_env_var":"MCP_AUTH_1"}]`,
		MCPAuthSecrets: []SandboxSecretEnvVar{{Name: "MCP_AUTH_1", SecretName: "agent-mcp-auth-1234"}},
	}, "pgvector", "pgvector-secret")

	values := make(map[string]map[string]interface{})
	for _, raw := range vars {
		variable := raw.(map[string]interface{})
		values[variable["name"].(string)] = variable
	}
	assert.Contains(t, values["AGENT_MCP_SERVERS_JSON"]["value"], "github")
	assert.Equal(t, "agent-mcp-auth-1234", values["MCP_AUTH_1"]["valueFrom"].(map[string]interface{})["secretKeyRef"].(map[string]interface{})["name"])
}
