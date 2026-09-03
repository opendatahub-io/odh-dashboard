package agents

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResolveAgentResourceType(t *testing.T) {
	t.Run("always returns agent", func(t *testing.T) {
		labels := map[string]string{
			LabelAgentType:  AgentTypeAgent,
			LabelManagedBy:  ManagedByValue,
			"arbitrary-key": "arbitrary-value",
		}
		assert.Equal(t, AgentTypeAgent, ResolveAgentResourceType(labels))
	})

	t.Run("returns agent with empty labels", func(t *testing.T) {
		assert.Equal(t, AgentTypeAgent, ResolveAgentResourceType(nil))
	})
}
