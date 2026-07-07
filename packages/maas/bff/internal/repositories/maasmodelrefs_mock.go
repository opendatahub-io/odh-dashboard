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
	logger  *slog.Logger
	created []models.MaaSModelRefSummary
}

// NewMockMaaSModelRefsRepository creates a new mock MaaSModelRef repository.
func NewMockMaaSModelRefsRepository(logger *slog.Logger) *MockMaaSModelRefsRepository {
	return &MockMaaSModelRefsRepository{logger: logger}
}

func (r *MockMaaSModelRefsRepository) ListMaaSModelRefs(_ context.Context) ([]models.MaaSModelRefSummary, error) {
	r.logger.Debug("Listing all MaaSModelRefs (mock)")

	result := append([]models.MaaSModelRefSummary{}, mocks.GetMockMaaSModelRefSummaries()...)
	result = append(result, r.created...)
	return result, nil
}

func (r *MockMaaSModelRefsRepository) CreateMaaSModelRef(_ context.Context, request models.CreateMaaSModelRefRequest, dryRun bool) (*models.MaaSModelRefSummary, error) {
	r.logger.Debug("Creating MaaSModelRef (mock)", slog.String("name", request.Name), slog.Bool("dryRun", dryRun))

	for _, ref := range mocks.GetMockMaaSModelRefSummaries() {
		if ref.Name == request.Name && ref.Namespace == request.Namespace {
			return nil, fmt.Errorf("MaaSModelRef '%s' already exists", request.Name)
		}
	}
	for _, ref := range r.created {
		if ref.Name == request.Name && ref.Namespace == request.Namespace {
			return nil, fmt.Errorf("MaaSModelRef '%s' already exists", request.Name)
		}
	}

	summary := models.MaaSModelRefSummary{
		Name:        request.Name,
		Namespace:   request.Namespace,
		DisplayName: request.DisplayName,
		Description: request.Description,
		ModelRef:    request.ModelRef,
		Phase:       "Pending",
		Endpoint:    request.EndpointOverride,
	}

	if !dryRun {
		r.created = append(r.created, summary)
	}

	return &summary, nil
}

func (r *MockMaaSModelRefsRepository) UpdateMaaSModelRef(_ context.Context, namespace, name string, request models.UpdateMaaSModelRefRequest, dryRun bool) (*models.MaaSModelRefSummary, error) {
	r.logger.Debug("Updating MaaSModelRef (mock)", slog.String("namespace", namespace), slog.String("name", name), slog.Bool("dryRun", dryRun))

	for i, ref := range r.created {
		if ref.Name == name && ref.Namespace == namespace {
			updated := r.created[i]
			if request.DisplayName != nil {
				updated.DisplayName = *request.DisplayName
			}
			if request.Description != nil {
				updated.Description = *request.Description
			}
			if request.ModelRef.Kind != "" || request.ModelRef.Name != "" {
				updated.ModelRef = request.ModelRef
			}
			if request.EndpointOverride != "" {
				updated.Endpoint = request.EndpointOverride
			}
			if !dryRun {
				r.created[i] = updated
			}
			return &updated, nil
		}
	}

	for _, ref := range mocks.GetMockMaaSModelRefSummaries() {
		if ref.Name == name && ref.Namespace == namespace {
			updated := ref
			if request.DisplayName != nil {
				updated.DisplayName = *request.DisplayName
			}
			if request.Description != nil {
				updated.Description = *request.Description
			}
			if request.ModelRef.Kind != "" || request.ModelRef.Name != "" {
				updated.ModelRef = request.ModelRef
			}
			if request.EndpointOverride != "" {
				updated.Endpoint = request.EndpointOverride
			}
			return &updated, nil
		}
	}

	return nil, fmt.Errorf("MaaSModelRef '%s' not found", name)
}

func (r *MockMaaSModelRefsRepository) DeleteMaaSModelRef(_ context.Context, namespace, name string, dryRun bool) error {
	r.logger.Debug("Deleting MaaSModelRef (mock)", slog.String("namespace", namespace), slog.String("name", name), slog.Bool("dryRun", dryRun))

	for i, ref := range r.created {
		if ref.Name == name && ref.Namespace == namespace {
			if !dryRun {
				r.created = append(r.created[:i], r.created[i+1:]...)
			}
			return nil
		}
	}
	for _, ref := range mocks.GetMockMaaSModelRefSummaries() {
		if ref.Name == name && ref.Namespace == namespace {
			return nil
		}
	}
	return fmt.Errorf("MaaSModelRef '%s' not found", name)
}
