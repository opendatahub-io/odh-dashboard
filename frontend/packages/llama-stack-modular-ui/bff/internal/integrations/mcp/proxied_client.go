package mcp

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
)

// ProxiedMCPClient implements MCPClientInterface using MCP SDK with transport factory
type ProxiedMCPClient struct {
	logger           *slog.Logger
	config           *MCPClientConfig
	transportFactory TransportFactory
	sessionManager   *SessionManager
	httpClient       *http.Client // Still needed for HTTP health checks
}

// NewProxiedMCPClient creates a new proxied MCP client
func NewProxiedMCPClient(logger *slog.Logger) *ProxiedMCPClient {
	return NewProxiedMCPClientWithConfig(logger, nil)
}

// NewProxiedMCPClientWithConfig creates a new proxied MCP client with custom configuration
func NewProxiedMCPClientWithConfig(logger *slog.Logger, config *MCPClientConfig) *ProxiedMCPClient {
	if config == nil {
		config = DefaultMCPClientConfig()
	}

	// Validate and fix any invalid configuration values
	if err := config.Validate(); err != nil {
		logger.Warn("Invalid MCP client configuration, using defaults", "error", err)
		config = DefaultMCPClientConfig()
	}

	// Create transport factory
	transportFactory := NewProxiedTransportFactory(config.ToTransportOptions())

	// Create session manager
	sessionManager := NewSessionManager(config.ToSessionConfig(), logger)

	// Create HTTP client for health checks
	httpClient := &http.Client{
		Timeout: config.HealthCheckTimeout,
	}

	return &ProxiedMCPClient{
		logger:           logger,
		config:           config,
		transportFactory: transportFactory,
		sessionManager:   sessionManager,
		httpClient:       httpClient,
	}
}

// CheckConnectionStatus checks if an MCP server is reachable and responsive using hybrid approach
func (c *ProxiedMCPClient) CheckConnectionStatus(ctx context.Context, identity *integrations.RequestIdentity, serverURL string) (*ConnectionStatus, error) {
	c.logger.Debug("Checking MCP server connection status", "server_url", serverURL)

	// Step 1: HTTP Health Check (fast, lightweight)
	status, err := c.checkHTTPHealth(ctx, identity, serverURL)
	if err != nil {
		return nil, err
	}

	// If HTTP health check failed, return early
	if status.Status == "disconnected" || status.Status == "error" {
		return status, nil
	}

	// Step 2: Optional MCP Protocol Health Check (deeper validation)
	if c.config.EnableProtocolHealthCheck {
		protocolStatus := c.checkMCPProtocolHealth(ctx, identity, serverURL)
		if protocolStatus != nil {
			// Combine results: HTTP passed, check MCP protocol result
			if protocolStatus.Status == "connected" {
				status.Status = "connected"
				status.Message = "HTTP and MCP protocol both healthy"
			} else {
				status.Status = "connected-http-only"
				status.Message = fmt.Sprintf("HTTP healthy, MCP protocol issue: %s", protocolStatus.Message)
			}
		}
	}

	c.logger.Debug("MCP server connection check completed",
		"server_url", serverURL,
		"status", status.Status,
		"protocol_check_enabled", c.config.EnableProtocolHealthCheck)

	return status, nil
}

// checkHTTPHealth performs the HTTP health check (existing logic)
func (c *ProxiedMCPClient) checkHTTPHealth(ctx context.Context, identity *integrations.RequestIdentity, serverURL string) (*ConnectionStatus, error) {
	// Build health check URL
	healthURL, err := c.buildHealthCheckURL(serverURL)
	if err != nil {
		return nil, NewInvalidResponseError(serverURL, fmt.Sprintf("invalid server URL: %v", err))
	}

	req, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
	if err != nil {
		return nil, NewInternalError(fmt.Sprintf("failed to create request: %v", err))
	}

	// Add authentication if available
	if identity != nil && identity.Token != "" {
		req.Header.Set("Authorization", "Bearer "+identity.Token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error("Failed to connect to MCP server via HTTP", "server_url", serverURL, "error", err)
		return &ConnectionStatus{
			ServerURL:   serverURL,
			Status:      "disconnected",
			Message:     fmt.Sprintf("HTTP connection failed: %v", err),
			LastChecked: time.Now().Unix(),
		}, nil
	}
	defer resp.Body.Close()

	status := &ConnectionStatus{
		ServerURL:   serverURL,
		LastChecked: time.Now().Unix(),
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		status.Status = "connected"
		status.Message = "HTTP health check passed"
	} else {
		status.Status = "error"
		status.Message = fmt.Sprintf("HTTP health check failed with status %d", resp.StatusCode)
	}

	return status, nil
}

// checkMCPProtocolHealth performs MCP protocol-level health check using Ping
func (c *ProxiedMCPClient) checkMCPProtocolHealth(ctx context.Context, identity *integrations.RequestIdentity, serverURL string) *ConnectionStatus {
	c.logger.Debug("Performing MCP protocol health check", "server_url", serverURL)

	// Create a short-lived session for health check
	session, err := c.createMCPSession(ctx, serverURL, identity)
	if err != nil {
		c.logger.Debug("Failed to create MCP session for health check", "server_url", serverURL, "error", err)
		return &ConnectionStatus{
			ServerURL:   serverURL,
			Status:      "error",
			Message:     fmt.Sprintf("MCP session creation failed: %v", err),
			LastChecked: time.Now().Unix(),
		}
	}
	defer session.Close()

	// Perform ping to test MCP protocol connectivity
	err = session.Ping(ctx, &mcp.PingParams{})
	if err != nil {
		c.logger.Debug("MCP protocol ping failed", "server_url", serverURL, "error", err)
		return &ConnectionStatus{
			ServerURL:   serverURL,
			Status:      "error",
			Message:     fmt.Sprintf("MCP ping failed: %v", err),
			LastChecked: time.Now().Unix(),
		}
	}

	c.logger.Debug("MCP protocol health check passed", "server_url", serverURL)
	return &ConnectionStatus{
		ServerURL:   serverURL,
		Status:      "connected",
		Message:     "MCP protocol ping successful",
		LastChecked: time.Now().Unix(),
	}
}

// ListTools retrieves the list of available tools from an MCP server using MCP SDK
func (c *ProxiedMCPClient) ListTools(ctx context.Context, identity *integrations.RequestIdentity, serverURL string) (*ToolList, error) {
	c.logger.Debug("Listing tools from MCP server using MCP SDK", "server_url", serverURL)

	// Get or create MCP session
	session, err := c.sessionManager.GetOrCreateSession(
		ctx,
		serverURL,
		identity,
		func(ctx context.Context) (*mcp.ClientSession, error) {
			return c.createMCPSession(ctx, serverURL, identity)
		},
	)
	if err != nil {
		c.logger.Error("Failed to get MCP session for ListTools", "server_url", serverURL, "error", err)
		return nil, NewConnectionError(serverURL, fmt.Sprintf("Failed to establish MCP session: %v", err))
	}

	// Call MCP ListTools method
	result, err := session.ListTools(ctx, nil)
	if err != nil {
		c.logger.Error("Failed to list tools via MCP protocol", "server_url", serverURL, "error", err)

		// Close the session on error as it might be corrupted
		c.sessionManager.CloseSession(serverURL, identity)

		// Map MCP errors to our error types
		return nil, c.mapMCPError(err, serverURL)
	}

	// Convert MCP SDK response to our format
	tools := make([]Tool, len(result.Tools))
	for i, mcpTool := range result.Tools {
		tools[i] = Tool{
			Name:        mcpTool.Name,
			Description: mcpTool.Description,
			InputSchema: convertMCPInputSchema(mcpTool.InputSchema),
		}
	}

	toolList := &ToolList{
		ServerURL: serverURL,
		Tools:     tools,
	}

	c.logger.Debug("Successfully retrieved tools from MCP server using SDK",
		"server_url", serverURL,
		"tool_count", len(toolList.Tools))

	return toolList, nil
}

// createMCPSession creates a new MCP client session
func (c *ProxiedMCPClient) createMCPSession(ctx context.Context, serverURL string, identity *integrations.RequestIdentity) (*mcp.ClientSession, error) {
	// Create MCP client
	client := mcp.NewClient(
		c.config.ToMCPImplementation(),
		c.config.ToMCPClientOptions(),
	)

	// Create transport based on configuration
	var transport mcp.Transport
	var err error

	transportOptions := c.config.ToTransportOptions()

	switch c.config.DefaultTransportType {
	case TransportTypeSSE:
		transport, err = c.transportFactory.CreateSSETransport(serverURL, identity, transportOptions)
		if err != nil {
			return nil, fmt.Errorf("failed to create SSE transport: %w", err)
		}
	case TransportTypeStreamableHTTP:
		transport, err = c.transportFactory.CreateStreamableHTTPTransport(serverURL, identity, transportOptions)
		if err != nil {
			return nil, fmt.Errorf("failed to create StreamableHTTP transport: %w", err)
		}
	default:
		return nil, fmt.Errorf("unsupported transport type: %s", c.config.DefaultTransportType)
	}

	// Connect to server
	session, err := client.Connect(ctx, transport, &mcp.ClientSessionOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MCP server: %w", err)
	}

	return session, nil
}

// convertMCPInputSchema converts MCP SDK input schema to our format
func convertMCPInputSchema(mcpSchema *jsonschema.Schema) map[string]interface{} {
	if mcpSchema == nil {
		return nil
	}

	// Convert the jsonschema.Schema to a generic map
	// This is a simplified conversion - in a production system you might want more sophisticated handling
	result := make(map[string]interface{})

	if mcpSchema.Type != "" {
		result["type"] = mcpSchema.Type
	}

	if mcpSchema.Description != "" {
		result["description"] = mcpSchema.Description
	}

	if len(mcpSchema.Properties) > 0 {
		properties := make(map[string]interface{})
		for name, prop := range mcpSchema.Properties {
			propMap := make(map[string]interface{})
			if prop.Type != "" {
				propMap["type"] = prop.Type
			}
			if prop.Description != "" {
				propMap["description"] = prop.Description
			}
			properties[name] = propMap
		}
		result["properties"] = properties
	}

	if len(mcpSchema.Required) > 0 {
		result["required"] = mcpSchema.Required
	}

	return result
}

// mapMCPError maps MCP SDK errors to our error types
func (c *ProxiedMCPClient) mapMCPError(err error, serverURL string) error {
	// This is a simplified error mapping - you might want to inspect specific MCP error types
	errMsg := err.Error()

	if strings.Contains(errMsg, "unauthorized") || strings.Contains(errMsg, "authentication") {
		return NewMCPErrorWithServer(ErrCodeUnauthorized, "Authentication failed", serverURL, 401)
	}

	if strings.Contains(errMsg, "timeout") {
		return NewMCPErrorWithServer(ErrCodeTimeout, "Request timeout", serverURL, 408)
	}

	if strings.Contains(errMsg, "connection") || strings.Contains(errMsg, "transport") {
		return NewConnectionError(serverURL, fmt.Sprintf("Connection error: %v", err))
	}

	// Default to server unavailable
	return NewMCPErrorWithServer(ErrCodeServerUnavailable, fmt.Sprintf("MCP error: %v", err), serverURL, 500)
}

// buildHealthCheckURL constructs the health check URL for an MCP server
func (c *ProxiedMCPClient) buildHealthCheckURL(serverURL string) (string, error) {
	baseURL, err := url.Parse(serverURL)
	if err != nil {
		return "", err
	}

	// Try common health check endpoints
	// Most MCP servers should implement a health endpoint
	healthPath := "/health"
	if !strings.HasSuffix(baseURL.Path, "/") && baseURL.Path != "" {
		healthPath = baseURL.Path + "/health"
	} else if baseURL.Path == "/" || baseURL.Path == "" {
		healthPath = "/health"
	} else {
		healthPath = strings.TrimSuffix(baseURL.Path, "/") + "/health"
	}

	baseURL.Path = healthPath
	return baseURL.String(), nil
}

// Close closes all active sessions and cleans up resources
func (c *ProxiedMCPClient) Close() {
	if c.sessionManager != nil {
		c.logger.Debug("Closing all MCP sessions")
		c.sessionManager.CloseAllSessions()
	}
}

// GetSessionStats returns statistics about active MCP sessions
func (c *ProxiedMCPClient) GetSessionStats() map[string]interface{} {
	if c.sessionManager != nil {
		return c.sessionManager.GetSessionStats()
	}
	return map[string]interface{}{
		"total_sessions":     0,
		"sessions_by_server": map[string]int{},
	}
}

// NewInternalError creates an internal error
func NewInternalError(message string) *MCPError {
	return NewMCPError(ErrCodeInternalError, message, 500)
}
