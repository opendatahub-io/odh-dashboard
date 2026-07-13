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
				DisplayName:  "Sample Support Agent",
				Description:  "Customer support agent that triages tickets and drafts responses.",
				Framework:    "langgraph",
				Status:       "ready",
				ResourceType: "agent",
				WorkloadType: agents.WorkloadTypeSandbox,
				ServiceFQDN:  "sample-support-agent.agent-ops-demo.svc.cluster.local",
				Ports: []agents.AgentServicePort{
					{Name: "http", Port: 8080},
				},
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
					agents.LabelOpenShellManagedBy:     agents.OpenShellManagedByValue,
					agents.LabelProtocolPrefix + "a2a": "",
					"app.kubernetes.io/name":           "sample-support-agent",
				},
				Annotations: map[string]string{
					agents.AnnotationDisplayName: "Sample Support Agent",
					agents.AnnotationDescription: "Customer support agent that triages tickets and drafts responses.",
					agents.AnnotationFramework:   "langgraph",
				},
				CreationTimestamp: "2026-05-12T16:00:03.214610Z",
				UID:               "7c9e6679-7425-40de-944b-e07fc1f90ae7",
			},
			DisplayName:    "Sample Support Agent",
			Framework:      "langgraph",
			ContainerImage: "quay.io/example/support-agent:latest",
			ServiceFQDN:    "sample-support-agent.agent-ops-demo.svc.cluster.local",
			ReadyStatus:    "ready",
			WorkloadType:   agents.WorkloadTypeSandbox,
			Status: map[string]any{
				"phase":       "ready",
				"serviceFQDN": "sample-support-agent.agent-ops-demo.svc.cluster.local",
				"conditions": []any{
					map[string]any{
						"type":               "Ready",
						"status":             "True",
						"reason":             "SandboxReady",
						"message":            "Sandbox is ready.",
						"lastTransitionTime": "2026-05-12T16:00:03.214610Z",
					},
				},
			},
			Spec: map[string]any{
				"podTemplate": map[string]any{
					"spec": map[string]any{
						"serviceAccountName": "default",
						"containers": []any{
							map[string]any{
								"name":  "agent",
								"image": "quay.io/example/support-agent:latest",
								"ports": []any{
									map[string]any{"name": "http", "containerPort": int64(8080)},
								},
							},
						},
					},
				},
			},
			Service: &agents.AgentService{
				Name: "sample-support-agent",
				Ports: []agents.AgentServicePort{
					{Name: "http", Port: 8080},
				},
			},
			ServiceAccountName: "default",
		},
	}
	return client
}
