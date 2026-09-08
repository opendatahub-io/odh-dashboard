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
