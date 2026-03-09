package k8smocks

import (
	"context"
	"fmt"
	"net/http"

	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// NewMockTokenClientFactory creates a basic mock factory for simple tests
func NewMockTokenClientFactory() k8s.KubernetesClientFactory {
	return &ConfigurableMockTokenClientFactory{
		CanListLSDAllowed: true, // Default to allowed
	}
}

// FailingMockTokenClientFactory simulates GetClient failures
type FailingMockTokenClientFactory struct {
	GetClientError error
}

func (f *FailingMockTokenClientFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	return nil, f.GetClientError
}

func (f *FailingMockTokenClientFactory) ExtractRequestIdentity(headers http.Header) (*k8s.RequestIdentity, error) {
	return &k8s.RequestIdentity{Token: "valid-token"}, nil
}

func (f *FailingMockTokenClientFactory) ValidateRequestIdentity(identity *k8s.RequestIdentity) error {
	if identity == nil || identity.Token == "" {
		return fmt.Errorf("token is required")
	}
	return nil
}

// ConfigurableMockTokenClientFactory allows configuring CanListLlamaStackDistributions behavior
type ConfigurableMockTokenClientFactory struct {
	CanListLSDAllowed    bool
	CanListLSDError      error
	GetLSDList           *lsdapi.LlamaStackDistributionList // Can be set to custom LlamaStackDistributionList
	GetLSDError          error
	ShouldReturnEmptyLSD bool
	ShouldReturnNoURL    bool // LSD with empty ServiceURL
}

func (f *ConfigurableMockTokenClientFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	return &ConfigurableMockKubernetesClient{
		CanListLSDAllowed:    f.CanListLSDAllowed,
		CanListLSDError:      f.CanListLSDError,
		GetLSDList:           f.GetLSDList,
		GetLSDError:          f.GetLSDError,
		ShouldReturnEmptyLSD: f.ShouldReturnEmptyLSD,
		ShouldReturnNoURL:    f.ShouldReturnNoURL,
	}, nil
}

func (f *ConfigurableMockTokenClientFactory) ExtractRequestIdentity(headers http.Header) (*k8s.RequestIdentity, error) {
	return &k8s.RequestIdentity{Token: "valid-token"}, nil
}

func (f *ConfigurableMockTokenClientFactory) ValidateRequestIdentity(identity *k8s.RequestIdentity) error {
	if identity == nil || identity.Token == "" {
		return fmt.Errorf("token is required")
	}
	return nil
}

// ConfigurableMockKubernetesClient allows configuring authorization check behavior
type ConfigurableMockKubernetesClient struct {
	k8s.KubernetesClientInterface
	CanListLSDAllowed    bool
	CanListLSDError      error
	GetLSDList           *lsdapi.LlamaStackDistributionList
	GetLSDError          error
	ShouldReturnEmptyLSD bool
	ShouldReturnNoURL    bool
}

func (c *ConfigurableMockKubernetesClient) CanListLlamaStackDistributions(ctx context.Context, identity *k8s.RequestIdentity, namespace string) (bool, error) {
	if c.CanListLSDError != nil {
		return false, c.CanListLSDError
	}
	return c.CanListLSDAllowed, nil
}

func (c *ConfigurableMockKubernetesClient) GetLlamaStackDistributions(ctx context.Context, identity *k8s.RequestIdentity, namespace string) (*lsdapi.LlamaStackDistributionList, error) {
	if c.GetLSDError != nil {
		return nil, c.GetLSDError
	}

	// If custom list is provided, return it
	if c.GetLSDList != nil {
		return c.GetLSDList, nil
	}

	// Return based on configuration
	if c.ShouldReturnEmptyLSD {
		return &lsdapi.LlamaStackDistributionList{
			Items: []lsdapi.LlamaStackDistribution{},
		}, nil
	}

	if c.ShouldReturnNoURL {
		// Return LSD with empty ServiceURL
		return &lsdapi.LlamaStackDistributionList{
			Items: []lsdapi.LlamaStackDistribution{
				{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "mock-lsd",
						Namespace: namespace,
					},
					Status: lsdapi.LlamaStackDistributionStatus{
						ServiceURL: "", // Empty URL to test error handling
					},
				},
			},
		}, nil
	}

	// Default: return mock LSD with serviceURL
	return &lsdapi.LlamaStackDistributionList{
		Items: []lsdapi.LlamaStackDistribution{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "mock-lsd",
					Namespace: namespace,
					Labels: map[string]string{
						"opendatahub.io/dashboard": "true",
					},
				},
				Status: lsdapi.LlamaStackDistributionStatus{
					ServiceURL: fmt.Sprintf("http://mock-lsd.%s.svc.cluster.local:8321", namespace),
					Phase:      lsdapi.LlamaStackDistributionPhaseReady,
				},
			},
		},
	}, nil
}

// Helper functions to create k8s error types for testing

func NewUnauthorizedError() error {
	return k8s.NewUnauthorizedError("authentication failed: invalid or expired token")
}

func NewForbiddenError() error {
	return k8s.NewPermissionDeniedError("test-namespace", "insufficient permissions to access services in this namespace")
}
