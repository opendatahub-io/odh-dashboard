package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// MockMaaSModelRefsRepository returns mock data for development.
type MockMaaSModelRefsRepository struct {
	logger *slog.Logger
}

// NewMockMaaSModelRefsRepository creates a new mock MaaSModelRef repository.
func NewMockMaaSModelRefsRepository(logger *slog.Logger) *MockMaaSModelRefsRepository {
	return &MockMaaSModelRefsRepository{logger: logger}
}

func (r *MockMaaSModelRefsRepository) CreateMaaSModelRef(_ context.Context, request models.CreateMaaSModelRefRequest, dryRun bool) (*models.MaaSModelRefSummary, error) {
	r.logger.Debug("Creating MaaSModelRef (mock)", slog.String("name", request.Name), slog.Bool("dryRun", dryRun))

	for _, ref := range mocks.GetMockMaaSModelRefSummaries() {
		if ref.Name == request.Name && ref.Namespace == request.Namespace {
			return nil, fmt.Errorf("MaaSModelRef '%s' already exists", request.Name)
		}
	}

	return &models.MaaSModelRefSummary{
		Name:      request.Name,
		Namespace: request.Namespace,
		ModelRef:  request.ModelRef,
		Phase:     "Pending",
		Endpoint:  request.EndpointOverride,
	}, nil
}

func (r *MockMaaSModelRefsRepository) UpdateMaaSModelRef(_ context.Context, namespace, name string, request models.UpdateMaaSModelRefRequest, dryRun bool) (*models.MaaSModelRefSummary, error) {
	r.logger.Debug("Updating MaaSModelRef (mock)", slog.String("namespace", namespace), slog.String("name", name), slog.Bool("dryRun", dryRun))

	for _, ref := range mocks.GetMockMaaSModelRefSummaries() {
		if ref.Name == name && ref.Namespace == namespace {
			endpoint := ref.Endpoint
			if request.EndpointOverride != "" {
				endpoint = request.EndpointOverride
			}
			return &models.MaaSModelRefSummary{
				Name:      ref.Name,
				Namespace: ref.Namespace,
				ModelRef:  request.ModelRef,
				Phase:     ref.Phase,
				Endpoint:  endpoint,
			}, nil
		}
	}
	return nil, fmt.Errorf("MaaSModelRef '%s' not found", name)
}

func (r *MockMaaSModelRefsRepository) DeleteMaaSModelRef(_ context.Context, namespace, name string, dryRun bool) error {
	r.logger.Debug("Deleting MaaSModelRef (mock)", slog.String("namespace", namespace), slog.String("name", name), slog.Bool("dryRun", dryRun))

	for _, ref := range mocks.GetMockMaaSModelRefSummaries() {
		if ref.Name == name && ref.Namespace == namespace {
			return nil
		}
	}
	return fmt.Errorf("MaaSModelRef '%s' not found", name)
}
