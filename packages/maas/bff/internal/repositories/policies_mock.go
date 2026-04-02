package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// MockPoliciesRepository returns mock data for development.
type MockPoliciesRepository struct {
	logger *slog.Logger
}

// NewMockPoliciesRepository creates a new mock policies repository.
func NewMockPoliciesRepository(logger *slog.Logger) *MockPoliciesRepository {
	return &MockPoliciesRepository{logger: logger}
}

func (r *MockPoliciesRepository) ListPolicies(_ context.Context) ([]models.MaaSAuthPolicy, error) {
	r.logger.Debug("Listing all policies (mock)")
	return mocks.GetMockMaaSAuthPolicies(), nil
}

func (r *MockPoliciesRepository) GetPolicy(_ context.Context, name string) (*models.MaaSAuthPolicy, error) {
	r.logger.Debug("Getting policy (mock)", slog.String("name", name))
	for _, policy := range mocks.GetMockMaaSAuthPolicies() {
		if policy.Name == name {
			return &policy, nil
		}
	}
	return nil, nil
}

func (r *MockPoliciesRepository) CreatePolicy(_ context.Context, request models.CreatePolicyRequest) (*models.MaaSAuthPolicy, error) {
	r.logger.Debug("Creating policy (mock)", slog.String("name", request.Name))

	for _, policy := range mocks.GetMockMaaSAuthPolicies() {
		if policy.Name == request.Name {
			return nil, fmt.Errorf("%w: MaaSAuthPolicy '%s' already exists", ErrAlreadyExists, request.Name)
		}
	}

	return &models.MaaSAuthPolicy{
		Name:             request.Name,
		Namespace:        "mock-namespace",
		DisplayName:      request.DisplayName,
		Description:      request.Description,
		Phase:            "Pending",
		ModelRefs:        request.ModelRefs,
		Subjects:         request.Subjects,
		MeteringMetadata: request.MeteringMetadata,
	}, nil
}

func (r *MockPoliciesRepository) UpdatePolicy(_ context.Context, name string, request models.UpdatePolicyRequest) (*models.MaaSAuthPolicy, error) {
	r.logger.Debug("Updating policy (mock)", slog.String("name", name))

	var existing *models.MaaSAuthPolicy
	for _, policy := range mocks.GetMockMaaSAuthPolicies() {
		if policy.Name == name {
			existing = &policy
			break
		}
	}
	if existing == nil {
		return nil, nil
	}

	return &models.MaaSAuthPolicy{
		Name:             existing.Name,
		Namespace:        existing.Namespace,
		DisplayName:      request.DisplayName,
		Description:      request.Description,
		Phase:            existing.Phase,
		ModelRefs:        request.ModelRefs,
		Subjects:         request.Subjects,
		MeteringMetadata: request.MeteringMetadata,
	}, nil
}

func (r *MockPoliciesRepository) DeletePolicy(_ context.Context, name string) error {
	r.logger.Debug("Deleting policy (mock)", slog.String("name", name))
	for _, policy := range mocks.GetMockMaaSAuthPolicies() {
		if policy.Name == name {
			return nil
		}
	}
	return fmt.Errorf("%w: MaaSAuthPolicy '%s' not found", ErrNotFound, name)
}
