package repositories

import (
	"context"
	"fmt"
	"log/slog"

	ogx "github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

const vectorIOAPI = "vector_io"

// OGXRepository handles OGX model and vector store provider operations.
// Reads credentials from Kubernetes secrets per-call and delegates to the stateless OGX client.
type OGXRepository struct {
	ogxClient  ogx.OGXClientInterface
	k8sService kubernetes.Service
	logger     *slog.Logger
}

func NewOGXRepository(logger *slog.Logger, ogxClient ogx.OGXClientInterface, k8sService kubernetes.Service) *OGXRepository {
	return &OGXRepository{ogxClient: ogxClient, k8sService: k8sService, logger: logger}
}

// --- Models ---

// GetOGXModels retrieves all models from OGX.
func (r *OGXRepository) GetOGXModels(ctx context.Context, namespace, secretName string) (*models.OGXModelsData, error) {
	baseURL, apiKey, err := resolveOGXCredentials(ctx, r.k8sService, namespace, secretName)
	if err != nil {
		return nil, err
	}

	nativeModels, err := r.ogxClient.ListModels(ctx, baseURL, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list OGX models: %w", err)
	}

	allModels := make([]models.OGXModel, 0, len(nativeModels))
	var skipped, degraded int
	for _, native := range nativeModels {
		ogxModel, ok := r.translateOGXModel(native)
		if !ok {
			skipped++
			continue
		}
		if ogxModel.Type == "unknown" {
			degraded++
		}
		allModels = append(allModels, ogxModel)
	}

	if skipped > 0 || degraded > 0 {
		r.logger.Warn("Open GenAI Stack schema drift detected — some models could not be fully parsed",
			"total", len(nativeModels),
			"skipped", skipped,
			"degraded_to_unknown_type", degraded)
	}

	return &models.OGXModelsData{Models: allModels}, nil
}

// translateOGXModel translates a Open GenAI Stack native model into our stable public API format.
// Returns false if the model should be skipped (missing ID).
func (r *OGXRepository) translateOGXModel(native models.OGXNativeModel) (models.OGXModel, bool) {
	if native.ID == "" {
		r.logger.Warn("skipping Open GenAI Stack model with empty ID")
		return models.OGXModel{}, false
	}

	result := models.OGXModel{ID: native.ID}

	if native.CustomMetadata == nil {
		r.logger.Warn("Open GenAI Stack model missing custom_metadata — upstream schema may have changed",
			"model_id", native.ID)
		result.Type = "unknown"
		return result, true
	}

	result.Type = native.CustomMetadata.ModelType
	result.Provider = native.CustomMetadata.ProviderID
	result.ResourcePath = native.CustomMetadata.ProviderResourceID

	if result.Type == "" {
		result.Type = "unknown"
		return result, true
	}

	return result, true
}

// --- Vector Store Providers ---

// GetOGXVectorStoreProviders retrieves vector store providers from OGX by calling
// /v1/providers and filtering for the vector_io API type.
func (r *OGXRepository) GetOGXVectorStoreProviders(ctx context.Context, namespace, secretName string) (*models.OGXVectorStoreProvidersData, error) {
	baseURL, apiKey, err := resolveOGXCredentials(ctx, r.k8sService, namespace, secretName)
	if err != nil {
		return nil, err
	}

	allProviders, err := r.ogxClient.ListProviders(ctx, baseURL, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list OGX providers: %w", err)
	}

	vectorStoreProviders := make([]models.OGXVectorStoreProvider, 0)
	for _, p := range allProviders {
		if p.API == vectorIOAPI {
			vectorStoreProviders = append(vectorStoreProviders, models.OGXVectorStoreProvider{
				ProviderID:   p.ProviderID,
				ProviderType: p.ProviderType,
			})
		}
	}

	return &models.OGXVectorStoreProvidersData{VectorStoreProviders: vectorStoreProviders}, nil
}
