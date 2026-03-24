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

// SecretKeyRef references a specific key within a Kubernetes Secret.
type SecretKeyRef struct {
	Name string `yaml:"name"`
	Key  string `yaml:"key"`
}

// CustomGenAICredentials holds the credential secret references for a provider.
type CustomGenAICredentials struct {
	SecretRefs []SecretKeyRef `yaml:"secretRefs,omitempty"`
}

// CustomGenAIConfig holds BFF-only metadata stored under custom_gen_ai in the provider config.
// It is stripped before the config is forwarded to LlamaStack.
type CustomGenAIConfig struct {
	Credentials *CustomGenAICredentials `yaml:"credentials,omitempty"`
}

// VectorIOProviderConfig holds a vector IO provider's connection config.
// CustomGenAI is BFF-only metadata; all other fields are passed through to LlamaStack as-is.
type VectorIOProviderConfig struct {
	CustomGenAI *CustomGenAIConfig     `yaml:"custom_gen_ai,omitempty"`
	Extra       map[string]interface{} `yaml:",inline"`
}

// VectorIOProvider describes a single vector database provider.
type VectorIOProvider struct {
	ProviderID   string                 `yaml:"provider_id"`
	ProviderType string                 `yaml:"provider_type"`
	Config       VectorIOProviderConfig `yaml:"config,omitempty"`
}

// RegisteredResourcesSection holds the list of registered vector store collections.
type RegisteredResourcesSection struct {
	VectorStores []RegisteredVectorStore `yaml:"vector_stores"`
}

// VectorStoreMetadata holds optional descriptive metadata for a registered vector store.
type VectorStoreMetadata struct {
	Description string `yaml:"description,omitempty"`
}

// RegisteredVectorStore represents a single registered vector store collection entry.
type RegisteredVectorStore struct {
	ProviderID            string              `yaml:"provider_id"`
	VectorStoreID         string              `yaml:"vector_store_id"`
	EmbeddingModel        string              `yaml:"embedding_model"`
	EmbeddingDimension    int                 `yaml:"embedding_dimension"`
	VectorStoreName       string              `yaml:"vector_store_name,omitempty"`
	ProviderVectorStoreID string              `yaml:"provider_vector_store_id,omitempty"`
	Metadata              VectorStoreMetadata `yaml:"metadata,omitempty"`
}

// ExternalVectorStoreSummary is the frontend-safe summary of a single vector store.
// Sensitive fields (provider connection config, credential secret references) are not included.
// Embedding model status (not_available / available / registered) is computed client-side.
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
