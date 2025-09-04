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

// GetLlamaStackDistributions returns mock LSD list for testing
func (m *TokenKubernetesClientMock) GetLlamaStackDistributions(ctx context.Context, identity *integrations.RequestIdentity, namespace string) (*lsdapi.LlamaStackDistributionList, error) {
	// Return mock LSD list for testing
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

// GetMCPServerConfig returns mock MCP server ConfigMap for testing
func (m *TokenKubernetesClientMock) GetMCPServerConfig(ctx context.Context, identity *integrations.RequestIdentity, namespace string, name string) (*corev1.ConfigMap, error) {
	// Return mock MCP server ConfigMap for testing
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Data: map[string]string{
			"brave": `{
  "url": "http://localhost:9090/sse",
  "transport": "sse",
  "description": "Search the Internet.",
  "logo": "https://brave.com/static-assets/images/brave-logo-sans-text.svg"
}`,
			"kubernetes": `{
  "url": "http://localhost:9091/mcp",
  "transport": "streamable-http",
  "description": "Manage resources in a Kubernetes cluster.",
  "logo": "https://kubernetes.io/images/kubernetes-horizontal-color.png"
}`,
		},
	}, nil
}
