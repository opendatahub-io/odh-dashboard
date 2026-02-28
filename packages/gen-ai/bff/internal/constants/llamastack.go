package constants

import (
	"log/slog"
	"os"
	"strconv"
)

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
// Supports overriding via environment variables for testing with different providers:
//   - DEFAULT_EMBEDDING_MODEL: override model ID
//   - DEFAULT_EMBEDDING_DIMENSION: override dimension (int)
func DefaultEmbeddingModel() EmbeddingModelConfig {
	cfg := EmbeddingModelConfig{
		ModelID:            "sentence-transformers/ibm-granite/granite-embedding-125m-english",
		ProviderID:         "sentence-transformers",
		ProviderModelID:    "ibm-granite/granite-embedding-125m-english",
		EmbeddingDimension: 768,
	}

	if model := os.Getenv("DEFAULT_EMBEDDING_MODEL"); model != "" {
		cfg.ModelID = model
	}
	if dim := os.Getenv("DEFAULT_EMBEDDING_DIMENSION"); dim != "" {
		if d, err := strconv.ParseInt(dim, 10, 64); err == nil {
			cfg.EmbeddingDimension = d
		} else {
			slog.Warn("invalid DEFAULT_EMBEDDING_DIMENSION, using default", "value", dim, "error", err)
		}
	}

	return cfg
}
