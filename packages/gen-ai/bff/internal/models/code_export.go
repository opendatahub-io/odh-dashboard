package models

// MCPServer represents MCP server configuration
type MCPServer struct {
	ServerLabel   string   `json:"server_label"`
	ServerURL     string   `json:"server_url"`
	Authorization string   `json:"authorization,omitempty"`
	AllowedTools  []string `json:"allowed_tools,omitempty"`
}

// Tool represents a tool configuration
type CodeExportTool struct {
	Type           string   `json:"type"`
	VectorStoreIDs []string `json:"vector_store_ids"`
}

// FileUpload represents a file to be uploaded
type FileUpload struct {
	File    string `json:"file"`
	Purpose string `json:"purpose"`
}

// VectorStoreConfig represents vector store configuration.
// If ID is set, the vector store is external (pre-existing) and will be referenced by ID rather than created.
type VectorStoreConfig struct {
	ID                 string `json:"id,omitempty"`
	Name               string `json:"name"`
	EmbeddingModel     string `json:"embedding_model"`
	EmbeddingDimension int    `json:"embedding_dimension"`
	ProviderID         string `json:"provider_id"`
}

type PromptConfig struct {
	Name    string `json:"name"`
	Version int    `json:"version"`
}

type CodeExportRequest struct {
	Input        string             `json:"input"`
	Model        string             `json:"model"`
	Temperature  *float64           `json:"temperature,omitempty"`
	Instructions string             `json:"instructions,omitempty"`
	Stream       bool               `json:"stream,omitempty"`
	MCPServers   []MCPServer        `json:"mcp_servers,omitempty"`
	Tools        []CodeExportTool   `json:"tools,omitempty"`
	VectorStore  *VectorStoreConfig `json:"vector_store,omitempty"`
	Files        []FileUpload       `json:"files,omitempty"`
	Prompt       *PromptConfig      `json:"prompt,omitempty"`
}

type CodeExportResponse struct {
	Code string `json:"code"`
}
