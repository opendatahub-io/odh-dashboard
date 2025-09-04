package mcpmocks

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
)

// MockMCPClient implements MCPClientInterface for testing
type MockMCPClient struct {
	logger         *slog.Logger
	fixedTimestamp *int64 // For deterministic testing
}

// getToolsForServer returns mock tools based on server URL
func (m *MockMCPClient) getToolsForServer(serverURL string) []genaiassets.Tool {
	switch serverURL {
	case "http://localhost:9091/mcp":
		return []genaiassets.Tool{
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
		return []genaiassets.Tool{
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
		return []genaiassets.Tool{
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
		return []genaiassets.Tool{
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
		return []genaiassets.Tool{
			{
				Name:        "kubectl_get_pods",
				Description: "List pods in a Kubernetes namespace",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"namespace": map[string]interface{}{
							"type":        "string",
							"description": "Kubernetes namespace to list pods from",
						},
						"label_selector": map[string]interface{}{
							"type":        "string",
							"description": "Optional label selector to filter pods",
						},
					},
					"required": []string{"namespace"},
				},
			},
			{
				Name:        "kubectl_get_services",
				Description: "List services in a Kubernetes namespace",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"namespace": map[string]interface{}{
							"type":        "string",
							"description": "Kubernetes namespace to list services from",
						},
					},
					"required": []string{"namespace"},
				},
			},
			{
				Name:        "kubectl_get_deployments",
				Description: "List deployments in a Kubernetes namespace",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"namespace": map[string]interface{}{
							"type":        "string",
							"description": "Kubernetes namespace to list deployments from",
						},
					},
					"required": []string{"namespace"},
				},
			},
			{
				Name:        "kubectl_describe_resource",
				Description: "Describe a specific Kubernetes resource",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"resource_type": map[string]interface{}{
							"type":        "string",
							"description": "Type of Kubernetes resource (pod, service, deployment, etc.)",
						},
						"resource_name": map[string]interface{}{
							"type":        "string",
							"description": "Name of the resource",
						},
						"namespace": map[string]interface{}{
							"type":        "string",
							"description": "Kubernetes namespace",
						},
					},
					"required": []string{"resource_type", "resource_name", "namespace"},
				},
			},
			{
				Name:        "kubectl_get_logs",
				Description: "Get logs from a pod",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"pod_name": map[string]interface{}{
							"type":        "string",
							"description": "Name of the pod",
						},
						"namespace": map[string]interface{}{
							"type":        "string",
							"description": "Kubernetes namespace",
						},
						"container": map[string]interface{}{
							"type":        "string",
							"description": "Optional container name",
						},
						"tail": map[string]interface{}{
							"type":        "number",
							"description": "Number of lines to show from the end of the logs",
						},
					},
					"required": []string{"pod_name", "namespace"},
				},
			},
		}
	default:
		return []genaiassets.Tool{
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
func (m *MockMCPClient) CheckConnectionStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig genaiassets.MCPServerConfig) (*genaiassets.ConnectionStatus, error) {
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
		return &genaiassets.ConnectionStatus{
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
		return &genaiassets.ConnectionStatus{
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
		return &genaiassets.ConnectionStatus{
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
			ErrorDetails: &genaiassets.ErrorDetails{
				Code:       "connection_error",
				StatusCode: 503,
				RawError:   "failed to create SSE transport: dial tcp: connection refused",
			},
		}, nil
	case "https://mcp-error:8080/mcp":
		return &genaiassets.ConnectionStatus{
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
			ErrorDetails: &genaiassets.ErrorDetails{
				Code:       "unauthorized",
				StatusCode: 401,
				RawError:   "MCP initialization failed: authentication failed",
			},
		}, nil
	case "http://localhost:9092/default-transport":
		pingMs := int64(32)
		return &genaiassets.ConnectionStatus{
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
		return &genaiassets.ConnectionStatus{
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
	default:
		pingMs := int64(42)
		return &genaiassets.ConnectionStatus{
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
func (m *MockMCPClient) ListToolsWithStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig genaiassets.MCPServerConfig) (*genaiassets.ToolsStatus, error) {
	timestamp := time.Now().Unix()
	if m.fixedTimestamp != nil {
		timestamp = *m.fixedTimestamp
	}

	switch serverConfig.URL {
	case "http://localhost:9090/sse":
		mockTools := m.getToolsForServer(serverConfig.URL)
		toolsCount := len(mockTools)
		return &genaiassets.ToolsStatus{
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
		return &genaiassets.ToolsStatus{
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
		return &genaiassets.ToolsStatus{
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
			Tools: []genaiassets.Tool{},
			ErrorDetails: &genaiassets.ErrorDetails{
				Code:       "connection_error",
				StatusCode: 503,
				RawError:   "failed to create SSE transport: dial tcp: connection refused",
			},
		}, nil

	case "https://mcp-error:8080/mcp":
		return &genaiassets.ToolsStatus{
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
			Tools: []genaiassets.Tool{},
			ErrorDetails: &genaiassets.ErrorDetails{
				Code:       "unauthorized",
				StatusCode: 401,
				RawError:   "MCP initialization failed: authentication failed",
			},
		}, nil

	case "http://localhost:9092/default-transport":
		mockTools := m.getToolsForServer(serverConfig.URL)
		toolsCount := len(mockTools)
		return &genaiassets.ToolsStatus{
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
		return &genaiassets.ToolsStatus{
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

	default:
		mockTools := m.getToolsForServer(serverConfig.URL)
		toolsCount := len(mockTools)
		return &genaiassets.ToolsStatus{
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
