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
			Endpoints: []genaiassets.Endpoint{
				{
					Internal: &genaiassets.InternalEndpoint{
						URL: "http://mock-model-1.namespace.svc.cluster.local:8080",
					},
				},
				{
					External: &genaiassets.ExternalEndpoint{
						URL:                "https://mock-model-1.example.com",
						APIToken:           "mock-api-token-12345",
						ServiceAccountName: "mock-model-1-sa",
						SecretDisplayName:  "Mock Model 1 Secret",
					},
				},
			},
		},
		{
			ModelName:      "mock-model-2",
			ServingRuntime: "TorchServe",
			APIProtocol:    "v1",
			Version:        "v2025.1",
			Description:    "A natural language processing model for text generation and completion",
			Usecase:        "Natural Language Processing",
			Endpoints: []genaiassets.Endpoint{
				{
					Internal: &genaiassets.InternalEndpoint{
						URL: "http://mock-model-2.namespace.svc.cluster.local:8080",
					},
				},
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
