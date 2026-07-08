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
	created       []models.ExternalModelSummary
}

// NewMockExternalModelsRepository creates a new mock ExternalModel repository.
func NewMockExternalModelsRepository(logger *slog.Logger, modelRefsRepo MaaSModelRefsRepositoryInterface) *MockExternalModelsRepository {
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
	for _, item := range r.created {
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

func (r *MockExternalModelsRepository) CreateExternalModel(ctx context.Context, request models.CreateExternalModelRequest) (*models.ExternalModelSummary, error) {
	r.logger.Debug("Creating ExternalModel (mock)", slog.String("name", request.Name))

	for _, item := range mocks.GetMockExternalModelSummaries() {
		if item.Name == request.Name && item.Namespace == request.Namespace {
			return nil, fmt.Errorf("ExternalModel '%s' already exists", request.Name)
		}
	}
	for _, item := range r.created {
		if item.Name == request.Name && item.Namespace == request.Namespace {
			return nil, fmt.Errorf("ExternalModel '%s' already exists", request.Name)
		}
	}

	if err := r.createMaaSModelRefForExternalModel(ctx, request); err != nil {
		return nil, err
	}

	modelName := request.ModelName
	if modelName == "" {
		modelName = request.Name
	}

	summary := models.ExternalModelSummary{
		Name:         request.Name,
		Namespace:    request.Namespace,
		DisplayName:  request.DisplayName,
		Description:  request.Description,
		ModelName:    modelName,
		ProviderRefs: request.ProviderRefs,
		Phase:        "Pending",
	}
	r.created = append(r.created, summary)
	return &summary, nil
}

func (r *MockExternalModelsRepository) UpdateExternalModel(ctx context.Context, namespace, name string, request models.UpdateExternalModelRequest) (*models.ExternalModelSummary, error) {
	r.logger.Debug("Updating ExternalModel (mock)", slog.String("namespace", namespace), slog.String("name", name))

	for i, item := range r.created {
		if item.Name == name && item.Namespace == namespace {
			updated := r.created[i]
			if request.DisplayName != nil {
				updated.DisplayName = *request.DisplayName
			}
			if request.Description != nil {
				updated.Description = *request.Description
			}
			if request.ModelName != "" {
				updated.ModelName = request.ModelName
			}
			if len(request.ProviderRefs) > 0 {
				updated.ProviderRefs = request.ProviderRefs
			}
			r.created[i] = updated
			if err := r.syncMaaSModelRefOnUpdate(ctx, namespace, name, request); err != nil {
				return nil, err
			}
			return &updated, nil
		}
	}

	for _, item := range mocks.GetMockExternalModelSummaries() {
		if item.Name == name && item.Namespace == namespace {
			updated := item
			if request.DisplayName != nil {
				updated.DisplayName = *request.DisplayName
			}
			if request.Description != nil {
				updated.Description = *request.Description
			}
			if request.ModelName != "" {
				updated.ModelName = request.ModelName
			}
			if len(request.ProviderRefs) > 0 {
				updated.ProviderRefs = request.ProviderRefs
			}
			if err := r.syncMaaSModelRefOnUpdate(ctx, namespace, name, request); err != nil {
				return nil, err
			}
			return &updated, nil
		}
	}

	return nil, fmt.Errorf("ExternalModel '%s' not found", name)
}

func (r *MockExternalModelsRepository) DeleteExternalModel(ctx context.Context, namespace, name string) error {
	r.logger.Debug("Deleting ExternalModel (mock)", slog.String("namespace", namespace), slog.String("name", name))

	for i, item := range r.created {
		if item.Name == name && item.Namespace == namespace {
			r.created = append(r.created[:i], r.created[i+1:]...)
			return r.deleteMaaSModelRefForExternalModel(ctx, namespace, name)
		}
	}
	for _, item := range mocks.GetMockExternalModelSummaries() {
		if item.Name == name && item.Namespace == namespace {
			return r.deleteMaaSModelRefForExternalModel(ctx, namespace, name)
		}
	}
	return fmt.Errorf("ExternalModel '%s' not found", name)
}

func (r *MockExternalModelsRepository) createMaaSModelRefForExternalModel(ctx context.Context, request models.CreateExternalModelRequest) error {
	_, err := r.modelRefsRepo.CreateMaaSModelRef(ctx, models.CreateMaaSModelRefRequest{
		Name:        request.Name,
		Namespace:   request.Namespace,
		ModelRef:    models.ModelReference{Kind: "ExternalModel", Name: request.Name},
		DisplayName: request.DisplayName,
		Description: request.Description,
	}, false)
	return err
}

func (r *MockExternalModelsRepository) syncMaaSModelRefOnUpdate(ctx context.Context, namespace, name string, request models.UpdateExternalModelRequest) error {
	updateRequest := models.UpdateMaaSModelRefRequest{
		ModelRef: models.ModelReference{Kind: "ExternalModel", Name: name},
	}
	if request.DisplayName != nil {
		updateRequest.DisplayName = request.DisplayName
	}
	if request.Description != nil {
		updateRequest.Description = request.Description
	}

	_, err := r.modelRefsRepo.UpdateMaaSModelRef(ctx, namespace, name, updateRequest, false)
	if err == nil || !strings.Contains(err.Error(), "not found") {
		return err
	}

	createRequest := models.CreateMaaSModelRefRequest{
		Name:      name,
		Namespace: namespace,
		ModelRef:  models.ModelReference{Kind: "ExternalModel", Name: name},
	}
	if request.DisplayName != nil {
		createRequest.DisplayName = *request.DisplayName
	}
	if request.Description != nil {
		createRequest.Description = *request.Description
	}
	_, err = r.modelRefsRepo.CreateMaaSModelRef(ctx, createRequest, false)
	return err
}

func (r *MockExternalModelsRepository) deleteMaaSModelRefForExternalModel(ctx context.Context, namespace, name string) error {
	err := r.modelRefsRepo.DeleteMaaSModelRef(ctx, namespace, name, false)
	if err != nil && strings.Contains(err.Error(), "not found") {
		return nil
	}
	return err
}
