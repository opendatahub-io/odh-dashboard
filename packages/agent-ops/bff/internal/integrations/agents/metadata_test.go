package agents

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResolveAgentResourceType(t *testing.T) {
	t.Run("prefers opendatahub agent type label", func(t *testing.T) {
		labels := map[string]string{
			LabelAgentType:          "tool",
			LabelOpenShellManagedBy: OpenShellManagedByValue,
		}
		assert.Equal(t, "tool", ResolveAgentResourceType(labels))
	})

	t.Run("defaults OpenShell managed-by to agent", func(t *testing.T) {
		labels := map[string]string{
			LabelOpenShellManagedBy: OpenShellManagedByValue,
		}
		assert.Equal(t, AgentTypeAgent, ResolveAgentResourceType(labels))
	})

	t.Run("returns empty when no discovery labels", func(t *testing.T) {
		assert.Equal(t, "", ResolveAgentResourceType(map[string]string{"foo": "bar"}))
	})
}
