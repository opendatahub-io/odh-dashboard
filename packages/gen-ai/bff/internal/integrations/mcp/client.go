package mcp

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
)

// MCPClientInterface defines the contract for MCP client operations
type MCPClientInterface interface {
	// Connection management
	CheckConnectionStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig MCPServerConfig) (*ConnectionStatus, error)

	// Tool operations
	ListTools(ctx context.Context, identity *integrations.RequestIdentity, serverConfig MCPServerConfig) (*ToolList, error)
}

// ConnectionStatus represents the status of an MCP server connection
type ConnectionStatus struct {
	ServerURL   string `json:"server_url"`
	Status      string `json:"status"` // "connected", "disconnected", "error"
	Message     string `json:"message,omitempty"`
	LastChecked int64  `json:"last_checked"` // Unix timestamp
	Version     string `json:"version"`      // Server version from MCP initialization or ConfigMap
}

// Tool represents an MCP tool definition
type Tool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"input_schema"`
}

// ToolList represents a list of tools from an MCP server
type ToolList struct {
	ServerURL string `json:"server_url"`
	Tools     []Tool `json:"tools"`
}

// MCPServerConfig represents the configuration for an MCP server from ConfigMap
type MCPServerConfig struct {
	URL         string `json:"url"`  // Full URL with endpoint path included
	Type        string `json:"type"` // Transport type: "sse" or "streamable-http"
	Description string `json:"description,omitempty"`
}
