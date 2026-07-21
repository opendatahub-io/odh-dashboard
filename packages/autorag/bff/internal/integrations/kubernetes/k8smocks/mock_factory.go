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
	CanListDSPAAllowed    bool
	CanListDSPAError      error
	CanPatchDSPAAllowed   *bool
	CanPatchDSPAError     error
	CanPatchDeployAllowed *bool
	CanPatchDeployError   error
}

func (f *ConfigurableMockTokenClientFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	return &ConfigurableMockKubernetesClient{
		CanListDSPAAllowed:    f.CanListDSPAAllowed,
		CanListDSPAError:      f.CanListDSPAError,
		CanPatchDSPAAllowed:   f.CanPatchDSPAAllowed,
		CanPatchDSPAError:     f.CanPatchDSPAError,
		CanPatchDeployAllowed: f.CanPatchDeployAllowed,
		CanPatchDeployError:   f.CanPatchDeployError,
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

// ConfigurableMockKubernetesClient allows configuring authorization check behavior.
// CanPatchDSPAAllowed/Error and CanPatchDeployAllowed/Error fall back to the
// CanListDSPA* values when nil, so existing tests that only set the list fields
// continue to work unchanged.
type ConfigurableMockKubernetesClient struct {
	k8s.KubernetesClientInterface
	CanListDSPAAllowed    bool
	CanListDSPAError      error
	CanPatchDSPAAllowed   *bool
	CanPatchDSPAError     error
	CanPatchDeployAllowed *bool
	CanPatchDeployError   error
}

func (c *ConfigurableMockKubernetesClient) CanListDSPipelineApplications(ctx context.Context, identity *k8s.RequestIdentity, namespace string) (bool, error) {
	if c.CanListDSPAError != nil {
		return false, c.CanListDSPAError
	}
	return c.CanListDSPAAllowed, nil
}

func (c *ConfigurableMockKubernetesClient) CanPatchDSPipelineApplications(ctx context.Context, identity *k8s.RequestIdentity, namespace string) (bool, error) {
	if c.CanPatchDSPAError != nil {
		return false, c.CanPatchDSPAError
	}
	if c.CanPatchDSPAAllowed != nil {
		return *c.CanPatchDSPAAllowed, nil
	}
	if c.CanListDSPAError != nil {
		return false, c.CanListDSPAError
	}
	return c.CanListDSPAAllowed, nil
}

func (c *ConfigurableMockKubernetesClient) CanPatchDeployments(ctx context.Context, identity *k8s.RequestIdentity, namespace string, deploymentName string) (bool, error) {
	if c.CanPatchDeployError != nil {
		return false, c.CanPatchDeployError
	}
	if c.CanPatchDeployAllowed != nil {
		return *c.CanPatchDeployAllowed, nil
	}
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
