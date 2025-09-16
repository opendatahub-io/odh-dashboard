package genaiassets

// ConnectionStatus represents the status of an MCP server connection
type ConnectionStatus struct {
	ServerURL   string `json:"server_url"`
	Status      string `json:"status"`       // "connected", "error"
	Message     string `json:"message"`      // Clean error message or success message
	LastChecked int64  `json:"last_checked"` // Unix timestamp

	ServerInfo struct {
		Name            string `json:"name"`             // MCP server name OR ConfigMap key fallback
		Version         string `json:"version"`          // MCP version OR "N/A"
		ProtocolVersion string `json:"protocol_version"` // MCP protocol version OR empty
	} `json:"server_info"`

	ErrorDetails       *ErrorDetails `json:"error_details,omitempty"`         // Only present when status is "error"
	PingResponseTimeMs *int64        `json:"ping_response_time_ms,omitempty"` // Only present on successful connection
}

// ErrorDetails provides structured error information for debugging and categorization
type ErrorDetails struct {
	Code       string `json:"code"`        // Error category: "connection_error", "unauthorized", "timeout", etc.
	StatusCode int    `json:"status_code"` // HTTP-equivalent status code: 503, 401, 403, 404, 500
	RawError   string `json:"raw_error"`   // Original raw error message for debugging
}

// Tool represents an MCP tool definition
type Tool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"input_schema"`
}

// ToolsStatus represents the comprehensive status and tools from an MCP server
type ToolsStatus struct {
	ServerURL   string `json:"server_url"`
	Status      string `json:"status"`       // "success", "error"
	Message     string `json:"message"`      // Success message or clean error message
	LastChecked int64  `json:"last_checked"` // Unix timestamp

	ServerInfo struct {
		Name            string `json:"name"`             // MCP server name OR ConfigMap key fallback
		Version         string `json:"version"`          // MCP version OR "N/A"
		ProtocolVersion string `json:"protocol_version"` // MCP protocol version OR empty
	} `json:"server_info"`

	ToolsCount   *int          `json:"tools_count,omitempty"`   // Only present on successful connection
	Tools        []Tool        `json:"tools"`                   // List of tools (empty array on error)
	ErrorDetails *ErrorDetails `json:"error_details,omitempty"` // Only present when status is "error"
}

// MCPServerConfig represents the configuration for an MCP server from ConfigMap
type MCPServerConfig struct {
	Name        string `json:"name"`                  // ConfigMap key name for the server
	URL         string `json:"url"`                   // Full URL with endpoint path included
	Transport   string `json:"transport,omitempty"`   // "sse" or "streamable-http" (defaults to "streamable-http")
	Description string `json:"description,omitempty"` // Optional description of the MCP server functionality
	Logo        string `json:"logo,omitempty"`        // Optional logo URL for the MCP server
}
