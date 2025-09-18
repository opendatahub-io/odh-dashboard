package models

// Tool represents a tool configuration
type Tool struct {
	Type           string   `json:"type"`
	VectorStoreIDs []string `json:"vector_store_ids"`
}

// FileUpload represents a file to be uploaded
type FileUpload struct {
	File    string `json:"file"`
	Purpose string `json:"purpose"`
}

// VectorStoreConfig represents vector store configuration
type VectorStoreConfig struct {
	Name               string `json:"name"`
	EmbeddingModel     string `json:"embedding_model"`
	EmbeddingDimension int    `json:"embedding_dimension"`
	ProviderID         string `json:"provider_id"`
}

type CodeExportRequest struct {
	Input        string             `json:"input"`
	Model        string             `json:"model"`
	Instructions string             `json:"instructions"`
	Stream       bool               `json:"stream"`
	Temperature  float64            `json:"temperature"`
	Tools        []Tool             `json:"tools"`
	VectorStore  *VectorStoreConfig `json:"vector_store,omitempty"`
	Files        []FileUpload       `json:"files,omitempty"`
}

type CodeExportResponse struct {
	Code string `json:"code"`
}
