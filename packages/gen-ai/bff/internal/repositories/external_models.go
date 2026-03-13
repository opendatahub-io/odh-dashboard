package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type ExternalModelsRepository struct{}

func NewExternalModelsRepository() *ExternalModelsRepository {
	return &ExternalModelsRepository{}
}

// CreateExternalModel creates an external model by creating/updating the ConfigMap and Secret
func (r *ExternalModelsRepository) CreateExternalModel(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	req models.ExternalModelRequest,
) (*models.AAModel, error) {
	// Generate provider ID (simple incremental ID based on existing providers)
	providerID, err := client.GenerateProviderID(ctx, identity, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to generate provider ID: %w", err)
	}

	// Create Secret for API key
	secretName := fmt.Sprintf("external-model-provider-api-key-%s", providerID)
	if err := client.CreateExternalModelSecret(ctx, identity, namespace, secretName, req.SecretValue); err != nil {
		return nil, fmt.Errorf("failed to create secret: %w", err)
	}

	// Create or update ConfigMap with the new provider and model
	if err := client.CreateOrUpdateExternalModelConfigMap(ctx, identity, namespace, providerID, secretName, req); err != nil {
		// Clean up secret if ConfigMap creation fails
		if cleanupErr := client.DeleteSecret(ctx, identity, namespace, secretName); cleanupErr != nil {
			// Return both the original error and the cleanup error to surface leaked state
			return nil, fmt.Errorf("failed to create/update ConfigMap: %w; cleanup failed deleting secret %s: %v", err, secretName, cleanupErr)
		}
		return nil, fmt.Errorf("failed to create/update ConfigMap: %w", err)
	}

	// Determine model source type based on URL
	sourceType := models.ModelSourceTypeExternalProvider
	endpoint := fmt.Sprintf("external: %s", req.BaseURL)
	if helper.IsClusterLocalURL(req.BaseURL) {
		sourceType = models.ModelSourceTypeExternalCluster
		endpoint = fmt.Sprintf("internal: %s", req.BaseURL)
	}

	// Return AAModel structure for consistent API response
	return &models.AAModel{
		ModelName:       req.ModelID,
		ModelID:         req.ModelID,
		ServingRuntime:  string(req.ProviderType),
		APIProtocol:     "REST",
		Version:         "",
		Usecase:         req.UseCases,
		Description:     "",
		Endpoints:       []string{endpoint},
		Status:          "Running",
		DisplayName:     req.ModelDisplayName,
		SAToken:         models.SAToken{},
		ModelSourceType: sourceType,
		ModelType:       req.ModelType,
	}, nil
}

// DeleteExternalModel deletes an external model by removing its entry from the ConfigMap and deleting its Secret
func (r *ExternalModelsRepository) DeleteExternalModel(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	modelID string,
) error {
	return client.DeleteExternalModel(ctx, identity, namespace, modelID)
}
