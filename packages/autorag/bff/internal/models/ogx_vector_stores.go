package models

// OGXProvider represents a single provider entry returned by the
// Open GenAI Stack /v1/providers endpoint.
type OGXProvider struct {
	API          string `json:"api"`           // API type (e.g., "vector_io", "inference")
	ProviderID   string `json:"provider_id"`   // Provider identifier (e.g., "milvus")
	ProviderType string `json:"provider_type"` // Provider implementation type (e.g., "remote::milvus")
}

// OGXVectorStoreProvider represents a vector store provider in our stable public API format.
// This is the contract exposed to the frontend and should remain stable.
type OGXVectorStoreProvider struct {
	ProviderID   string `json:"provider_id"`   // Provider identifier (e.g., "milvus")
	ProviderType string `json:"provider_type"` // Provider implementation type (e.g., "remote::milvus")
}

// OGXVectorStoreProvidersData wraps the vector store provider list for the API response.
// Note: Always create a bespoke type for list types, this creates minimal work later if implementing pagination
// as the necessary metadata can be added at a later date without breaking the API.
type OGXVectorStoreProvidersData struct {
	VectorStoreProviders []OGXVectorStoreProvider `json:"vector_store_providers"`
}
