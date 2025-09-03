// This package temporarily holds definitions of the llamastack API datatypes. This will be
// replaced by a separate golang SDK at some point in the future.
package llamastack

const (
	LLMModelType       = "llm"
	EmbeddingModelType = "embedding"
)

type APIResponse struct {
	Data     interface{}       `json:"data"`
	Metadata *ResponseMetadata `json:"metadata,omitempty"`
}

// ResponseMetadata contains metadata about the API response
type ResponseMetadata struct {
	RequestID string `json:"request_id,omitempty"`
	Version   string `json:"version,omitempty"`
	Timestamp int64  `json:"timestamp,omitempty"`
}

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

// QueryEmbeddingModelRequest represents the request body for querying an embedding model
type QueryEmbeddingModelRequest struct {
	// A image content item
	Content     string   `json:"content"`
	VectorDBIDs []string `json:"vector_db_ids"`
	// Configuration for the RAG query generation.
	QueryConfig QueryConfigParam `json:"query_config"`
}

type QueryConfigParam struct {
	// Template for formatting each retrieved chunk in the context. Available
	// placeholders: {index} (1-based chunk ordinal), {chunk.content} (chunk content
	// string), {metadata} (chunk metadata dict). Default: "Result {index}\nContent:
	// {chunk.content}\nMetadata: {metadata}\n"
	ChunkTemplate string `json:"chunk_template"`
	// Maximum number of chunks to retrieve.
	MaxChunks int64 `json:"max_chunks"`
	// Maximum number of tokens in the context.
	MaxTokensInContext int64 `json:"max_tokens_in_context"`
}

type QueryEmbeddingModelResponse struct {
	Content  []ContentItem `json:"content"`
	Metadata Metadata      `json:"metadata"`
}

type ContentItem struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type Metadata struct {
	DocumentIDs []string  `json:"document_ids"`
	Chunks      []string  `json:"chunks"`
	Scores      []float64 `json:"scores"`
}

// Chat completion types
type ChatCompletionRequest struct {
	ModelID        string         `json:"model_id"`
	Messages       []ChatMessage  `json:"messages"`
	SamplingParams SamplingParams `json:"sampling_params"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type SamplingParams struct {
	Strategy  SamplingStrategy `json:"strategy"`
	MaxTokens int64            `json:"max_tokens"`
}

type SamplingStrategy struct {
	Type string `json:"type"`
}

type ChatCompletionResponse struct {
	Metrics           []Metric          `json:"metrics"`
	CompletionMessage CompletionMessage `json:"completion_message"`
	Logprobs          interface{}       `json:"logprobs"`
}

type Metric struct {
	Metric string      `json:"metric"`
	Value  interface{} `json:"value"`
	Unit   interface{} `json:"unit"`
}

type CompletionMessage struct {
	Role       string        `json:"role"`
	Content    string        `json:"content"`
	StopReason string        `json:"stop_reason"`
	ToolCalls  []interface{} `json:"tool_calls"`
}

// Legacy types for backward compatibility (used in mock)
type ChatChoice struct {
	Index        int         `json:"index"`
	Message      ChatMessage `json:"message"`
	FinishReason string      `json:"finish_reason"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}
