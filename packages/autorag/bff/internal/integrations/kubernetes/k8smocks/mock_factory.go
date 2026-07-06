package k8smocks

import (
	"context"
	"fmt"
	"net/http"

	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
)

// NewMockTokenClientFactory creates a basic mock factory for simple tests
func NewMockTokenClientFactory() k8s.KubernetesClientFactory {
	return &ConfigurableMockTokenClientFactory{
		CanListDSPAAllowed: true, // Default to allowed
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

// ConfigurableMockTokenClientFactory allows configuring authorization check behavior
type ConfigurableMockTokenClientFactory struct {
	CanListDSPAAllowed bool
	CanListDSPAError   error
}

func (f *ConfigurableMockTokenClientFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	return &ConfigurableMockKubernetesClient{
		CanListDSPAAllowed: f.CanListDSPAAllowed,
		CanListDSPAError:   f.CanListDSPAError,
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
	CanListDSPAAllowed bool
	CanListDSPAError   error
}

func (c *ConfigurableMockKubernetesClient) CanListDSPipelineApplications(ctx context.Context, identity *k8s.RequestIdentity, namespace string) (bool, error) {
	if c.CanListDSPAError != nil {
		return false, c.CanListDSPAError
	}
	return c.CanListDSPAAllowed, nil
}

// Helper functions to create k8s error types for testing

func NewUnauthorizedError() error {
	return k8s.NewUnauthorizedError("authentication failed: invalid or expired token")
}

func NewForbiddenError() error {
	return k8s.NewPermissionDeniedError("test-namespace", "insufficient permissions to access services in this namespace")
}
