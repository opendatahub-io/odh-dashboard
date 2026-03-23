package models

// ExternalVectorStoresDocument is the top-level structure of the gen-ai-aa-vector-stores ConfigMap data.
// It uses the two-section format: providers define connection details, registered_resources define stores.
type ExternalVectorStoresDocument struct {
	Providers           ProvidersSection           `yaml:"providers"`
	RegisteredResources RegisteredResourcesSection `yaml:"registered_resources"`
}

// ProvidersSection holds the list of vector IO providers.
type ProvidersSection struct {
	VectorIO []VectorIOProvider `yaml:"vector_io"`
}

// VectorIOProvider describes a single vector database provider
type VectorIOProvider struct {
	ProviderID   string `yaml:"provider_id"`
	ProviderType string `yaml:"provider_type"`
}

// RegisteredResourcesSection holds the list of registered vector store collections.
type RegisteredResourcesSection struct {
	VectorStores []RegisteredVectorStore `yaml:"vector_stores"`
}

// RegisteredVectorStore represents a single registered vector store collection entry.
type RegisteredVectorStore struct {
	ProviderID         string              `yaml:"provider_id"`
	VectorStoreID      string              `yaml:"vector_store_id"`
	EmbeddingModel     string              `yaml:"embedding_model"`
	EmbeddingDimension int                 `yaml:"embedding_dimension"`
	VectorStoreName    string              `yaml:"vector_store_name"`
	Metadata           VectorStoreMetadata `yaml:"metadata"`
}

// VectorStoreMetadata holds descriptive metadata for a registered vector store.
type VectorStoreMetadata struct {
	Description string `yaml:"description"`
}

// ExternalVectorStoreSummary is the frontend-safe summary of a single vector store.
// Sensitive fields (provider connection config, credential secret references) are not included.
// Embedding model status (not_available / available / registered) is computed client-side by the
// frontend using the already-loaded merged models data, mirroring the Add/Try in Playground pattern.
type ExternalVectorStoreSummary struct {
	VectorStoreID      string `json:"vector_store_id"`
	VectorStoreName    string `json:"vector_store_name"`
	ProviderID         string `json:"provider_id"`
	ProviderType       string `json:"provider_type"`
	EmbeddingModel     string `json:"embedding_model"`
	EmbeddingDimension int    `json:"embedding_dimension"`
	Description        string `json:"description,omitempty"`
}

// ExternalVectorStoresListData is the data payload for the list response.
type ExternalVectorStoresListData struct {
	VectorStores  []ExternalVectorStoreSummary `json:"vector_stores"`
	TotalCount    int                          `json:"total_count"`
	ConfigMapInfo ConfigMapInfo                `json:"config_map_info"`
}
