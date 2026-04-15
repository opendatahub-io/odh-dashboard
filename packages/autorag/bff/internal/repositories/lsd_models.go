package repositories

import (
	"context"
	"log/slog"

	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type LSDModelsRepository struct{}

func NewLSDModelsRepository() *LSDModelsRepository {
	return &LSDModelsRepository{}
}

// GetLSDModels retrieves all models from LlamaStack.
// Translates LlamaStack's native format into our stable public API format.
func (r *LSDModelsRepository) GetLSDModels(ctx context.Context) (*models.LSDModelsData, error) {
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	nativeModels, err := client.ListModels(ctx)
	if err != nil {
		return nil, err
	}

	allModels := make([]models.LSDModel, 0, len(nativeModels))
	for _, native := range nativeModels {
		lsdModel, ok := translateLlamaStackModel(native)
		if !ok {
			continue
		}
		allModels = append(allModels, lsdModel)
	}

	return &models.LSDModelsData{
		Models: allModels,
	}, nil
}

// translateLlamaStackModel translates a LlamaStack native model into our stable public API format.
// It degrades gracefully when upstream fields are missing:
//   - ID is required — models without an ID are skipped entirely.
//   - model_type is the most critical field (used by the UI to filter between embedding and
//     generation models). If missing, it defaults to "unknown" so the model still appears.
//   - provider and resource_path are optional — empty strings are acceptable.
//
// Returns false if the model should be skipped (missing ID).
func translateLlamaStackModel(native models.LlamaStackNativeModel) (models.LSDModel, bool) {
	if native.ID == "" {
		slog.Warn("skipping LlamaStack model with empty ID")
		return models.LSDModel{}, false
	}

	result := models.LSDModel{ID: native.ID}

	if native.CustomMetadata == nil {
		// custom_metadata is absent — upstream schema may have changed.
		slog.Warn("LlamaStack model missing custom_metadata — upstream schema may have changed",
			"model_id", native.ID)
		result.Type = "unknown"
		return result, true
	}

	result.Type = native.CustomMetadata.ModelType
	result.Provider = native.CustomMetadata.ProviderID
	result.ResourcePath = native.CustomMetadata.ProviderResourceID

	if result.Type == "" {
		slog.Warn("LlamaStack model missing model_type — defaulting to unknown",
			"model_id", native.ID)
		result.Type = "unknown"
	}

	return result, true
}
