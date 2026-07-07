package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/mocks"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// MockExternalProvidersRepository returns mock data for development.
type MockExternalProvidersRepository struct {
	logger  *slog.Logger
	created []models.ExternalProviderSummary
}

// NewMockExternalProvidersRepository creates a new mock ExternalProvider repository.
func NewMockExternalProvidersRepository(logger *slog.Logger) *MockExternalProvidersRepository {
	return &MockExternalProvidersRepository{logger: logger}
}

func (r *MockExternalProvidersRepository) ListExternalProviders(_ context.Context, namespace string) ([]models.ExternalProviderSummary, error) {
	r.logger.Debug("Listing ExternalProviders (mock)", slog.String("namespace", namespace))

	result := make([]models.ExternalProviderSummary, 0)
	for _, item := range mocks.GetMockExternalProviderSummaries() {
		if item.Namespace == namespace {
			result = append(result, item)
		}
	}
	for _, item := range r.created {
		if item.Namespace == namespace {
			result = append(result, item)
		}
	}
	return result, nil
}

func (r *MockExternalProvidersRepository) CreateExternalProvider(_ context.Context, request models.CreateExternalProviderRequest) (*models.ExternalProviderSummary, error) {
	r.logger.Debug("Creating ExternalProvider (mock)", slog.String("name", request.Name))

	for _, item := range mocks.GetMockExternalProviderSummaries() {
		if item.Name == request.Name && item.Namespace == request.Namespace {
			return nil, fmt.Errorf("ExternalProvider '%s' already exists", request.Name)
		}
	}
	for _, item := range r.created {
		if item.Name == request.Name && item.Namespace == request.Namespace {
			return nil, fmt.Errorf("ExternalProvider '%s' already exists", request.Name)
		}
	}

	summary := models.ExternalProviderSummary{
		Name:                request.Name,
		Namespace:           request.Namespace,
		DisplayName:         request.DisplayName,
		Description:         request.Description,
		EndpointUrl:         normalizeEndpointURL(request.EndpointUrl),
		AuthMechanism:       request.AuthMechanism,
		CredentialSecretRef: request.CredentialSecretRef,
		Provider:            request.Provider,
		Config:              request.Config,
		Phase:               "Pending",
	}
	r.created = append(r.created, summary)
	return &summary, nil
}

func (r *MockExternalProvidersRepository) UpdateExternalProvider(_ context.Context, namespace, name string, request models.UpdateExternalProviderRequest) (*models.ExternalProviderSummary, error) {
	r.logger.Debug("Updating ExternalProvider (mock)", slog.String("namespace", namespace), slog.String("name", name))

	for i, item := range r.created {
		if item.Name == name && item.Namespace == namespace {
			updated := r.created[i]
			if request.DisplayName != nil {
				updated.DisplayName = *request.DisplayName
			}
			if request.Description != nil {
				updated.Description = *request.Description
			}
			if request.EndpointUrl != "" {
				updated.EndpointUrl = normalizeEndpointURL(request.EndpointUrl)
			}
			if request.AuthMechanism != nil {
				updated.AuthMechanism = *request.AuthMechanism
			}
			if request.CredentialSecretRef != "" {
				updated.CredentialSecretRef = request.CredentialSecretRef
			}
			if request.Config != nil {
				updated.Config = request.Config
			}
			r.created[i] = updated
			return &updated, nil
		}
	}

	for _, item := range mocks.GetMockExternalProviderSummaries() {
		if item.Name == name && item.Namespace == namespace {
			updated := item
			if request.DisplayName != nil {
				updated.DisplayName = *request.DisplayName
			}
			if request.Description != nil {
				updated.Description = *request.Description
			}
			if request.EndpointUrl != "" {
				updated.EndpointUrl = normalizeEndpointURL(request.EndpointUrl)
			}
			if request.AuthMechanism != nil {
				updated.AuthMechanism = *request.AuthMechanism
			}
			if request.CredentialSecretRef != "" {
				updated.CredentialSecretRef = request.CredentialSecretRef
			}
			if request.Config != nil {
				updated.Config = request.Config
			}
			return &updated, nil
		}
	}

	return nil, fmt.Errorf("ExternalProvider '%s' not found", name)
}

func (r *MockExternalProvidersRepository) DeleteExternalProvider(_ context.Context, namespace, name string) error {
	r.logger.Debug("Deleting ExternalProvider (mock)", slog.String("namespace", namespace), slog.String("name", name))

	for i, item := range r.created {
		if item.Name == name && item.Namespace == namespace {
			r.created = append(r.created[:i], r.created[i+1:]...)
			return nil
		}
	}
	for _, item := range mocks.GetMockExternalProviderSummaries() {
		if item.Name == name && item.Namespace == namespace {
			return nil
		}
	}
	return fmt.Errorf("ExternalProvider '%s' not found", name)
}
