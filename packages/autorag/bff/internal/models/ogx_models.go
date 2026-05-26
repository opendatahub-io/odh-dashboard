package models

// OGXNativeModel represents the internal format that Open GenAI Stack returns.
// This is private and can change when Open GenAI Stack updates their API.
// It is NOT exposed to the frontend - only used for parsing.
//
// CustomMetadata is a pointer so we can distinguish "field missing" (nil) from
// "field present but empty", enabling defensive degradation when upstream
// Open GenAI Stack changes its schema.
type OGXNativeModel struct {
	ID             string             `json:"id"`                        // Model identifier from OGX
	CustomMetadata *OGXCustomMetadata `json:"custom_metadata,omitempty"` // Nested metadata from Open GenAI Stack (nil if schema changes)
}

// OGXCustomMetadata represents the custom_metadata nested object in OGX's response.
type OGXCustomMetadata struct {
	ModelType          string `json:"model_type,omitempty"`           // Model type from Open GenAI Stack (critical for UI filtering)
	ProviderID         string `json:"provider_id,omitempty"`          // Provider identifier from OGX
	ProviderResourceID string `json:"provider_resource_id,omitempty"` // Full provider resource path from OGX
}

// OGXModel represents a model in our stable public API format.
// This is the contract exposed to the frontend and should remain stable.
// Changes to OGX's format are absorbed by the translation layer.
type OGXModel struct {
	ID           string `json:"id"`            // Model identifier (e.g., "llama3.2:3b")
	Type         string `json:"type"`          // Model type: "llm" or "embedding"
	Provider     string `json:"provider"`      // Provider identifier (e.g., "ollama")
	ResourcePath string `json:"resource_path"` // Full provider resource path
}

// Note: Always create a bespoke type for list types, this creates minimal work later if implementing pagination
// as the necessary metadata can be added at a later date without breaking the API.
type OGXModelsData struct {
	Models []OGXModel `json:"models"` // Complete list of all models
}
