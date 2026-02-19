package models

import "github.com/openai/openai-go/v2"

// LSDModelsData contains a list of LSD models with pre-categorized sublists
// Uses OpenAI SDK's Model type directly for maximum compatibility.
// Categorization is performed server-side in the repository layer based on model ID patterns.

// Note: Always create a bespoke type for list types, this creates minimal work later if implementing pagination
// as the necessary metadata can be added at a later date without breaking the API.
type LSDModelsData struct {
	Models          []openai.Model `json:"models"`           // Complete list of all models
	LLMModels       []openai.Model `json:"llm_models"`       // Pre-filtered LLM models only
	EmbeddingModels []openai.Model `json:"embedding_models"` // Pre-filtered embedding models only
}
