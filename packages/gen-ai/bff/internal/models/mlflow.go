package models

import "time"

// MLflowPromptScopeType indicates whether a prompt is project-scoped or global-scoped.
type MLflowPromptScopeType string

const (
	MLflowPromptScopeProject MLflowPromptScopeType = "project"
	MLflowPromptScopeGlobal  MLflowPromptScopeType = "global"
)

// MLflowPromptScope represents the scope of a prompt (global or project-specific).
type MLflowPromptScope struct {
	Type      MLflowPromptScopeType `json:"type"`
	Namespace string                `json:"namespace"`
	ReadOnly  bool                  `json:"read_only"`
}

// MLflowPromptModelConfig contains optional model configuration for a prompt.
type MLflowPromptModelConfig struct {
	Provider  string `json:"provider,omitempty"`
	ModelName string `json:"model_name,omitempty"`
}

// MLflowPrompt represents a prompt from MLflow in BFF response format.
type MLflowPrompt struct {
	Name              string                   `json:"name"`
	Description       string                   `json:"description"`
	LatestVersion     int                      `json:"latest_version"`
	ModelConfig       *MLflowPromptModelConfig `json:"model_config,omitempty"`
	Tags              map[string]string        `json:"tags,omitempty"`
	CreationTimestamp time.Time                `json:"creation_timestamp"`
	Scope             MLflowPromptScope        `json:"scope"`
}

// MLflowPromptsResponse is the response for listing MLflow prompts.
type MLflowPromptsResponse struct {
	Prompts          []MLflowPrompt `json:"prompts"`
	NextPageToken    string         `json:"next_page_token,omitempty"`
	TotalCount       int            `json:"total_count"`
	FailedNamespaces []string       `json:"failed_namespaces,omitempty"`
}

// MLflowMessage represents a single message in a chat prompt.
type MLflowMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// MLflowRegisterPromptRequest is the request body for creating or updating a prompt.
// Either Messages (chat prompt) or Template (text prompt) must be set, but not both.
// When CreateOnly is true, the request fails with 409 if a prompt with the given name already exists.
type MLflowRegisterPromptRequest struct {
	Name          string            `json:"name"`
	Messages      []MLflowMessage   `json:"messages,omitempty"`
	Template      string            `json:"template,omitempty"`
	CommitMessage string            `json:"commit_message,omitempty"`
	Tags          map[string]string `json:"tags,omitempty"`
	CreateOnly    bool              `json:"create_only,omitempty"`
}

// MLflowPromptVersion represents a full prompt version with content.
type MLflowPromptVersion struct {
	Name          string             `json:"name"`
	Version       int                `json:"version"`
	Template      string             `json:"template,omitempty"`
	Messages      []MLflowMessage    `json:"messages,omitempty"`
	CommitMessage string             `json:"commit_message,omitempty"`
	Aliases       []string           `json:"aliases,omitempty"`
	Tags          map[string]string  `json:"tags,omitempty"`
	CreatedAt     time.Time          `json:"created_at"`
	UpdatedAt     time.Time          `json:"updated_at"`
	Scope         *MLflowPromptScope `json:"scope,omitempty"`
}

// MLflowPromptVersionMeta represents version metadata without full content.
type MLflowPromptVersionMeta struct {
	Version       int               `json:"version"`
	CommitMessage string            `json:"commit_message,omitempty"`
	Aliases       []string          `json:"aliases,omitempty"`
	Tags          map[string]string `json:"tags,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

// MLflowPromptVersionsResponse is the response for listing prompt versions.
type MLflowPromptVersionsResponse struct {
	Versions      []MLflowPromptVersionMeta `json:"versions"`
	NextPageToken string                    `json:"next_page_token,omitempty"`
}

// MLflowMCPTool is a tool entry from the MLflow MCP Registry (metadata only).
type MLflowMCPTool struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// MLflowMCPServerVersion is a resolved MCP server version from the registry.
type MLflowMCPServerVersion struct {
	Version string          `json:"version"`
	Tools   []MLflowMCPTool `json:"tools,omitempty"`
}

// MLflowMCPEndpointSummary is an access endpoint embedded in an MCP server list entry.
type MLflowMCPEndpointSummary struct {
	EndpointURL     string                  `json:"endpoint_url"`
	TransportType   string                  `json:"transport_type,omitempty"`
	ResolvedVersion *MLflowMCPServerVersion `json:"resolved_version,omitempty"`
}

// MLflowMCPServer is an MCP Registry server entry from the MLflow BFF.
type MLflowMCPServer struct {
	Name            string                     `json:"name"`
	Description     string                     `json:"description,omitempty"`
	Status          string                     `json:"status,omitempty"`
	LatestVersion   string                     `json:"latest_version,omitempty"`
	AccessEndpoints []MLflowMCPEndpointSummary `json:"access_endpoints,omitempty"`
}

// MLflowMCPServersData is the list payload from GET /mcp-registry/servers.
type MLflowMCPServersData struct {
	Servers       []MLflowMCPServer `json:"servers"`
	NextPageToken string            `json:"next_page_token,omitempty"`
}

// MLflowMCPServersEnvelope wraps the MCP servers list response from MLflow BFF.
type MLflowMCPServersEnvelope struct {
	Data MLflowMCPServersData `json:"data"`
}

// MLflowMCPServerEnvelope wraps a single MCP server response from MLflow BFF.
type MLflowMCPServerEnvelope struct {
	Data MLflowMCPServer `json:"data"`
}
