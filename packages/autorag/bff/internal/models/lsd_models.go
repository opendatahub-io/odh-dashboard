package models

// LSDModel represents a single model from LlamaStack Distribution (LSD)
type LSDModel struct {
	ID      string `json:"id"`
	Type    string `json:"type"` // Can be either "llm" or "embedding"
	Created int64  `json:"created"`
	OwnedBy string `json:"ownedBy"`
}

// LSDModelList contains a list of LSD models with pre-categorized sublists
// Note: Always create a bespoke type for list types, this creates minimal work later if implementing pagination
// as the necessary metadata can be added at a later date without breaking the API.
type LSDModelList struct {
	Models          []LSDModel `json:"models"`           // Complete list of all models
	LLMModels       []LSDModel `json:"llm_models"`       // Pre-filtered LLM models only
	EmbeddingModels []LSDModel `json:"embedding_models"` // Pre-filtered embedding models only
}
