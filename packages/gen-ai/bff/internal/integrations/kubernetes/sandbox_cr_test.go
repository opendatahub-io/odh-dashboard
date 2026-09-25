package kubernetes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildSandboxEnvVarsIncludesAgentConfigSnapshot(t *testing.T) {
	const agentConfig = `{"apiVersion":"gen-ai.opendatahub.io/v1","kind":"AgentProfile"}`

	vars := buildSandboxEnvVars(SandboxCROptions{AgentConfigJSON: agentConfig}, "test-namespace", "pgvector", "pgvector-secret")

	for _, raw := range vars {
		variable := raw.(map[string]interface{})
		if variable["name"] == "AGENT_CONFIG_JSON" {
			assert.Equal(t, agentConfig, variable["value"])
			return
		}
	}
	t.Fatal("AGENT_CONFIG_JSON not found")
}

func TestBuildSandboxEnvVarsIncludesResolvedSystemPrompt(t *testing.T) {
	const systemPrompt = "You are a concise assistant."

	vars := buildSandboxEnvVars(SandboxCROptions{SystemPrompt: systemPrompt}, "test-namespace", "pgvector", "pgvector-secret")

	for _, raw := range vars {
		variable := raw.(map[string]interface{})
		if variable["name"] == "AGENT_SYSTEM_PROMPT" {
			assert.Equal(t, systemPrompt, variable["value"])
			return
		}
	}
	t.Fatal("AGENT_SYSTEM_PROMPT not found")
}

func TestBuildSandboxEnvVarsIncludesOGXModelID(t *testing.T) {
	const modelID = "passthrough-llm/openai-gpt-4o-mini"

	vars := buildSandboxEnvVars(SandboxCROptions{OGXModelID: modelID}, "test-namespace", "pgvector", "pgvector-secret")

	for _, raw := range vars {
		variable := raw.(map[string]interface{})
		if variable["name"] == "AGENT_OGX_MODEL_ID" {
			assert.Equal(t, modelID, variable["value"])
			return
		}
	}
	t.Fatal("AGENT_OGX_MODEL_ID not found")
}

func TestBuildSandboxEnvVarsIncludesModelSourceType(t *testing.T) {
	const sourceType = "maas"

	vars := buildSandboxEnvVars(SandboxCROptions{ModelSourceType: sourceType}, "test-namespace", "pgvector", "pgvector-secret")

	for _, raw := range vars {
		variable := raw.(map[string]interface{})
		if variable["name"] == "AGENT_MODEL_SOURCE_TYPE" {
			assert.Equal(t, sourceType, variable["value"])
			return
		}
	}
	t.Fatal("AGENT_MODEL_SOURCE_TYPE not found")
}

func TestBuildSandboxEnvVarsIncludesCustomModelCredential(t *testing.T) {
	vars := buildSandboxEnvVars(SandboxCROptions{
		ModelAuthSecret: &SandboxSecretEnvVar{Name: "AGENT_MODEL_API_KEY", SecretName: "agent-model-auth-1234"},
	}, "test-namespace", "pgvector", "pgvector-secret")

	for _, raw := range vars {
		variable := raw.(map[string]interface{})
		if variable["name"] == "AGENT_MODEL_API_KEY" {
			secretRef := variable["valueFrom"].(map[string]interface{})["secretKeyRef"].(map[string]interface{})
			assert.Equal(t, "agent-model-auth-1234", secretRef["name"])
			assert.Equal(t, sandboxMCPAuthSecretKey, secretRef["key"])
			return
		}
	}
	t.Fatal("AGENT_MODEL_API_KEY not found")
}

func TestBuildSandboxEnvVarsIncludesMCPServerConfiguration(t *testing.T) {
	vars := buildSandboxEnvVars(SandboxCROptions{
		MCPServersJSON: `[{"server_label":"github","server_url":"https://example.com/mcp","authorization_env_var":"MCP_AUTH_1"}]`,
		MCPAuthSecrets: []SandboxSecretEnvVar{{Name: "MCP_AUTH_1", SecretName: "agent-mcp-auth-1234"}},
	}, "test-namespace", "pgvector", "pgvector-secret")

	values := make(map[string]map[string]interface{})
	for _, raw := range vars {
		variable := raw.(map[string]interface{})
		values[variable["name"].(string)] = variable
	}
	assert.Contains(t, values["AGENT_MCP_SERVERS_JSON"]["value"], "github")
	assert.Equal(t, "agent-mcp-auth-1234", values["MCP_AUTH_1"]["valueFrom"].(map[string]interface{})["secretKeyRef"].(map[string]interface{})["name"])
}

func TestBuildSandboxEnvVarsIncludesVectorStoreIDs(t *testing.T) {
	const vectorStoreIDs = `["vs-a","vs-b"]`

	vars := buildSandboxEnvVars(SandboxCROptions{VectorStoreIDsJSON: vectorStoreIDs}, "test-namespace", "pgvector", "pgvector-secret")

	for _, raw := range vars {
		variable := raw.(map[string]interface{})
		if variable["name"] == "AGENT_VECTOR_STORE_IDS_JSON" {
			assert.Equal(t, vectorStoreIDs, variable["value"])
			return
		}
	}
	t.Fatal("AGENT_VECTOR_STORE_IDS_JSON not found")
}

func TestBuildSandboxEnvVarsIncludesSandboxAuthorizationTarget(t *testing.T) {
	vars := buildSandboxEnvVars(
		SandboxCROptions{Name: "test-agent"},
		"test-namespace",
		"pgvector",
		"pgvector-secret",
	)

	values := make(map[string]string)
	for _, raw := range vars {
		variable := raw.(map[string]interface{})
		if value, ok := variable["value"].(string); ok {
			values[variable["name"].(string)] = value
		}
	}

	assert.Equal(t, "test-namespace", values["AGENT_NAMESPACE"])
	assert.Equal(t, "test-agent", values["AGENT_SANDBOX_NAME"])
}
