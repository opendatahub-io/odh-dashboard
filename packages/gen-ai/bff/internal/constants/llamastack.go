package constants

// LlamaStack Distribution related constants
const (
	// LlamaStackConfigMapName is the default name of the LlamaStack configuration ConfigMap
	LlamaStackConfigMapName = "llama-stack-config"

	// LlamaStackConfigYAMLKey is the key for the config.yaml configuration in the ConfigMap (llama-stack v0.4.0+)
	LlamaStackConfigYAMLKey = "config.yaml"
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
//
// IMPORTANT: The frontend mirrors these values in
// packages/gen-ai/frontend/src/app/utilities/utils.ts (DEFAULT_EMBEDDING_MODEL_ID /
// DEFAULT_EMBEDDING_NORMALIZED_ID) so that computeEmbeddingModelStatus can treat this
// model as 'available' before any LSD is installed (it is auto-provisioned on install).
// If ModelID or ProviderModelID change here, update those frontend constants too.
func DefaultEmbeddingModel() EmbeddingModelConfig {
	return EmbeddingModelConfig{
		ModelID:            "sentence-transformers/ibm-granite/granite-embedding-125m-english",
		ProviderID:         "sentence-transformers",
		ProviderModelID:    "ibm-granite/granite-embedding-125m-english",
		EmbeddingDimension: 768,
	}
}
