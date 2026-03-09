package models

// ExternalVectorStoresDocument is the top-level structure for the stores.yaml ConfigMap data.
type ExternalVectorStoresDocument struct {
	Version      int                         `json:"version" yaml:"version"`
	VectorStores []ExternalVectorStoreConfig `json:"vectorStores" yaml:"vectorStores"`
}

// ExternalVectorStoreConfig represents a single external vector store entry.
type ExternalVectorStoreConfig struct {
	Name             string                 `json:"name" yaml:"name"`
	DisplayName      string                 `json:"displayName,omitempty" yaml:"displayName,omitempty"`
	ProviderType     string                 `json:"provider_type" yaml:"provider_type"`
	Collection       string                 `json:"collection" yaml:"collection"`
	Config           map[string]interface{} `json:"config" yaml:"config"`
	CredentialSecret *SecretKeyRef          `json:"credentialSecret,omitempty" yaml:"credentialSecret,omitempty"`
	TLSSecretRef     *SecretKeyRef          `json:"tlsSecretRef,omitempty" yaml:"tlsSecretRef,omitempty"`
	Embedding        EmbeddingConfig        `json:"embedding" yaml:"embedding"`
	Description      string                 `json:"description,omitempty" yaml:"description,omitempty"`
	Owner            string                 `json:"owner,omitempty" yaml:"owner,omitempty"`
	Domain           string                 `json:"domain,omitempty" yaml:"domain,omitempty"`
}

// SecretKeyRef references a specific key within a Kubernetes Secret.
type SecretKeyRef struct {
	Name string `json:"name" yaml:"name"`
	Key  string `json:"key" yaml:"key"`
}

// EmbeddingConfig specifies the embedding model used for ingestion.
// Queries must use the same model to produce correct results.
type EmbeddingConfig struct {
	ModelID   string `json:"model_id" yaml:"model_id"`
	Dimension int    `json:"dimension" yaml:"dimension"`
}

// ExternalVectorStoreSummary represents a single external vector store for frontend display.
// Sensitive fields (credentialSecret, tlsSecretRef, config) are stripped.
type ExternalVectorStoreSummary struct {
	Name                    string          `json:"name"`
	DisplayName             string          `json:"displayName,omitempty"`
	ProviderType            string          `json:"provider_type"`
	Collection              string          `json:"collection"`
	Description             string          `json:"description,omitempty"`
	Owner                   string          `json:"owner,omitempty"`
	Domain                  string          `json:"domain,omitempty"`
	Embedding               EmbeddingConfig `json:"embedding"`
	EmbeddingModelAvailable bool            `json:"embedding_model_available"`
}

// ExternalVectorStoresListData is the data payload for the list response
type ExternalVectorStoresListData struct {
	VectorStores  []ExternalVectorStoreSummary `json:"vector_stores"`
	TotalCount    int                          `json:"total_count"`
	ConfigMapInfo ConfigMapInfo                `json:"config_map_info"`
}
