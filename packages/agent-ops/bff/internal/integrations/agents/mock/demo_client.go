package mock

import (
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
)

// NewDemoClient returns a mock client preloaded with sample agent data for local dev and tests.
func NewDemoClient() *Client {
	client := NewClient()
	client.Namespaces = []string{"agent-ops-demo"}
	client.Agents = map[string][]agents.AgentSummary{
		"agent-ops-demo": {
			{
				Name:         "sample-support-agent",
				Namespace:    "agent-ops-demo",
				Description:  "Customer support agent that triages tickets and drafts responses.",
				Status:       "Ready",
				ResourceType: "agent",
				WorkloadType: "deployment",
				EndpointURL:  "http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080",
				CreatedAt:    "2026-05-12T16:00:03.214610Z",
			},
		},
	}
	client.Details = map[string]agents.AgentDetail{
		"agent-ops-demo/sample-support-agent": {
			Metadata: agents.AgentMetadata{
				Name:      "sample-support-agent",
				Namespace: "agent-ops-demo",
				Labels: map[string]string{
					agents.LabelAgentType: "agent",
				},
				Annotations: map[string]string{
					agents.AnnotationDescription: "Customer support agent that triages tickets and drafts responses.",
				},
				CreationTimestamp: "2026-05-12T16:00:03.214610Z",
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
						"lastTransitionTime": "2026-05-12T16:00:03.214610Z",
					},
				},
			},
			Service: &agents.AgentService{
				Name: "sample-support-agent",
				Ports: []agents.AgentServicePort{
					{Name: "http", Port: 8080},
				},
			},
		},
	}
	return client
}
