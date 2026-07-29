package repositories

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// MockExternalModelsRepository returns mock data for development.
type MockExternalModelsRepository struct {
	logger        *slog.Logger
	modelRefsRepo MaaSModelRefsRepositoryInterface
}

// NewMockExternalModelsRepository creates a new mock ExternalModel repository.
func NewMockExternalModelsRepository(
	logger *slog.Logger,
	modelRefsRepo MaaSModelRefsRepositoryInterface,
) *MockExternalModelsRepository {
	return &MockExternalModelsRepository{
		logger:        logger,
		modelRefsRepo: modelRefsRepo,
	}
}

func (r *MockExternalModelsRepository) ListExternalModels(ctx context.Context, namespace string) ([]models.ExternalModelSummary, error) {
	r.logger.Debug("Listing ExternalModels (mock)", slog.String("namespace", namespace))

	result := make([]models.ExternalModelSummary, 0)
	for _, item := range mocks.GetMockExternalModelSummaries() {
		if item.Namespace == namespace {
			result = append(result, item)
		}
	}

	providers := make([]models.ExternalProviderSummary, 0)
	for _, item := range mocks.GetMockExternalProviderSummaries() {
		if item.Namespace == namespace {
			providers = append(providers, item)
		}
	}

	modelRefs, err := r.modelRefsRepo.ListMaaSModelRefs(ctx)
	if err != nil {
		return nil, err
	}
	filteredModelRefs := make([]models.MaaSModelRefSummary, 0, len(modelRefs))
	for _, item := range modelRefs {
		if item.Namespace == namespace {
			filteredModelRefs = append(filteredModelRefs, item)
		}
	}

	return enrichExternalModelSummaries(
		result,
		buildExternalProviderSummaryIndex(providers),
		buildModelRefSummaryIndex(filteredModelRefs),
	), nil
}

func (r *MockExternalModelsRepository) DeleteExternalModel(ctx context.Context, namespace, name string) error {
	r.logger.Debug("Deleting ExternalModel (mock)", slog.String("namespace", namespace), slog.String("name", name))

	for _, item := range mocks.GetMockExternalModelSummaries() {
		if item.Name == name && item.Namespace == namespace {
			return r.deleteMaaSModelRefForExternalModel(ctx, namespace, name)
		}
	}
	return fmt.Errorf("ExternalModel '%s' not found", name)
}

func (r *MockExternalModelsRepository) deleteMaaSModelRefForExternalModel(ctx context.Context, namespace, name string) error {
	err := r.modelRefsRepo.DeleteMaaSModelRef(ctx, namespace, name, false)
	if err != nil && strings.Contains(err.Error(), "not found") {
		return nil
	}
	return err
}
