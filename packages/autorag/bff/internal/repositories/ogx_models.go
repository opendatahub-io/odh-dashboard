package repositories

import (
	"context"
	"fmt"
	"log/slog" // used by translateOGXModel warnings

	ogx "github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type OGXModelsRepository struct {
	ogxClient  ogx.OGXClientInterface
	k8sService *corek8s.K8sService
}

func NewOGXModelsRepository(ogxClient ogx.OGXClientInterface, k8sService *corek8s.K8sService) *OGXModelsRepository {
	return &OGXModelsRepository{ogxClient: ogxClient, k8sService: k8sService}
}

// GetOGXModels retrieves all models from OGX.
// Reads credentials from the named Kubernetes secret and passes them directly
// to the stateless OGX client per-call.
func (r *OGXModelsRepository) GetOGXModels(ctx context.Context, namespace, secretName string) (*models.OGXModelsData, error) {
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
		ogxModel, ok := translateOGXModel(native)
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
		slog.Warn("Open GenAI Stack schema drift detected — some models could not be fully parsed",
			"total", len(nativeModels),
			"skipped", skipped,
			"degraded_to_unknown_type", degraded)
	}

	return &models.OGXModelsData{Models: allModels}, nil
}

// translateOGXModel translates a Open GenAI Stack native model into our stable public API format.
// Returns false if the model should be skipped (missing ID).
func translateOGXModel(native models.OGXNativeModel) (models.OGXModel, bool) {
	if native.ID == "" {
		slog.Warn("skipping Open GenAI Stack model with empty ID")
		return models.OGXModel{}, false
	}

	result := models.OGXModel{ID: native.ID}

	if native.CustomMetadata == nil {
		slog.Warn("Open GenAI Stack model missing custom_metadata — upstream schema may have changed",
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
