package constants

type EmbeddingModelConfig struct {
	ModelID            string `json:"model_id"`
	ProviderID         string `json:"provider_id"`
	ProviderModelID    string `json:"provider_model_id"`
	EmbeddingDimension int64  `json:"embedding_dimension"`
}

var DefaultEmbeddingModel = EmbeddingModelConfig{
	ModelID:            "granite-embedding-125m",
	ProviderID:         "sentence-transformers",
	ProviderModelID:    "ibm-granite/granite-embedding-125m-english",
	EmbeddingDimension: 768,
}
