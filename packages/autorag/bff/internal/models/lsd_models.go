package models

// LlamaStackNativeModel represents the internal format that LlamaStack returns.
// This is private and can change when LlamaStack updates their API.
// It is NOT exposed to the frontend - only used for parsing.
type LlamaStackNativeModel struct {
	Identifier         string `json:"identifier"`           // Model identifier from LlamaStack
	ModelType          string `json:"model_type"`           // Model type from LlamaStack
	ProviderID         string `json:"provider_id"`          // Provider identifier from LlamaStack
	ProviderResourceID string `json:"provider_resource_id"` // Full provider resource path from LlamaStack
}

// LSDModel represents a model in our stable public API format.
// This is the contract exposed to the frontend and should remain stable.
// Changes to LlamaStack's format are absorbed by the translation layer.
type LSDModel struct {
	ID           string `json:"id"`            // Model identifier (e.g., "llama3.2:3b")
	Type         string `json:"type"`          // Model type: "llm" or "embedding"
	Provider     string `json:"provider"`      // Provider identifier (e.g., "ollama")
	ResourcePath string `json:"resource_path"` // Full provider resource path
}

// Note: Always create a bespoke type for list types, this creates minimal work later if implementing pagination
// as the necessary metadata can be added at a later date without breaking the API.
type LSDModelsData struct {
	Models          []LSDModel `json:"models"`           // Complete list of all models
	LLMModels       []LSDModel `json:"llm_models"`       // Pre-filtered LLM models (type == "llm")
	EmbeddingModels []LSDModel `json:"embedding_models"` // Pre-filtered embedding models (type == "embedding")
}
