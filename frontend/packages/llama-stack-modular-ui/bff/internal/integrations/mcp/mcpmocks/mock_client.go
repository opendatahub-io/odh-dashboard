package mcpmocks

import (
	"context"
	"log/slog"
	"time"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/mcp"
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
func (m *MockMCPClient) CheckConnectionStatus(ctx context.Context, identity *integrations.RequestIdentity, serverURL string) (*mcp.ConnectionStatus, error) {
	if m.logger != nil {
		m.logger.Debug("Mock: Checking MCP server connection status", "server_url", serverURL)
	}

	// Get timestamp to use
	timestamp := time.Now().Unix()
	if m.fixedTimestamp != nil {
		timestamp = *m.fixedTimestamp
	}

	// Return different mock responses based on server URL for testing
	switch serverURL {
	case "https://mcp-unavailable:8080":
		return &mcp.ConnectionStatus{
			ServerURL:   serverURL,
			Status:      "disconnected",
			Message:     "Mock: Server is unavailable",
			LastChecked: timestamp,
		}, nil
	case "https://mcp-error:8080":
		return &mcp.ConnectionStatus{
			ServerURL:   serverURL,
			Status:      "error",
			Message:     "Mock: Server returned error 500",
			LastChecked: timestamp,
		}, nil
	default:
		return &mcp.ConnectionStatus{
			ServerURL:   serverURL,
			Status:      "connected",
			Message:     "Mock: Server is responsive",
			LastChecked: timestamp,
		}, nil
	}
}

// ListTools returns mock tool list
func (m *MockMCPClient) ListTools(ctx context.Context, identity *integrations.RequestIdentity, serverURL string) (*mcp.ToolList, error) {
	if m.logger != nil {
		m.logger.Debug("Mock: Listing tools from MCP server", "server_url", serverURL)
	}

	// Return different mock tools based on server URL
	var tools []mcp.Tool

	switch serverURL {
	case "https://mcp-one:8080":
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
	case "https://mcp-two:8080":
		tools = []mcp.Tool{
			{
				Name:        "github_list_repos",
				Description: "List repositories in a GitHub organization",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"org": map[string]interface{}{
							"type":        "string",
							"description": "GitHub organization name",
						},
					},
					"required": []string{"org"},
				},
			},
			{
				Name:        "github_create_issue",
				Description: "Create a new issue in a GitHub repository",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"repo": map[string]interface{}{
							"type":        "string",
							"description": "Repository name",
						},
						"title": map[string]interface{}{
							"type":        "string",
							"description": "Issue title",
						},
						"body": map[string]interface{}{
							"type":        "string",
							"description": "Issue body",
						},
					},
					"required": []string{"repo", "title"},
				},
			},
		}
	case "https://mcp-unavailable:8080":
		// Simulate server unavailable
		return nil, mcp.NewServerUnavailableError(serverURL)
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
		ServerURL: serverURL,
		Tools:     tools,
	}, nil
}
