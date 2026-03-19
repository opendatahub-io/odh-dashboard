package repositories

import (
	"context"
	"encoding/json"
	"fmt"
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

	rawModels, err := client.ListModels(ctx)
	if err != nil {
		return nil, err
	}

	allModels := make([]models.LSDModel, 0, len(rawModels))
	for _, rawModel := range rawModels {
		lsdModel, err := parseLlamaStackModel(rawModel.RawJSON())
		if err != nil {
			slog.Warn("skipping unparseable LlamaStack model", "error", err, "raw_json", rawModel.RawJSON())
			continue
		}
		allModels = append(allModels, lsdModel)
	}

	return &models.LSDModelsData{
		Models: allModels,
	}, nil
}

// parseLlamaStackModel parses LlamaStack's native JSON format and translates it to our stable public API format.
// This translation layer isolates our public API from changes in LlamaStack's response structure.
// LlamaStack native format: {id, custom_metadata: {model_type, provider_id, provider_resource_id}}
// Our public API format: {id, type, provider, resource_path}
func parseLlamaStackModel(rawJSON string) (models.LSDModel, error) {
	if rawJSON == "" {
		return models.LSDModel{}, fmt.Errorf("empty raw JSON")
	}

	var native models.LlamaStackNativeModel
	if err := json.Unmarshal([]byte(rawJSON), &native); err != nil {
		return models.LSDModel{}, fmt.Errorf("failed to parse LlamaStack model: %w", err)
	}

	if native.ID == "" {
		return models.LSDModel{}, fmt.Errorf("LlamaStack model missing required 'id' field")
	}

	if native.CustomMetadata.ModelType != "llm" && native.CustomMetadata.ModelType != "embedding" {
		return models.LSDModel{}, fmt.Errorf("LlamaStack model %q has unsupported model_type %q: must be 'llm' or 'embedding'", native.ID, native.CustomMetadata.ModelType)
	}

	if native.CustomMetadata.ProviderID == "" {
		return models.LSDModel{}, fmt.Errorf("LlamaStack model %q missing required 'provider_id' field", native.ID)
	}

	return models.LSDModel{
		ID:           native.ID,
		Type:         native.CustomMetadata.ModelType,
		Provider:     native.CustomMetadata.ProviderID,
		ResourcePath: native.CustomMetadata.ProviderResourceID,
	}, nil
}
