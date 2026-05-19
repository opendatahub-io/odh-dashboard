package repositories

import (
	"context"
	"fmt"
	"log/slog"

	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type OGXModelsRepository struct{}

func NewOGXModelsRepository() *OGXModelsRepository {
	return &OGXModelsRepository{}
}

// GetOGXModels retrieves all models from OGX.
// Translates OGX's native format into our stable public API format.
func (r *OGXModelsRepository) GetOGXModels(ctx context.Context) (*models.OGXModelsData, error) {
	client, err := helper.GetContextOGXClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get OGX client from context: %w", err)
	}

	nativeModels, err := client.ListModels(ctx)
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

	return &models.OGXModelsData{
		Models: allModels,
	}, nil
}

// translateOGXModel translates a Open GenAI Stack native model into our stable public API format.
// It degrades gracefully when upstream fields are missing:
//   - ID is required — models without an ID are skipped entirely.
//   - model_type is the most critical field (used by the UI to filter between embedding and
//     generation models). If missing, it defaults to "unknown" so the model still appears.
//   - provider and resource_path are optional — empty strings are acceptable.
//
// Returns false if the model should be skipped (missing ID).
func translateOGXModel(native models.OGXNativeModel) (models.OGXModel, bool) {
	if native.ID == "" {
		slog.Warn("skipping Open GenAI Stack model with empty ID")
		return models.OGXModel{}, false
	}

	result := models.OGXModel{ID: native.ID}

	if native.CustomMetadata == nil {
		// custom_metadata is absent — upstream schema may have changed.
		slog.Warn("Open GenAI Stack model missing custom_metadata — upstream schema may have changed",
			"model_id", native.ID)
		result.Type = "unknown"
		return result, true
	}

	result.Type = native.CustomMetadata.ModelType
	result.Provider = native.CustomMetadata.ProviderID
	result.ResourcePath = native.CustomMetadata.ProviderResourceID

	if result.Type == "" {
		slog.Warn("Open GenAI Stack model missing model_type — defaulting to unknown",
			"model_id", native.ID)
		result.Type = "unknown"
	}

	return result, true
}
