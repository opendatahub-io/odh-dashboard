package mapper

import (
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAgentDetailToRuntimeDetail(t *testing.T) {
	createdAt := "2026-05-12T16:00:03.214610Z"
	detail := &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:      "sample-support-agent",
			Namespace: "agent-ops-demo",
			Labels: map[string]string{
				agents.LabelAgentType: "agent",
			},
			Annotations: map[string]string{
				agents.AnnotationDescription: "Customer support agent",
			},
			CreationTimestamp: createdAt,
		},
		ReadyStatus:  "Ready",
		WorkloadType: "deployment",
		Status: map[string]any{
			"readyReplicas": float64(2),
			"conditions": []any{
				map[string]any{
					"type":               "Available",
					"status":             "True",
					"reason":             "MinimumReplicasAvailable",
					"message":            "Deployment has minimum availability.",
					"lastTransitionTime": createdAt,
				},
			},
		},
		Service: &agents.AgentService{
			Name: "sample-support-agent",
			Ports: []agents.AgentServicePort{
				{Name: "http", Port: 8080},
			},
		},
	}

	result := AgentDetailToRuntimeDetail(detail)
	require.NotNil(t, result)
	assert.Equal(t, "sample-support-agent", result.Name)
	assert.Equal(t, "agent-ops-demo", result.Namespace)
	assert.Equal(t, "Ready", result.WorkloadStatus)
	assert.Equal(t, "Ready", result.Runtime.Status)
	assert.Equal(t, "agent", result.Runtime.Type)
	assert.Equal(t, 2, result.PodCount)
	require.Len(t, result.ServiceEndpoints, 1)
	assert.Equal(t, "http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080", result.Runtime.EndpointURL)
}

func TestAgentSummaryToRuntime(t *testing.T) {
	item := agents.AgentSummary{
		Name:         "sample-support-agent",
		Namespace:    "agent-ops-demo",
		Description:  "desc",
		Status:       "Ready",
		ResourceType: "agent",
		CreatedAt:    "2026-05-12T16:00:03.214610Z",
	}

	runtime := AgentSummaryToRuntime(item)
	assert.Equal(t, "Ready", runtime.Status)
	assert.Equal(t, "agent", runtime.Type)
	assert.Equal(t, "", runtime.EndpointURL)
	assert.False(t, runtime.LastSyncTime.IsZero())
}

func TestParseTime(t *testing.T) {
	tm := ParseTime("2026-05-12T16:00:03.214610Z")
	assert.Equal(t, 2026, tm.Year())
	assert.True(t, ParseTime("").IsZero())
}
