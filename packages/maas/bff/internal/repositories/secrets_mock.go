package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

type mockSecretRecord struct {
	namespace string
	name      string
}

// MockSecretsRepository returns mock data for development.
type MockSecretsRepository struct {
	logger  *slog.Logger
	created []mockSecretRecord
}

// NewMockSecretsRepository creates a new mock Secrets repository.
func NewMockSecretsRepository(logger *slog.Logger) *MockSecretsRepository {
	return &MockSecretsRepository{logger: logger}
}

func (r *MockSecretsRepository) ListSecrets(_ context.Context, namespace string) ([]models.SecretSummary, error) {
	r.logger.Debug("Listing Secrets (mock)", slog.String("namespace", namespace))

	// Mock data represents secrets created/managed via this BFF (BBR-managed).
	result := make([]models.SecretSummary, 0)
	for _, item := range mocks.GetMockSecretSummaries() {
		if namespace == "maas-models" {
			result = append(result, item)
		}
	}
	for _, item := range r.created {
		if item.namespace == namespace {
			result = append(result, models.SecretSummary{Name: item.name})
		}
	}
	return result, nil
}

func (r *MockSecretsRepository) CreateSecret(_ context.Context, request models.CreateSecretRequest) (*models.CreateSecretResponse, error) {
	r.logger.Debug("Creating Secret (mock)", slog.String("name", request.Name), slog.String("namespace", request.Namespace))

	for _, item := range mocks.GetMockSecretSummaries() {
		if item.Name == request.Name && request.Namespace == "maas-models" {
			return nil, fmt.Errorf("secret '%s' already exists", request.Name)
		}
	}
	for _, item := range r.created {
		if item.name == request.Name && item.namespace == request.Namespace {
			return nil, fmt.Errorf("secret '%s' already exists", request.Name)
		}
	}

	r.created = append(r.created, mockSecretRecord{
		namespace: request.Namespace,
		name:      request.Name,
	})
	return &models.CreateSecretResponse{Name: request.Name}, nil
}
