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
					agents.LabelAgentType:              "agent",
					agents.LabelProtocolPrefix + "a2a": "",
					"app.kubernetes.io/name":           "sample-support-agent",
				},
				Annotations: map[string]string{
					agents.AnnotationDescription: "Customer support agent that triages tickets and drafts responses.",
				},
				CreationTimestamp: "2026-05-12T16:00:03.214610Z",
				UID:               "7c9e6679-7425-40de-944b-e07fc1f90ae7",
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
			Spec: map[string]any{
				"template": map[string]any{
					"spec": map[string]any{
						"serviceAccountName": "default",
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
			AgentCard: &agents.AgentCardObserved{
				Name:                 "Sample Support Agent",
				Description:          "Customer support agent that triages tickets and drafts responses.",
				Version:              "1.0.0",
				DocumentationURL:     "https://docs.example.com/agents/sample-support-agent",
				ProviderOrganization: "Red Hat OpenShift AI",
				ProviderURL:          "https://www.redhat.com/en/technologies/cloud-computing/openshift/ai",
				Streaming:            true,
				DefaultInputModes:    []string{"text/plain"},
				DefaultOutputModes:   []string{"text/plain"},
				Protocol:             "a2a",
				TransportSecurity:    "http",
				AuthBridgeMode:       "proxy-sidecar",
				LastCardFetchTime:    "2026-05-12T16:00:03.214610Z",
				LinkedSkills:         []string{"summarizer"},
				ExternalAgentCardURL: "https://sample-support-agent.apps.example.com/.well-known/agent-card.json",
				ToolConnections:      []string{"weather_"},
				Skills: []agents.AgentCardSkillObserved{
					{
						ID:          "triage-ticket",
						Name:        "Triage ticket",
						Description: "Classify and prioritize incoming support tickets.",
						Tags:        []string{"support"},
						Examples:    []string{"Triage this customer issue"},
						InputModes:  []string{"text/plain"},
						OutputModes: []string{"text/plain"},
					},
				},
			},
		},
	}
	return client
}
