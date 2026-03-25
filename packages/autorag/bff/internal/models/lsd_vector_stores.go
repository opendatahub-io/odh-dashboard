package models

// LSDVectorStore represents a vector store in our stable public API format.
// This is the contract exposed to the frontend and should remain stable.
type LSDVectorStore struct {
	ID       string `json:"id"`       // Vector store identifier (e.g., "ls_milvus")
	Name     string `json:"name"`     // Human-readable name
	Status   string `json:"status"`   // Status: "expired", "in_progress", or "completed"
	Provider string `json:"provider"` // Database provider (e.g., "milvus", "faiss", "chromadb")
}

// LSDVectorStoresData wraps the vector store list for the API response.
// Note: Always create a bespoke type for list types, this creates minimal work later if implementing pagination
// as the necessary metadata can be added at a later date without breaking the API.
type LSDVectorStoresData struct {
	VectorStores []LSDVectorStore `json:"vector_stores"`
}
