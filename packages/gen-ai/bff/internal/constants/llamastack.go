package constants

// LlamaStack Distribution related constants
const (
	// LlamaStackConfigMapName is the default name of the LlamaStack configuration ConfigMap
	LlamaStackConfigMapName = "llama-stack-config"

	// LlamaStackRunYAMLKey is the key for the run.yaml configuration in the ConfigMap
	LlamaStackRunYAMLKey = "run.yaml"
)

// Vector Store Providers
const (
	DefaultVectorStoreProvider = "milvus"
)

type EmbeddingModelConfig struct {
	ModelID            string `json:"model_id"`
	ProviderID         string `json:"provider_id"`
	ProviderModelID    string `json:"provider_model_id"`
	EmbeddingDimension int64  `json:"embedding_dimension"`
}

// DefaultEmbeddingModel returns the default embedding model configuration.
// This function returns a copy of the configuration, ensuring immutability.
func DefaultEmbeddingModel() EmbeddingModelConfig {
	return EmbeddingModelConfig{
		ModelID:            "granite-embedding-125m",
		ProviderID:         "sentence-transformers",
		ProviderModelID:    "ibm-granite/granite-embedding-125m-english",
		EmbeddingDimension: 768,
	}
}
