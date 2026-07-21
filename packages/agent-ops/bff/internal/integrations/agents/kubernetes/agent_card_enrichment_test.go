package kubernetes

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/dynamic"
	fakedynamic "k8s.io/client-go/dynamic/fake"
)

type enrichmentK8sClient struct {
	permissiveK8sClient
	access     k8s.AgentCardEnrichmentAccess
	accessErr  error
	dynamic    dynamic.Interface
	dynamicErr error
}

func (c *enrichmentK8sClient) CanAccessAgentCardEnrichment(context.Context, *k8s.RequestIdentity, string) (k8s.AgentCardEnrichmentAccess, error) {
	return c.access, c.accessErr
}

func (c *enrichmentK8sClient) DynamicClient() (dynamic.Interface, error) {
	if c.dynamicErr != nil {
		return nil, c.dynamicErr
	}
	if c.dynamic != nil {
		return c.dynamic, nil
	}
	return c.permissiveK8sClient.DynamicClient()
}

func newEnrichmentTestClient(t *testing.T, dynamicClient dynamic.Interface, access k8s.AgentCardEnrichmentAccess, accessErr error) *Client {
	t.Helper()

	return &Client{
		k8sClient: &enrichmentK8sClient{
			permissiveK8sClient: permissiveK8sClient{
				SharedClientLogic: k8s.SharedClientLogic{
					Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
				},
				dynamicClient: dynamicClient,
			},
			access:    access,
			accessErr: accessErr,
			dynamic:   dynamicClient,
		},
		identity: &k8s.RequestIdentity{UserID: "test-user"},
		logger:   slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func TestEnrichAgentCardSkipsWhenAccessCheckFails(t *testing.T) {
	client := newEnrichmentTestClient(t, nil, k8s.AgentCardEnrichmentAccess{}, errors.New("sar failed"))
	detail := &agents.AgentDetail{}

	client.enrichAgentCard(context.Background(), "demo-ns", "my-agent", detail)
	assert.Nil(t, detail.AgentCard)
}

func TestEnrichAgentCardSkipsWhenDynamicClientUnavailable(t *testing.T) {
	client := newEnrichmentTestClient(t, nil, k8s.AgentCardEnrichmentAccess{Routes: true, MCPServers: true}, nil)
	client.k8sClient = &enrichmentK8sClient{
		permissiveK8sClient: permissiveK8sClient{},
		access:              k8s.AgentCardEnrichmentAccess{Routes: true, MCPServers: true},
		dynamicErr:          errors.New("dynamic unavailable"),
	}
	detail := &agents.AgentDetail{}

	client.enrichAgentCard(context.Background(), "demo-ns", "my-agent", detail)
	assert.Nil(t, detail.AgentCard)
}

func TestEnrichAgentCardPartialAccessRoutesOnly(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	route := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "route.openshift.io/v1",
		"kind":       "Route",
		"metadata":   map[string]any{"name": agentName, "namespace": namespace},
		"spec": map[string]any{
			"host": "sample-support-agent.apps.example.com",
			"to": map[string]any{
				"kind": "Service",
				"name": agentName,
			},
			"tls": map[string]any{"termination": "edge"},
		},
	}}

	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	_, err := dynamicClient.Resource(openshiftRouteGVR).Namespace(namespace).Create(context.Background(), route, metav1.CreateOptions{})
	require.NoError(t, err)

	client := newEnrichmentTestClient(t, dynamicClient, k8s.AgentCardEnrichmentAccess{Routes: true}, nil)
	detail := &agents.AgentDetail{
		Service: &agents.AgentService{Name: agentName},
	}

	client.enrichAgentCard(context.Background(), namespace, agentName, detail)
	require.NotNil(t, detail.AgentCard)
	assert.Equal(t, "https://sample-support-agent.apps.example.com/.well-known/agent-card.json", detail.AgentCard.ExternalAgentCardURL)
	assert.Empty(t, detail.AgentCard.ToolConnections)
}

func TestEnrichAgentCardSkipsWhenOnlyMCPAccess(t *testing.T) {
	namespace := "agent-ops-demo"
	agentName := "sample-support-agent"

	mcp := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "mcp.kuadrant.io/v1alpha1",
		"kind":       "MCPServerRegistration",
		"metadata":   map[string]any{"name": "tool-a", "namespace": namespace},
		"spec": map[string]any{
			"serverName": "tool-a",
		},
	}}

	dynamicClient := fakedynamic.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), defaultGVRListKinds())
	_, err := dynamicClient.Resource(mcpServerRegistrationGVR).Namespace(namespace).Create(context.Background(), mcp, metav1.CreateOptions{})
	require.NoError(t, err)

	client := newEnrichmentTestClient(t, dynamicClient, k8s.AgentCardEnrichmentAccess{MCPServers: true}, nil)
	detail := &agents.AgentDetail{
		Service: &agents.AgentService{Name: agentName},
	}

	client.enrichAgentCard(context.Background(), namespace, agentName, detail)
	assert.Nil(t, detail.AgentCard)
}

func TestServiceAccountFromSpec(t *testing.T) {
	t.Run("reads podTemplate service account", func(t *testing.T) {
		spec := map[string]any{
			"podTemplate": map[string]any{
				"spec": map[string]any{
					"serviceAccountName": "agent-sa",
				},
			},
		}
		assert.Equal(t, "agent-sa", serviceAccountFromSpec(spec))
	})

	t.Run("falls back to template service account", func(t *testing.T) {
		spec := map[string]any{
			"template": map[string]any{
				"spec": map[string]any{
					"serviceAccountName": "legacy-sa",
				},
			},
		}
		assert.Equal(t, "legacy-sa", serviceAccountFromSpec(spec))
	})

	t.Run("returns empty for nil spec", func(t *testing.T) {
		assert.Equal(t, "", serviceAccountFromSpec(nil))
	})
}
