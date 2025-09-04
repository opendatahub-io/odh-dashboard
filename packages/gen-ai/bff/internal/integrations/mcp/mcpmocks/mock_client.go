package mcpmocks

import (
	"context"
	"log/slog"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp"
)

// MockMCPClient implements MCPClientInterface for testing
type MockMCPClient struct {
	logger         *slog.Logger
	fixedTimestamp *int64 // For deterministic testing
}

// NewMockMCPClient creates a new mock MCP client
func NewMockMCPClient(logger *slog.Logger) *MockMCPClient {
	return &MockMCPClient{
		logger: logger,
	}
}

// NewMockMCPClientWithFixedTime creates a new mock MCP client with fixed timestamp for deterministic testing
func NewMockMCPClientWithFixedTime(logger *slog.Logger, timestamp int64) *MockMCPClient {
	return &MockMCPClient{
		logger:         logger,
		fixedTimestamp: &timestamp,
	}
}

// CheckConnectionStatus returns mock connection status
func (m *MockMCPClient) CheckConnectionStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig mcp.MCPServerConfig) (*mcp.ConnectionStatus, error) {
	if m.logger != nil {
		m.logger.Debug("Mock: Checking MCP server connection status", "server_url", serverConfig.URL, "transport", serverConfig.Transport)
	}

	// Get timestamp to use
	timestamp := time.Now().Unix()
	if m.fixedTimestamp != nil {
		timestamp = *m.fixedTimestamp
	}

	// Get version directly from mock MCP server simulation
	version := m.getMockMCPServerVersion(serverConfig)

	// Return different mock responses based on server URL for testing
	switch serverConfig.URL {
	case "http://localhost:9090/sse":
		return &mcp.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "connected",
			Message:     "Mock: Brave SSE server is healthy",
			LastChecked: timestamp,
			Version:     version,
		}, nil
	case "http://localhost:9091/mcp":
		return &mcp.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "connected",
			Message:     "Mock: Kubernetes streamable-http server is responding",
			LastChecked: timestamp,
			Version:     version,
		}, nil
	case "https://mcp-unavailable:8080/sse":
		return &mcp.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "disconnected",
			Message:     "Mock: Server is unavailable",
			LastChecked: timestamp,
			Version:     version,
		}, nil
	case "https://mcp-error:8080/mcp":
		return &mcp.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "error",
			Message:     "Mock: Server returned error 500",
			LastChecked: timestamp,
			Version:     version,
		}, nil
	default:
		return &mcp.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "connected",
			Message:     "Mock: Server is responsive",
			LastChecked: timestamp,
			Version:     version,
		}, nil
	}
}

// ListTools returns mock tool list
func (m *MockMCPClient) ListTools(ctx context.Context, identity *integrations.RequestIdentity, serverConfig mcp.MCPServerConfig) (*mcp.ToolList, error) {
	if m.logger != nil {
		m.logger.Debug("Mock: Listing tools from MCP server", "server_url", serverConfig.URL, "transport", serverConfig.Transport)
	}

	// Return different mock tools based on server URL
	var tools []mcp.Tool

	switch serverConfig.URL {
	case "http://localhost:9091/mcp":
		tools = []mcp.Tool{
			{
				Name:        "kubectl_get_pods",
				Description: "Get list of pods in a namespace",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"namespace": map[string]interface{}{
							"type":        "string",
							"description": "Kubernetes namespace",
						},
					},
					"required": []string{"namespace"},
				},
			},
			{
				Name:        "kubectl_describe_pod",
				Description: "Describe a specific pod",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"namespace": map[string]interface{}{
							"type":        "string",
							"description": "Kubernetes namespace",
						},
						"pod_name": map[string]interface{}{
							"type":        "string",
							"description": "Pod name",
						},
					},
					"required": []string{"namespace", "pod_name"},
				},
			},
		}
	case "http://localhost:9090/sse":
		tools = []mcp.Tool{
			{
				Name:        "brave_web_search",
				Description: "Search the Internet using Brave Search",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"query": map[string]interface{}{
							"type":        "string",
							"description": "Search query",
						},
						"count": map[string]interface{}{
							"type":        "number",
							"description": "Number of results",
						},
					},
					"required": []string{"query"},
				},
			},
			{
				Name:        "brave_local_search",
				Description: "Search for local businesses and places",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"query": map[string]interface{}{
							"type":        "string",
							"description": "Local search query",
						},
					},
					"required": []string{"query"},
				},
			},
		}
	case "https://mcp-unavailable:8080/sse":
		// Simulate server unavailable
		return nil, mcp.NewServerUnavailableError(serverConfig.URL)
	default:
		// Default mock tools
		tools = []mcp.Tool{
			{
				Name:        "mock_tool",
				Description: "A mock tool for testing",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"input": map[string]interface{}{
							"type":        "string",
							"description": "Mock input parameter",
						},
					},
				},
			},
		}
	}

	return &mcp.ToolList{
		ServerURL: serverConfig.URL,
		Tools:     tools,
	}, nil
}

// getMockMCPServerVersion simulates retrieving version from MCP server initialization
func (m *MockMCPClient) getMockMCPServerVersion(serverConfig mcp.MCPServerConfig) string {
	// Simulate MCP server version retrieval based on URL
	switch serverConfig.URL {
	case "http://localhost:9090/sse":
		return "1.2.0" // Mock Brave server version from MCP initialization
	case "http://localhost:9091/mcp":
		return "2.1.0" // Mock Kubernetes server version from MCP initialization
	case "https://mcp-unavailable:8080/sse":
		return "N/A" // Simulate connection failure
	case "https://mcp-error:8080/mcp":
		return "N/A" // Simulate server error
	default:
		// Return mock version for unknown servers
		return "1.0.0"
	}
}
