package k8smocks

import (
	"context"
	"log/slog"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"

	// Import the typed LlamaStackDistribution types
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
)

type TokenKubernetesClientMock struct {
	*k8s.TokenKubernetesClient
}

func newMockedTokenKubernetesClientFromClientset(ctrlClient client.Client, config *rest.Config, logger *slog.Logger) k8s.KubernetesClientInterface {
	return &TokenKubernetesClientMock{
		TokenKubernetesClient: &k8s.TokenKubernetesClient{
			Client: ctrlClient,
			Logger: logger,
			Token:  integrations.NewBearerToken(""), // Unused because impersonation is already handled in the client config
			Config: config,
		},
	}
}

// BearerToken always returns a fake token for tests
func (m *TokenKubernetesClientMock) BearerToken() (string, error) {
	return "FAKE_BEARER_TOKEN", nil
}

// GetNamespaces returns mock namespace data for testing
func (m *TokenKubernetesClientMock) GetNamespaces(ctx context.Context, identity *integrations.RequestIdentity) ([]corev1.Namespace, error) {
	// Return mock test namespaces instead of real cluster data
	return []corev1.Namespace{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name: "mock-test-namespace-1",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name: "mock-test-namespace-2",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name: "mock-test-namespace-3",
			},
		},
	}, nil
}

// GetAAModels returns mock AA models for testing
func (m *TokenKubernetesClientMock) GetAAModels(ctx context.Context, identity *integrations.RequestIdentity, namespace string) ([]genaiassets.AAModel, error) {
	// Return mock AA models for testing
	return []genaiassets.AAModel{
		{
			ModelName:      "mock-model-1",
			ServingRuntime: "OpenVINO Model Server",
			APIProtocol:    "v2",
			Version:        "v2025.1",
			Description:    "A high-performance computer vision model for object detection and classification",
			Usecase:        "Computer Vision",
			Endpoints: []string{
				"internal: http://mock-model-1.namespace.svc.cluster.local:8080",
				"external: https://mock-model-1.example.com",
			},
		},
		{
			ModelName:      "mock-model-2",
			ServingRuntime: "TorchServe",
			APIProtocol:    "v1",
			Version:        "v2025.1",
			Description:    "A natural language processing model for text generation and completion",
			Usecase:        "Natural Language Processing",
			Endpoints: []string{
				"internal: http://mock-model-2.namespace.svc.cluster.local:8080",
			},
		},
	}, nil
}

// IsClusterAdmin returns mock admin status for testing
func (m *TokenKubernetesClientMock) IsClusterAdmin(ctx context.Context, identity *integrations.RequestIdentity) (bool, error) {
	// TODO: Fix this when rbac specific tests are implemented.
	return false, nil
}

// GetUser returns mock username for testing
func (m *TokenKubernetesClientMock) GetUser(ctx context.Context, identity *integrations.RequestIdentity) (string, error) {
	return "mockUser", nil
}

// GetLlamaStackDistributions returns mock LSD list for testing
func (m *TokenKubernetesClientMock) GetLlamaStackDistributions(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*lsdapi.LlamaStackDistributionList, error) {
	// Return empty list for mock-test-namespace-1 to test empty state
	if namespace == "mock-test-namespace-1" {
		return &lsdapi.LlamaStackDistributionList{
			Items: []lsdapi.LlamaStackDistribution{},
		}, nil
	}

	// For all other namespaces, return mock LSD data
	return &lsdapi.LlamaStackDistributionList{
		Items: []lsdapi.LlamaStackDistribution{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name: "mock-lsd",
				},
				Status: lsdapi.LlamaStackDistributionStatus{
					Phase: lsdapi.LlamaStackDistributionPhaseReady,
					Version: lsdapi.VersionInfo{
						LlamaStackServerVersion: "v0.2.0",
					},
					DistributionConfig: lsdapi.DistributionConfig{
						ActiveDistribution: "mock-distribution",
						Providers: []lsdapi.ProviderInfo{
							{
								ProviderID:   "mock-provider",
								ProviderType: "mock-type",
								API:          "mock-api",
							},
						},
						AvailableDistributions: map[string]string{
							"mock-distribution": "mock-image:latest",
						},
					},
				},
			},
		},
	}, nil
}

func (m *TokenKubernetesClientMock) GetConfigMap(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*corev1.ConfigMap, error) {
	// Return mock ConfigMap for testing
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Data: map[string]string{
			"brave": `{
  "url": "http://localhost:9090/sse",
  "transport": "sse",
  "description": "Search the Internet using Brave Search."
}`,
			"kubernetes": `{
  "url": "http://localhost:9091/mcp",
  "description": "Manage resources in a Kubernetes cluster.",
  "logo": "https://kubernetes.io/images/kubernetes-horizontal-color.png"
}`,
			"default-transport": `{
  "url": "http://localhost:9092/default-transport",
  "description": "Server with default transport (streamable-http)."
}`,
			"invalid-transport": `{
  "url": "http://localhost:9093/invalid-transport",
  "transport": "invalid-transport-type",
  "description": "Server with invalid transport field."
}`,
			"unavailable-server": `{
  "url": "https://mcp-unavailable:8080/sse",
  "transport": "sse",
  "description": "Server that is not reachable for testing error scenarios."
}`,
			"error-server": `{
  "url": "https://mcp-error:8080/mcp",
  "description": "Server that returns authentication errors for testing."
}`,
			"github-copilot": `{
  "url": "https://api.githubcopilot.com/mcp",
  "description": "GitHub Copilot MCP server with advanced kubectl tools.",
  "logo": "https://github.com/images/modules/logos_page/GitHub-Mark.png"
}`,
		},
	}, nil
}
