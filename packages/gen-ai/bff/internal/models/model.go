package models

type Model struct {
	Identifier string `json:"identifier"`
	ProviderID string `json:"provider_id"`
	// Can be either llm or embedding
	ModelType          string `json:"model_type"`
	ProviderResourceID string `json:"provider_resource_id"`
}

// Note: Always create a bespoke type for list types, this creates minimal work later if implementing pagination
// as the necessary metadata can be added at a later date without breaking the API.

type ModelList struct {
	Items []Model `json:"items"`
}

type VectorDB struct {
	EmbeddingDimension int64  `json:"embedding_dimension"`
	EmbeddingModel     string `json:"embedding_model"`
	Identifier         string `json:"identifier"`
	ProviderID         string `json:"provider_id"`
	ProviderResourceID string `json:"provider_resource_id"`
}
type VectorDBList struct {
	Items []VectorDB `json:"items"`
}

type NamespaceModel struct {
	Name        string  `json:"name"`
	DisplayName *string `json:"displayName,omitempty"`
}

func NewNamespaceModelFromNamespace(name string) NamespaceModel {
	displayName := name // For now, use name as display name, but this can be customized later
	return NamespaceModel{
		Name:        name,
		DisplayName: &displayName,
	}
}
