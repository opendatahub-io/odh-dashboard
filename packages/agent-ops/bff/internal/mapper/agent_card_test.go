package mapper

import (
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMapAgentCardDetail(t *testing.T) {
	detail := &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:      "sample-support-agent",
			Namespace: "agent-ops-demo",
			UID:       "7c9e6679-7425-40de-944b-e07fc1f90ae7",
			Labels: map[string]string{
				agents.LabelProtocolPrefix + "a2a": "",
			},
		},
		ServiceAccountName: "default",
		AgentCard: &agents.AgentCardObserved{
			Name:                 "Sample Support Agent",
			Description:          "Support agent",
			Version:              "1.0.0",
			ProviderOrganization: "Red Hat OpenShift AI",
			DocumentationURL:     "https://docs.example.com/agents/sample-support-agent",
			Streaming:            true,
			DefaultInputModes:    []string{"text/plain"},
			DefaultOutputModes:   []string{"text/plain"},
			Protocol:             "a2a",
			TransportSecurity:    "http",
			AuthBridgeMode:       "proxy-sidecar",
			LastCardFetchTime:    "2026-05-12T16:00:03.214610Z",
			Skills: []agents.AgentCardSkillObserved{
				{
					ID:   "triage-ticket",
					Name: "Triage ticket",
					Tags: []string{"support"},
				},
			},
		},
	}

	endpoints := []models.AgentServiceEndpoint{
		{
			Name: "http",
			URL:  "http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080",
			Port: 8080,
		},
	}

	card := MapAgentCardDetail(detail, endpoints)
	require.NotNil(t, card)
	assert.Equal(t, "Sample Support Agent", card.Name)
	assert.Equal(t, "1.0.0", card.Version)
	assert.Equal(t, "http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json", card.AgentCardURL)
	assert.Equal(t, []string{"A2A", "HTTP"}, card.Protocols)
	assert.Equal(t, []string{"Bearer"}, card.AuthenticationMethods)
	assert.Equal(t, []string{}, card.ToolConnections)
	assert.Equal(t, "7c9e6679-7425-40de-944b-e07fc1f90ae7", card.UUID)
	assert.Equal(t, "spiffe://cluster.local/ns/agent-ops-demo/sa/default", card.SpiffeID)
	require.Len(t, card.Skills, 1)
	assert.True(t, card.Capabilities.Streaming)
	require.NotNil(t, card.LastFetchTime)
}

func TestMapAgentCardDetailNilWhenUnavailable(t *testing.T) {
	assert.Nil(t, MapAgentCardDetail(nil, nil))
	assert.Nil(t, MapAgentCardDetail(&agents.AgentDetail{}, nil))
}

func TestAgentDetailToRuntimeDetailIncludesAgentCard(t *testing.T) {
	detail := &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:      "sample-support-agent",
			Namespace: "agent-ops-demo",
			Labels: map[string]string{
				agents.LabelAgentType: "agent",
			},
			CreationTimestamp: "2026-05-12T16:00:03.214610Z",
		},
		ReadyStatus: "Ready",
		Status: map[string]any{
			"readyReplicas": float64(1),
		},
		Service: &agents.AgentService{
			Name:  "sample-support-agent",
			Ports: []agents.AgentServicePort{{Name: "http", Port: 8080}},
		},
		AgentCard: &agents.AgentCardObserved{
			Name:        "Sample Support Agent",
			Description: "From card",
			Version:     "1.0.0",
			Protocol:    "a2a",
		},
	}

	result := AgentDetailToRuntimeDetail(detail)
	require.NotNil(t, result.AgentCard)
	assert.Equal(t, "From card", result.Description)
	assert.Equal(t, "Sample Support Agent", result.AgentCard.Name)
}

func TestDiscoverAuthenticationMethods(t *testing.T) {
	assert.Equal(t, []string{"mTLS"}, discoverAuthenticationMethods(&agents.AgentCardObserved{
		TransportSecurity: "mtls",
		AuthBridgeMode:    "disabled",
	}))
	assert.Equal(t, []string{"Bearer"}, discoverAuthenticationMethods(&agents.AgentCardObserved{
		TransportSecurity: "http",
		AuthBridgeMode:    "proxy-sidecar",
	}))
	assert.Equal(t, []string{"mTLS", "Bearer"}, discoverAuthenticationMethods(&agents.AgentCardObserved{
		TransportSecurity:                 "mtls",
		SupportsAuthenticatedExtendedCard: true,
		AuthBridgeMode:                    "proxy-sidecar",
	}))
	assert.Equal(t, []string{}, discoverAuthenticationMethods(&agents.AgentCardObserved{
		TransportSecurity: "http",
		AuthBridgeMode:    "",
	}))
	assert.Equal(t, []string{}, discoverAuthenticationMethods(&agents.AgentCardObserved{
		TransportSecurity: "http",
		AuthBridgeMode:    "Disabled",
	}))
	assert.Equal(t, []string{"Bearer"}, discoverAuthenticationMethods(&agents.AgentCardObserved{
		SupportsAuthenticatedExtendedCard: true,
		AuthBridgeMode:                    "",
	}))
}

func TestBuildAgentCardDiscoveryURL(t *testing.T) {
	url := BuildAgentCardDiscoveryURL([]models.AgentServiceEndpoint{
		{Name: "http", Port: 8080, URL: "http://agent.ns.svc.cluster.local:8080"},
	})
	assert.Equal(t, "http://agent.ns.svc.cluster.local:8080/.well-known/agent-card.json", url)
}

func TestBuildAgentCardDiscoveryURLPrefersHTTPPort(t *testing.T) {
	url := BuildAgentCardDiscoveryURL([]models.AgentServiceEndpoint{
		{Name: "metrics", Port: 9090, URL: "http://agent.ns.svc.cluster.local:9090"},
		{Name: "http", Port: 8080, URL: "http://agent.ns.svc.cluster.local:8080"},
	})
	assert.Equal(t, "http://agent.ns.svc.cluster.local:8080/.well-known/agent-card.json", url)
}

func TestAgentCardURLFromCardField(t *testing.T) {
	assert.Equal(t,
		"https://agent.example.com/.well-known/agent-card.json",
		agentCardURLFromCardField("https://agent.example.com"),
	)
	assert.Equal(t,
		"https://agent.example.com/.well-known/agent-card.json",
		agentCardURLFromCardField("https://agent.example.com/.well-known/agent-card.json"),
	)
}

func TestMapAgentCardDetailWithEnrichmentOnly(t *testing.T) {
	detail := &agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:      "sample-support-agent",
			Namespace: "agent-ops-demo",
			UID:       "7c9e6679-7425-40de-944b-e07fc1f90ae7",
		},
		AgentCard: &agents.AgentCardObserved{
			ExternalAgentCardURL: "https://sample-support-agent.apps.example.com/.well-known/agent-card.json",
			ToolConnections:      []string{"gitlab-mcp"},
		},
	}

	card := MapAgentCardDetail(detail, nil)
	require.NotNil(t, card)
	assert.Equal(t, "https://sample-support-agent.apps.example.com/.well-known/agent-card.json", card.ExternalAgentCardURL)
	assert.Equal(t, []string{"gitlab-mcp"}, card.ToolConnections)
}
