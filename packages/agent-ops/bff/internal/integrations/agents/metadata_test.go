package agents

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResolveAgentResourceType(t *testing.T) {
	t.Run("returns agent for OpenShell managed-by", func(t *testing.T) {
		labels := map[string]string{
			LabelOpenShellManagedBy: OpenShellManagedByValue,
		}
		assert.Equal(t, AgentTypeAgent, ResolveAgentResourceType(labels))
	})

	t.Run("ignores agent-type label without OpenShell managed-by", func(t *testing.T) {
		labels := map[string]string{
			LabelAgentType: AgentTypeAgent,
		}
		assert.Equal(t, "", ResolveAgentResourceType(labels))
	})

	t.Run("returns empty when no OpenShell discovery labels", func(t *testing.T) {
		assert.Equal(t, "", ResolveAgentResourceType(map[string]string{"foo": "bar"}))
	})
}
