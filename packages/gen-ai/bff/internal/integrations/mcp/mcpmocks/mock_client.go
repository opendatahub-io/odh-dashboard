package mcpmocks

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MockMCPClient implements MCPClientInterface for testing
type MockMCPClient struct {
	logger         *slog.Logger
	fixedTimestamp *int64 // For deterministic testing
}

// getToolsForServer returns mock tools based on server URL
func (m *MockMCPClient) getToolsForServer(serverURL string) []models.Tool {
	switch serverURL {
	case "http://localhost:9091/mcp":
		return []models.Tool{
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
		return []models.Tool{
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
	case "http://localhost:9092/default-transport":
		return []models.Tool{
			{
				Name:        "default_transport_tool",
				Description: "A tool from server with default transport (streamable-http)",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"input": map[string]interface{}{
							"type":        "string",
							"description": "Input parameter for default transport tool",
						},
					},
					"required": []string{"input"},
				},
			},
		}
	case "http://localhost:9093/invalid-transport":
		return []models.Tool{
			{
				Name:        "invalid_transport_tool",
				Description: "A tool from server with invalid transport field (defaults to streamable-http)",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"input": map[string]interface{}{
							"type":        "string",
							"description": "Input parameter for invalid transport tool",
						},
					},
					"required": []string{"input"},
				},
			},
		}
	case "https://api.githubcopilot.com/mcp":
		// Generate 40 tools for GitHub Copilot mock
		githubToolNames := []string{
			"create_repository", "search_code", "get_file_contents", "push_files",
			"create_issue", "list_issues", "update_issue", "add_issue_comment",
			"create_pull_request", "list_pull_requests", "merge_pull_request", "get_pull_request",
			"list_commits", "get_commit", "compare_commits", "create_branch",
			"list_branches", "delete_branch", "create_release", "list_releases",
			"search_repositories", "get_repository", "fork_repository", "list_forks",
			"create_gist", "list_gists", "get_user", "list_user_repos",
			"create_webhook", "list_webhooks", "delete_webhook", "get_rate_limit",
			"list_notifications", "mark_notification_read", "list_starred", "star_repository",
			"list_collaborators", "add_collaborator", "remove_collaborator", "check_collaborator",
		}
		tools := make([]models.Tool, 40)
		for i := 0; i < 40; i++ {
			tools[i] = models.Tool{
				Name:        githubToolNames[i],
				Description: fmt.Sprintf("GitHub Copilot tool: %s", githubToolNames[i]),
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"input": map[string]interface{}{
							"type":        "string",
							"description": fmt.Sprintf("Input for %s", githubToolNames[i]),
						},
					},
					"required": []string{"input"},
				},
			}
		}
		return tools
	case "http://localhost:9094/high-tools":
		// Generate 5 tools (combined with GitHub's 40 = 45 total, triggering >40 warning)
		tools := make([]models.Tool, 5)
		for i := 0; i < 5; i++ {
			tools[i] = models.Tool{
				Name:        fmt.Sprintf("high_tools_operation_%d", i+1),
				Description: fmt.Sprintf("High tools server operation %d for testing >40 tools warning", i+1),
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"input": map[string]interface{}{
							"type":        "string",
							"description": fmt.Sprintf("Input for operation %d", i+1),
						},
					},
					"required": []string{"input"},
				},
			}
		}
		return tools
	default:
		return []models.Tool{
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
func (m *MockMCPClient) CheckConnectionStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig models.MCPServerConfig) (*models.ConnectionStatus, error) {
	if m.logger != nil {
		m.logger.Debug("Mock: Checking MCP server connection status", "server_url", serverConfig.URL, "transport", serverConfig.Transport)
	}

	timestamp := time.Now().Unix()
	if m.fixedTimestamp != nil {
		timestamp = *m.fixedTimestamp
	}

	switch serverConfig.URL {
	case "http://localhost:9090/sse":
		pingMs := int64(25)
		return &models.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "connected",
			Message:     "Connection successful",
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "brave-search-mcp-server",
				Version:         "1.2.3",
				ProtocolVersion: "2024-11-05",
			},
			PingResponseTimeMs: &pingMs,
		}, nil
	case "http://localhost:9091/mcp":
		pingMs := int64(18)
		return &models.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "connected",
			Message:     "Connection successful",
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "kubernetes-mcp-server",
				Version:         "2.0.1",
				ProtocolVersion: "2024-11-05",
			},
			PingResponseTimeMs: &pingMs,
		}, nil
	case "https://mcp-unavailable:8080/sse":
		return &models.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "error",
			Message:     "Server is not reachable",
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            serverConfig.Name,
				Version:         "N/A",
				ProtocolVersion: "",
			},
			ErrorDetails: &models.ErrorDetails{
				Code:       "connection_error",
				StatusCode: 503,
				RawError:   "failed to create SSE transport: dial tcp: connection refused",
			},
		}, nil
	case "https://mcp-error:8080/mcp":
		return &models.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "error",
			Message:     "Authentication failed",
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            serverConfig.Name,
				Version:         "N/A",
				ProtocolVersion: "",
			},
			ErrorDetails: &models.ErrorDetails{
				Code:       "unauthorized",
				StatusCode: 401,
				RawError:   "MCP initialization failed: authentication failed",
			},
		}, nil
	case "http://localhost:9092/default-transport":
		pingMs := int64(32)
		return &models.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "connected",
			Message:     "Connection successful",
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "default-transport-server",
				Version:         "1.0.0",
				ProtocolVersion: "2024-11-05",
			},
			PingResponseTimeMs: &pingMs,
		}, nil
	case "http://localhost:9093/invalid-transport":
		pingMs := int64(28)
		return &models.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "connected",
			Message:     "Connection successful",
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "invalid-transport-server",
				Version:         "0.9.5",
				ProtocolVersion: "2024-11-05",
			},
			PingResponseTimeMs: &pingMs,
		}, nil
	case "http://localhost:9094/high-tools":
		pingMs := int64(15)
		return &models.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "connected",
			Message:     "Connection successful",
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "high-tools-server",
				Version:         "1.0.0",
				ProtocolVersion: "2024-11-05",
			},
			PingResponseTimeMs: &pingMs,
		}, nil
	default:
		pingMs := int64(42)
		return &models.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "connected",
			Message:     "Connection successful",
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "generic-mcp-server",
				Version:         "1.0.0",
				ProtocolVersion: "2024-11-05",
			},
			PingResponseTimeMs: &pingMs,
		}, nil
	}
}

// ListToolsWithStatus provides comprehensive tools information (mock implementation)
func (m *MockMCPClient) ListToolsWithStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig models.MCPServerConfig) (*models.ToolsStatus, error) {
	timestamp := time.Now().Unix()
	if m.fixedTimestamp != nil {
		timestamp = *m.fixedTimestamp
	}

	switch serverConfig.URL {
	case "http://localhost:9090/sse":
		mockTools := m.getToolsForServer(serverConfig.URL)
		toolsCount := len(mockTools)
		return &models.ToolsStatus{
			ServerURL:   serverConfig.URL,
			Status:      "success",
			Message:     fmt.Sprintf("Successfully retrieved %d tools", toolsCount),
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "brave-search-mcp-server",
				Version:         "1.2.3",
				ProtocolVersion: "2024-11-05",
			},
			ToolsCount: &toolsCount,
			Tools:      mockTools,
		}, nil

	case "http://localhost:9091/mcp":
		mockTools := m.getToolsForServer(serverConfig.URL)
		toolsCount := len(mockTools)
		return &models.ToolsStatus{
			ServerURL:   serverConfig.URL,
			Status:      "success",
			Message:     fmt.Sprintf("Successfully retrieved %d tools", toolsCount),
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "kubernetes-mcp-server",
				Version:         "2.0.1",
				ProtocolVersion: "2024-11-05",
			},
			ToolsCount: &toolsCount,
			Tools:      mockTools,
		}, nil

	case "https://mcp-unavailable:8080/sse":
		return &models.ToolsStatus{
			ServerURL:   serverConfig.URL,
			Status:      "error",
			Message:     "Server is not reachable",
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            serverConfig.Name,
				Version:         "N/A",
				ProtocolVersion: "",
			},
			Tools: []models.Tool{},
			ErrorDetails: &models.ErrorDetails{
				Code:       "connection_error",
				StatusCode: 503,
				RawError:   "failed to create SSE transport: dial tcp: connection refused",
			},
		}, nil

	case "https://mcp-error:8080/mcp":
		return &models.ToolsStatus{
			ServerURL:   serverConfig.URL,
			Status:      "error",
			Message:     "Authentication failed",
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            serverConfig.Name,
				Version:         "N/A",
				ProtocolVersion: "",
			},
			Tools: []models.Tool{},
			ErrorDetails: &models.ErrorDetails{
				Code:       "unauthorized",
				StatusCode: 401,
				RawError:   "MCP initialization failed: authentication failed",
			},
		}, nil

	case "http://localhost:9092/default-transport":
		mockTools := m.getToolsForServer(serverConfig.URL)
		toolsCount := len(mockTools)
		return &models.ToolsStatus{
			ServerURL:   serverConfig.URL,
			Status:      "success",
			Message:     fmt.Sprintf("Successfully retrieved %d tools", toolsCount),
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "default-transport-server",
				Version:         "1.0.0",
				ProtocolVersion: "2024-11-05",
			},
			ToolsCount: &toolsCount,
			Tools:      mockTools,
		}, nil

	case "http://localhost:9093/invalid-transport":
		mockTools := m.getToolsForServer(serverConfig.URL)
		toolsCount := len(mockTools)
		return &models.ToolsStatus{
			ServerURL:   serverConfig.URL,
			Status:      "success",
			Message:     fmt.Sprintf("Successfully retrieved %d tools", toolsCount),
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "invalid-transport-server",
				Version:         "0.9.5",
				ProtocolVersion: "2024-11-05",
			},
			ToolsCount: &toolsCount,
			Tools:      mockTools,
		}, nil

	case "http://localhost:9094/high-tools":
		mockTools := m.getToolsForServer(serverConfig.URL)
		toolsCount := len(mockTools)
		return &models.ToolsStatus{
			ServerURL:   serverConfig.URL,
			Status:      "success",
			Message:     fmt.Sprintf("Successfully retrieved %d tools", toolsCount),
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "high-tools-server",
				Version:         "1.0.0",
				ProtocolVersion: "2024-11-05",
			},
			ToolsCount: &toolsCount,
			Tools:      mockTools,
		}, nil

	default:
		mockTools := m.getToolsForServer(serverConfig.URL)
		toolsCount := len(mockTools)
		return &models.ToolsStatus{
			ServerURL:   serverConfig.URL,
			Status:      "success",
			Message:     fmt.Sprintf("Successfully retrieved %d tools", toolsCount),
			LastChecked: timestamp,
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            "generic-mcp-server",
				Version:         "1.0.0",
				ProtocolVersion: "2024-11-05",
			},
			ToolsCount: &toolsCount,
			Tools:      mockTools,
		}, nil
	}
}
