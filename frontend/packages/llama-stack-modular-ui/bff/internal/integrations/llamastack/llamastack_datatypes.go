// This package temporarily holds definitions of the llamastack API datatypes. This will be
// replaced by a separate golang SDK at some point in the future.
package llamastack

const (
	LLMModelType       = "llm"
	EmbeddingModelType = "embedding"
)

type ModelModelType string

type Model struct {
	Identifier         string         `json:"identifier"`
	ModelType          ModelModelType `json:"model_type"`
	ProviderID         string         `json:"provider_id"`
	ProviderResourceID string         `json:"provider_resource_id"`
}

type ModelList struct {
	Data []Model `json:"data"`
}

type VectorDB struct {
	EmbeddingDimension int64  `json:"embedding_dimension"`
	EmbeddingModel     string `json:"embedding_model"`
	Identifier         string `json:"identifier"`
	ProviderID         string `json:"provider_id"`
	ProviderResourceID string `json:"provider_resource_id"`
}

type VectorDBList struct {
	Data []VectorDB `json:"data"`
}

// TODO: This is designed to only hold text content for now.
// We can add support for other document types based on go client APIs.
type Document struct {
	DocumentID string         `json:"document_id"`
	Content    string         `json:"content"`
	Metadata   map[string]any `json:"metadata,omitempty"`

	// suggest to use only "string" for now.
	MimeType *string `json:"mime_type,omitempty"`
}

// DocumentInsertRequest represents the request body for inserting documents
// Based on Llama Stack API specification for /v1/tool-runtime/rag-tool/insert
type DocumentInsertRequest struct {
	Documents         []Document `json:"documents"`
	VectorDBID        string     `json:"vector_db_id"`
	ChunkSizeInTokens *int       `json:"chunk_size_in_tokens,omitempty"`
}
