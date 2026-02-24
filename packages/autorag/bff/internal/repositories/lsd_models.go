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

// GetLSDModels retrieves all models from LlamaStack and categorizes them into LLM and embedding models.
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

	llmModels := []models.LSDModel{}
	embeddingModels := []models.LSDModel{}

	// Categorize models based on the type field
	for _, model := range allModels {
		if model.Type == "embedding" {
			embeddingModels = append(embeddingModels, model)
		} else {
			llmModels = append(llmModels, model)
		}
	}

	return &models.LSDModelsData{
		Models:          allModels,
		LLMModels:       llmModels,
		EmbeddingModels: embeddingModels,
	}, nil
}

// parseLlamaStackModel parses LlamaStack's native JSON format and translates it to our stable public API format.
// This translation layer isolates our public API from changes in LlamaStack's response structure.
// LlamaStack native format: {identifier, model_type, provider_id, provider_resource_id}
// Our public API format: {id, type, provider, resource_path}
func parseLlamaStackModel(rawJSON string) (models.LSDModel, error) {
	if rawJSON == "" {
		return models.LSDModel{}, fmt.Errorf("empty raw JSON")
	}

	var native models.LlamaStackNativeModel
	if err := json.Unmarshal([]byte(rawJSON), &native); err != nil {
		return models.LSDModel{}, fmt.Errorf("failed to parse LlamaStack model: %w", err)
	}

	if native.Identifier == "" {
		return models.LSDModel{}, fmt.Errorf("LlamaStack model missing required 'identifier' field")
	}

	return models.LSDModel{
		ID:           native.Identifier,
		Type:         native.ModelType,
		Provider:     native.ProviderID,
		ResourcePath: native.ProviderResourceID,
	}, nil
}
