package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/openai/openai-go/v2"
	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type LSDModelsRepository struct{}

func NewLSDModelsRepository() *LSDModelsRepository {
	return &LSDModelsRepository{}
}

// GetLSDModels retrieves all models from LlamaStack and categorizes them into LLM and embedding models
// It transforms LlamaStack's native format (identifier, model_type, provider_id) into
// OpenAI-compatible format (id, object, created, owned_by) for frontend consumption.
// The LlamaStack client is expected to be in the context (created by AttachLlamaStackClient middleware).
func (r *LSDModelsRepository) GetLSDModels(ctx context.Context) (*models.LSDModelsData, error) {
	// Get ready-to-use LlamaStack client from context using helper
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	rawModels, err := client.ListModels(ctx)
	if err != nil {
		return nil, fmt.Errorf("error fetching LSD models: %w", err)
	}

	// Transform LlamaStack format → OpenAI format
	allModels := make([]openai.Model, 0, len(rawModels))
	for _, rawModel := range rawModels {
		transformedModel := transformLlamaStackModel(rawModel)
		allModels = append(allModels, transformedModel)
	}

	// Initialize slices for categorized models
	llmModels := []openai.Model{}
	embeddingModels := []openai.Model{}

	// Categorize models based on model_type field or keyword matching
	for _, model := range allModels {
		if isEmbeddingModel(model) {
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

// transformLlamaStackModel converts LlamaStack native format to OpenAI-compatible format
// LlamaStack format: {identifier, model_type, provider_id, provider_resource_id}
// OpenAI format: {id, object, created, owned_by}
func transformLlamaStackModel(rawModel openai.Model) openai.Model {
	rawJSON := rawModel.RawJSON()
	if rawJSON == "" {
		// No transformation needed if no raw JSON (shouldn't happen but defensive)
		return rawModel
	}

	// Parse LlamaStack native fields
	var rawData map[string]interface{}
	if err := json.Unmarshal([]byte(rawJSON), &rawData); err != nil {
		// Can't parse, return as-is
		return rawModel
	}

	// Extract LlamaStack fields
	identifier, _ := rawData["identifier"].(string)
	providerID, _ := rawData["provider_id"].(string)

	// If already in OpenAI format (has "id" field), no transformation needed
	if rawModel.ID != "" {
		return rawModel
	}

	// Create OpenAI-compatible model
	// Note: We can't create a new openai.Model with a constructor, so we return a copy
	// with populated fields. The OpenAI SDK will handle the JSON marshaling.
	return openai.Model{
		ID:      identifier,            // identifier → id
		Object:  "model",                // Always "model" for OpenAI compatibility
		Created: time.Now().Unix(),      // Current timestamp (LlamaStack doesn't provide this)
		OwnedBy: providerID,             // provider_id → owned_by
		JSON:    rawModel.JSON,          // Preserve raw JSON for categorization
	}
}

// isEmbeddingModel determines if a model is an embedding model
// Strategy:
// 1. Parse model_type from raw JSON (LlamaStack native field)
// 2. Fall back to keyword matching on identifier field if model_type unavailable
//
// Background: LlamaStack returns native format with "identifier" and "model_type" fields,
// while OpenAI SDK expects "id", "object", "created", "owned_by". The SDK preserves
// the raw JSON even when it can't map fields, allowing us to parse LlamaStack-specific data.
func isEmbeddingModel(model openai.Model) bool {
	rawJSON := model.RawJSON()
	if rawJSON == "" {
		// No raw JSON available, fall back to keyword matching on ID
		return isEmbeddingModelByKeyword(model.ID)
	}

	// Parse raw JSON to access LlamaStack native fields
	var rawData map[string]interface{}
	if err := json.Unmarshal([]byte(rawJSON), &rawData); err != nil {
		// JSON parsing failed, fall back to keyword matching
		return isEmbeddingModelByKeyword(model.ID)
	}

	// Strategy 1: Check for model_type field (LlamaStack native format)
	if modelType, ok := rawData["model_type"].(string); ok {
		return modelType == "embedding"
	}

	// Strategy 2: Fall back to keyword matching on identifier field
	// LlamaStack uses "identifier" instead of "id"
	modelIdentifier := model.ID
	if modelIdentifier == "" {
		// Try to extract identifier from raw JSON
		if identifier, ok := rawData["identifier"].(string); ok {
			modelIdentifier = identifier
		}
	}

	return isEmbeddingModelByKeyword(modelIdentifier)
}

// isEmbeddingModelByKeyword checks if a model identifier contains embedding-related keywords
// This is a fallback when model_type field is not available
func isEmbeddingModelByKeyword(modelIdentifier string) bool {
	if modelIdentifier == "" {
		return false
	}

	// Convert to lowercase for case-insensitive matching
	id := strings.ToLower(modelIdentifier)

	// Keywords that identify embedding models
	embeddingKeywords := []string{
		"embed",             // Generic embedding identifier (e.g., "nomic-embed-text")
		"embedding",         // Alternative embedding identifier (e.g., "granite-embedding")
		"all-mini",          // all-MiniLM models (e.g., "all-minilm:l6-v2")
		"nomic",             // Nomic embedding models
		"bge",               // BGE (BAAI General Embedding) models
		"e5",                // E5 embedding models from Microsoft
		"instructor",        // Instructor embedding models
		"granite-embedding", // IBM Granite embedding models
	}

	// Check if any embedding keyword is present in the model identifier
	for _, keyword := range embeddingKeywords {
		if strings.Contains(id, keyword) {
			return true
		}
	}

	return false
}
