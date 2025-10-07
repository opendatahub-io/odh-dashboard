package mcp

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// SimpleMCPClient implements MCPClientInterface using one-shot connections
type SimpleMCPClient struct {
	logger           *slog.Logger
	config           *MCPClientConfig
	transportFactory TransportFactory
	httpClient       *http.Client
}

// NewSimpleMCPClient creates a new simple MCP client with default configuration
func NewSimpleMCPClient(logger *slog.Logger) *SimpleMCPClient {
	return NewSimpleMCPClientWithConfig(logger, nil)
}

// NewSimpleMCPClientWithConfig creates a new simple MCP client with custom configuration
func NewSimpleMCPClientWithConfig(logger *slog.Logger, config *MCPClientConfig) *SimpleMCPClient {
	if config == nil {
		config = DefaultMCPClientConfig()
	}

	if err := config.Validate(); err != nil {
		logger.Warn("Invalid MCP client configuration, using defaults", "error", err)
		config = DefaultMCPClientConfig()
	}

	transportFactory := NewMCPTransportFactory(config.ToTransportOptions())
	httpClient := &http.Client{
		Timeout: config.HealthCheckTimeout,
	}

	return &SimpleMCPClient{
		logger:           logger,
		config:           config,
		transportFactory: transportFactory,
		httpClient:       httpClient,
	}
}

// CheckConnectionStatus checks the connection status of an MCP server
func (c *SimpleMCPClient) CheckConnectionStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig models.MCPServerConfig) (*models.ConnectionStatus, error) {
	c.logger.Debug("Checking MCP server connection status", "server_url", serverConfig.URL)

	// Create fresh MCP client session for this request
	session, initResult, err := c.createMCPSessionWithInit(ctx, serverConfig, identity)
	if err != nil {
		c.logger.Error("Failed to create MCP session for status check", "error", err, "server_url", serverConfig.URL)

		mcpError := c.mapMCPError(err, serverConfig.URL)
		mcpErr, ok := mcpError.(*MCPError)
		if !ok {
			mcpErr = &MCPError{
				Code:       "internal_error",
				Message:    "MCP operation failed",
				ServerURL:  serverConfig.URL,
				StatusCode: http.StatusInternalServerError,
			}
		}

		return &models.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "error",
			Message:     mcpErr.Message,
			LastChecked: time.Now().Unix(),
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            serverConfig.Name, // ConfigMap key fallback on error
				Version:         "N/A",
				ProtocolVersion: "",
			},
			ErrorDetails: &models.ErrorDetails{
				Code:       mcpErr.Code,
				StatusCode: mcpErr.StatusCode,
				RawError:   err.Error(),
			},
		}, nil
	}
	defer session.Close()

	pingStart := time.Now()
	err = session.Ping(ctx, &mcp.PingParams{})
	pingDuration := time.Since(pingStart)

	if err != nil {
		c.logger.Error("MCP ping failed", "error", err, "server_url", serverConfig.URL)

		mcpError := c.mapMCPError(err, serverConfig.URL)
		mcpErr, ok := mcpError.(*MCPError)
		if !ok {
			mcpErr = &MCPError{
				Code:       "ping_failed",
				Message:    "MCP server ping failed",
				ServerURL:  serverConfig.URL,
				StatusCode: http.StatusServiceUnavailable,
			}
		}

		// Connection established but ping failed
		return &models.ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "error",
			Message:     mcpErr.Message,
			LastChecked: time.Now().Unix(),
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            c.extractServerName(initResult, serverConfig.Name),
				Version:         c.extractServerVersion(initResult),
				ProtocolVersion: c.extractProtocolVersion(initResult),
			},
			ErrorDetails: &models.ErrorDetails{
				Code:       mcpErr.Code,
				StatusCode: mcpErr.StatusCode,
				RawError:   err.Error(),
			},
		}, nil
	}

	pingMs := pingDuration.Milliseconds()
	c.logger.Debug("MCP server status check successful",
		"server_url", serverConfig.URL,
		"ping_ms", pingMs)

	return &models.ConnectionStatus{
		ServerURL:   serverConfig.URL,
		Status:      "connected",
		Message:     "Connection successful",
		LastChecked: time.Now().Unix(),
		ServerInfo: struct {
			Name            string `json:"name"`
			Version         string `json:"version"`
			ProtocolVersion string `json:"protocol_version"`
		}{
			Name:            c.extractServerName(initResult, serverConfig.Name),
			Version:         c.extractServerVersion(initResult),
			ProtocolVersion: c.extractProtocolVersion(initResult),
		},
		PingResponseTimeMs: &pingMs,
	}, nil
}

// ListToolsWithStatus provides comprehensive tools information with server metadata and error handling
func (c *SimpleMCPClient) ListToolsWithStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig models.MCPServerConfig) (*models.ToolsStatus, error) {
	c.logger.Debug("Listing tools with status from MCP server", "server_url", serverConfig.URL)

	// Create fresh MCP client session for this request
	session, initResult, err := c.createMCPSessionWithInit(ctx, serverConfig, identity)
	if err != nil {
		c.logger.Error("Failed to create MCP session for tools listing", "error", err, "server_url", serverConfig.URL)

		mcpError := c.mapMCPError(err, serverConfig.URL)
		mcpErr, ok := mcpError.(*MCPError)
		if !ok {
			mcpErr = &MCPError{
				Code:       "internal_error",
				Message:    "Failed to connect to MCP server",
				ServerURL:  serverConfig.URL,
				StatusCode: 500,
			}
		}

		return &models.ToolsStatus{
			ServerURL:   serverConfig.URL,
			Status:      "error",
			Message:     mcpErr.Message,
			LastChecked: time.Now().Unix(),
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
				Code:       mcpErr.Code,
				StatusCode: mcpErr.StatusCode,
				RawError:   err.Error(),
			},
		}, nil
	}
	defer session.Close()

	toolsResponse, err := session.ListTools(ctx, &mcp.ListToolsParams{})
	if err != nil {
		c.logger.Error("Failed to list tools from MCP server", "error", err, "server_url", serverConfig.URL)

		mcpError := c.mapMCPError(err, serverConfig.URL)
		mcpErr, ok := mcpError.(*MCPError)
		if !ok {
			mcpErr = &MCPError{
				Code:       "internal_error",
				Message:    "Failed to list tools from MCP server",
				ServerURL:  serverConfig.URL,
				StatusCode: 500,
			}
		}

		return &models.ToolsStatus{
			ServerURL:   serverConfig.URL,
			Status:      "error",
			Message:     mcpErr.Message,
			LastChecked: time.Now().Unix(),
			ServerInfo: struct {
				Name            string `json:"name"`
				Version         string `json:"version"`
				ProtocolVersion string `json:"protocol_version"`
			}{
				Name:            c.extractServerName(initResult, serverConfig.Name),
				Version:         c.extractServerVersion(initResult),
				ProtocolVersion: c.extractProtocolVersion(initResult),
			},
			Tools: []models.Tool{},
			ErrorDetails: &models.ErrorDetails{
				Code:       mcpErr.Code,
				StatusCode: mcpErr.StatusCode,
				RawError:   err.Error(),
			},
		}, nil
	}

	tools := make([]models.Tool, 0, len(toolsResponse.Tools))
	for _, mcpTool := range toolsResponse.Tools {
		tool := models.Tool{
			Name:        mcpTool.Name,
			Description: mcpTool.Description,
			InputSchema: convertMCPInputSchema(mcpTool.InputSchema),
		}
		tools = append(tools, tool)
	}

	c.logger.Debug("Successfully listed tools from MCP server",
		"server_url", serverConfig.URL,
		"tool_count", len(tools))

	toolsCount := len(tools)
	return &models.ToolsStatus{
		ServerURL:   serverConfig.URL,
		Status:      "success",
		Message:     fmt.Sprintf("Successfully retrieved %d tools", toolsCount),
		LastChecked: time.Now().Unix(),
		ServerInfo: struct {
			Name            string `json:"name"`
			Version         string `json:"version"`
			ProtocolVersion string `json:"protocol_version"`
		}{
			Name:            c.extractServerName(initResult, serverConfig.Name),
			Version:         c.extractServerVersion(initResult),
			ProtocolVersion: c.extractProtocolVersion(initResult),
		},
		ToolsCount: &toolsCount,
		Tools:      tools,
	}, nil
}

// createMCPSessionWithInit creates a fresh MCP session and returns both session and initialization result
func (c *SimpleMCPClient) createMCPSessionWithInit(ctx context.Context, serverConfig models.MCPServerConfig, identity *integrations.RequestIdentity) (*mcp.ClientSession, *mcp.InitializeResult, error) {
	client := mcp.NewClient(
		c.config.ToMCPImplementation(),
		c.config.ToMCPClientOptions(),
	)

	transportType := ValidateAndNormalizeTransportType(serverConfig.Transport, c.logger, serverConfig.URL)

	var transport mcp.Transport
	var err error

	transportOptions := c.config.ToTransportOptions()

	switch transportType {
	case TransportTypeSSE:
		transport, err = c.transportFactory.CreateSSETransport(serverConfig.URL, identity, transportOptions)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to create SSE transport: %w", err)
		}
	case TransportTypeStreamableHTTP:
		transport, err = c.transportFactory.CreateStreamableHTTPTransport(serverConfig.URL, identity, transportOptions)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to create StreamableHTTP transport: %w", err)
		}
	default:
		return nil, nil, fmt.Errorf("unsupported transport type: %s", transportType)
	}

	session, err := client.Connect(ctx, transport, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to MCP server: %w", err)
	}

	initResult := session.InitializeResult()

	c.logger.Debug("Successfully created MCP session",
		"server_url", serverConfig.URL,
		"transport_type", transportType)

	return session, initResult, nil
}

// convertMCPInputSchema converts MCP JSON schema to our generic format
func convertMCPInputSchema(mcpSchema *jsonschema.Schema) map[string]interface{} {
	if mcpSchema == nil {
		return map[string]interface{}{}
	}

	result := make(map[string]interface{})

	if mcpSchema.Type != "" {
		result["type"] = mcpSchema.Type
	}
	if mcpSchema.Title != "" {
		result["title"] = mcpSchema.Title
	}
	if mcpSchema.Description != "" {
		result["description"] = mcpSchema.Description
	}

	if len(mcpSchema.Properties) > 0 {
		properties := make(map[string]interface{})
		for propName, propSchema := range mcpSchema.Properties {
			properties[propName] = convertMCPInputSchema(propSchema)
		}
		result["properties"] = properties
	}

	if len(mcpSchema.Required) > 0 {
		result["required"] = mcpSchema.Required
	}

	if len(mcpSchema.Enum) > 0 {
		result["enum"] = mcpSchema.Enum
	}

	return result
}

// extractServerName extracts server name with fallback to ConfigMap key
func (c *SimpleMCPClient) extractServerName(initResult *mcp.InitializeResult, configMapKeyName string) string {
	if initResult != nil && initResult.ServerInfo != nil && initResult.ServerInfo.Name != "" {
		return initResult.ServerInfo.Name
	}
	return configMapKeyName
}

// extractServerVersion extracts server version with fallback to "N/A"
func (c *SimpleMCPClient) extractServerVersion(initResult *mcp.InitializeResult) string {
	if initResult != nil && initResult.ServerInfo != nil && initResult.ServerInfo.Version != "" {
		return initResult.ServerInfo.Version
	}
	return "N/A"
}

// extractProtocolVersion extracts MCP protocol version
func (c *SimpleMCPClient) extractProtocolVersion(initResult *mcp.InitializeResult) string {
	if initResult != nil && initResult.ProtocolVersion != "" {
		return initResult.ProtocolVersion
	}
	return ""
}

// mapMCPError maps MCP SDK errors to our error format
func (c *SimpleMCPClient) mapMCPError(err error, serverURL string) error {
	if err == nil {
		return nil
	}

	if mcpErr, ok := err.(*MCPError); ok {
		return mcpErr
	}

	// Map common error types
	errMsg := err.Error()
	switch {
	case strings.Contains(errMsg, "connection refused"):
		return NewConnectionError(serverURL, "Server is not reachable")
	case strings.Contains(errMsg, "timeout"):
		return NewTimeoutError(serverURL)
	// Check HTTP status codes first (more specific) before generic error messages
	case strings.Contains(errMsg, "HTTP 401") || strings.Contains(errMsg, "401"):
		return NewMCPErrorWithServer("unauthorized", "Authentication failed", serverURL, http.StatusUnauthorized)
	case strings.Contains(errMsg, "HTTP 403") || strings.Contains(errMsg, "403"):
		return NewMCPErrorWithServer("forbidden", "Access denied", serverURL, http.StatusForbidden)
	case strings.Contains(errMsg, "HTTP 404") || strings.Contains(errMsg, "404"):
		return NewMCPErrorWithServer("not_found", "Server endpoint not found", serverURL, http.StatusNotFound)
	case strings.Contains(errMsg, "HTTP 400") || strings.Contains(errMsg, "400"):
		return NewMCPErrorWithServer("bad_request", "Invalid request format or parameters", serverURL, http.StatusBadRequest)
	case strings.Contains(errMsg, "HTTP 5") || strings.Contains(errMsg, "internal server error"):
		return NewMCPErrorWithServer("server_error", "MCP server internal error", serverURL, http.StatusInternalServerError)
	// Generic error message checks (less specific) come last
	case strings.Contains(errMsg, "unauthorized"):
		return NewMCPErrorWithServer("unauthorized", "Authentication failed", serverURL, http.StatusUnauthorized)
	case strings.Contains(errMsg, "forbidden"):
		return NewMCPErrorWithServer("forbidden", "Access denied", serverURL, http.StatusForbidden)
	case strings.Contains(errMsg, "not found"):
		return NewMCPErrorWithServer("not_found", "Server endpoint not found", serverURL, http.StatusNotFound)
	case strings.Contains(errMsg, "bad request"):
		return NewMCPErrorWithServer("bad_request", "Invalid request format or parameters", serverURL, http.StatusBadRequest)
	default:
		return NewMCPErrorWithServer("internal_error", fmt.Sprintf("MCP operation failed: %v", err), serverURL, http.StatusInternalServerError)
	}
}
