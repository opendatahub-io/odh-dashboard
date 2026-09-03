package models

// MaaSNativeModel represents the internal format that Models as a Service returns.
// This is private and can change when Models as a Service updates their API.
// It is NOT exposed to the frontend - only used for parsing.
//
// CustomMetadata is a pointer so we can distinguish "field missing" (nil) from
// "field present but empty", enabling defensive degradation when upstream
// Models as a Service changes its schema.
type MaaSNativeModel struct {
	ID             string              `json:"id"`                        // Model identifier from MaaS
	CustomMetadata *MaaSCustomMetadata `json:"custom_metadata,omitempty"` // Nested metadata from Models as a Service (nil if schema changes)
}

// MaaSCustomMetadata represents the custom_metadata nested object in MaaS's response.
type MaaSCustomMetadata struct {
	ModelType          string `json:"model_type,omitempty"`           // Model type from Models as a Service (critical for UI filtering)
	ProviderID         string `json:"provider_id,omitempty"`          // Provider identifier from MaaS
	ProviderResourceID string `json:"provider_resource_id,omitempty"` // Full provider resource path from MaaS
}

// MaaSModel represents a model in our stable public API format.
// This is the contract exposed to the frontend and should remain stable.
// Changes to MaaS's format are absorbed by the translation layer.
type MaaSModel struct {
	ID           string `json:"id"`            // Model identifier (e.g., "llama3.2:3b")
	Type         string `json:"type"`          // Model type: "llm" or "embedding"
	Provider     string `json:"provider"`      // Provider identifier (e.g., "ollama")
	ResourcePath string `json:"resource_path"` // Full provider resource path
}

// Note: Always create a bespoke type for list types, this creates minimal work later if implementing pagination
// as the necessary metadata can be added at a later date without breaking the API.
type MaaSModelsData struct {
	Models []MaaSModel `json:"models"` // Complete list of all models
}

// MaaSProvider represents a single provider entry returned by the
// Models as a Service /v1/providers endpoint.
type MaaSProvider struct {
	API          string `json:"api"`           // API type (e.g., "vector_io", "inference")
	ProviderID   string `json:"provider_id"`   // Provider identifier (e.g., "milvus")
	ProviderType string `json:"provider_type"` // Provider implementation type (e.g., "remote::milvus")
}

// MaaSVectorStoreProvider represents a vector store provider in our stable public API format.
// This is the contract exposed to the frontend and should remain stable.
type MaaSVectorStoreProvider struct {
	ProviderID   string `json:"provider_id"`   // Provider identifier (e.g., "milvus")
	ProviderType string `json:"provider_type"` // Provider implementation type (e.g., "remote::milvus")
}

// MaaSVectorStoreProvidersData wraps the vector store provider list for the API response.
// Note: Always create a bespoke type for list types, this creates minimal work later if implementing pagination
// as the necessary metadata can be added at a later date without breaking the API.
type MaaSVectorStoreProvidersData struct {
	VectorStoreProviders []MaaSVectorStoreProvider `json:"vector_store_providers"`
}
