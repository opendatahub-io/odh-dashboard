package models

// ExternalModelRequest represents the request to create an external model
type ExternalModelRequest struct {
	ModelID            string        `json:"model_id"`
	ModelDisplayName   string        `json:"model_display_name"`
	BaseURL            string        `json:"base_url"`
	SecretValue        string        `json:"secret_value"`
	UseCases           string        `json:"use_cases,omitempty"`
	ModelType          ModelTypeEnum `json:"model_type"`
	EmbeddingDimension *int          `json:"embedding_dimension,omitempty"`
}

// VerifyExternalModelRequest represents a request to verify an external model
type VerifyExternalModelRequest struct {
	ModelID            string        `json:"model_id"`
	BaseURL            string        `json:"base_url"`
	SecretValue        string        `json:"secret_value"`
	ModelType          ModelTypeEnum `json:"model_type"`
	EmbeddingDimension *int          `json:"embedding_dimension,omitempty"`
}

// VerifyExternalModelResponse represents the verification result
type VerifyExternalModelResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	ResponseTime int    `json:"response_time_ms,omitempty"` // Optional: time taken
}

// ProviderTypeEnum represents supported provider types
type ProviderTypeEnum string

const (
	ProviderTypeOpenAI ProviderTypeEnum = "remote::openai"
)

// ModelTypeEnum represents supported model types
type ModelTypeEnum string

const (
	ModelTypeEmbedding ModelTypeEnum = "embedding"
	ModelTypeLLM       ModelTypeEnum = "llm"
)

// ExternalModelsConfig represents the structure of the gen-ai-aa-external-models ConfigMap
type ExternalModelsConfig struct {
	Providers           ProvidersConfig           `yaml:"providers"`
	RegisteredResources RegisteredResourcesConfig `yaml:"registered_resources"`
}

// ProvidersConfig represents the providers section
type ProvidersConfig struct {
	Inference []InferenceProvider `yaml:"inference"`
}

// InferenceProvider represents a single inference provider
type InferenceProvider struct {
	ProviderID   string           `yaml:"provider_id"`
	ProviderType ProviderTypeEnum `yaml:"provider_type"`
	Config       ProviderConfig   `yaml:"config"`
}

// ProviderConfig represents the provider configuration
type ProviderConfig struct {
	BaseURL       string      `yaml:"base_url"`
	AllowedModels []string    `yaml:"allowed_models,omitempty"`
	CustomGenAI   CustomGenAI `yaml:"custom_gen_ai"`
}

// CustomGenAI represents custom gen AI configuration
type CustomGenAI struct {
	APIKey APIKeyConfig `yaml:"api_key"`
}

// APIKeyConfig represents API key configuration
type APIKeyConfig struct {
	SecretRef SecretRef `yaml:"secretRef"`
}

// SecretRef represents a reference to a Kubernetes Secret
type SecretRef struct {
	Name string `yaml:"name"`
	Key  string `yaml:"key"`
}

// RegisteredResourcesConfig represents the registered resources section
type RegisteredResourcesConfig struct {
	Models []RegisteredModel `yaml:"models"`
}

// RegisteredModel represents a single registered model
type RegisteredModel struct {
	ProviderID string                  `yaml:"provider_id"`
	ModelID    string                  `yaml:"model_id"`
	ModelType  ModelTypeEnum           `yaml:"model_type"`
	Metadata   RegisteredModelMetadata `yaml:"metadata"`
}

// RegisteredModelMetadata represents metadata for a registered model
type RegisteredModelMetadata struct {
	DisplayName        string                      `yaml:"display_name"`
	EmbeddingDimension *int                        `yaml:"embedding_dimension,omitempty"`
	CustomGenAI        *RegisteredModelCustomGenAI `yaml:"custom_gen_ai,omitempty"`
}

// RegisteredModelCustomGenAI represents custom gen AI metadata
type RegisteredModelCustomGenAI struct {
	UseCases string `yaml:"use_cases,omitempty"`
}
