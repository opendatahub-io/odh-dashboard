package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
)

// MockYamlRepository returns mock YAML for development.
type MockYamlRepository struct {
	logger *slog.Logger
}

// NewMockYamlRepository creates a new mock YAML repository.
func NewMockYamlRepository(logger *slog.Logger) *MockYamlRepository {
	return &MockYamlRepository{logger: logger}
}

// GetYaml returns realistic static YAML for known mock resources.
func (r *MockYamlRepository) GetYaml(_ context.Context, name, resourceType string) (string, error) {
	r.logger.Debug("Getting YAML for resource (mock)", slog.String("name", name), slog.String("resourceType", resourceType))

	gvr, err := yamlResourceTypeToGVR(resourceType)
	if err != nil {
		return "", err
	}

	switch gvr.Resource {
	case "maassubscriptions":
		for _, sub := range mocks.GetMockMaaSSubscriptions() {
			if sub.Name == name {
				return unstructuredToYAML(subscriptionModelToUnstructured(sub))
			}
		}
	case "maasauthpolicies":
		for _, policy := range mocks.GetMockMaaSAuthPolicies() {
			if policy.Name == name {
				return unstructuredToYAML(authPolicyModelToUnstructured(policy))
			}
		}
	}

	return "", fmt.Errorf("%w: %s", ErrNotFound, name)
}
