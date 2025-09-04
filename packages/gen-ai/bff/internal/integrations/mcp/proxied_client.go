package mcp

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
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

// CheckConnectionStatus checks if an MCP server is reachable and responsive using simplified HTTP check
func (c *ProxiedMCPClient) CheckConnectionStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig MCPServerConfig) (*ConnectionStatus, error) {
	c.logger.Debug("Checking MCP server connection status", "server_url", serverConfig.URL)

	// Resolve version using priority: ConfigMap -> MCP server -> "N/A"
	version := c.resolveServerVersion(ctx, identity, serverConfig)

	// Make a simple HTTP request to the server URL
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, serverConfig.URL, nil)
	if err != nil {
		return &ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "error",
			Message:     fmt.Sprintf("failed to create request: %v", err),
			LastChecked: time.Now().Unix(),
			Version:     version,
		}, nil
	}

	// Add authentication if available
	if identity != nil && identity.Token != "" {
		req.Header.Set("Authorization", "Bearer "+identity.Token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "disconnected",
			Message:     fmt.Sprintf("HTTP request failed: %v", err),
			LastChecked: time.Now().Unix(),
			Version:     version,
		}, nil
	}
	defer resp.Body.Close()

	// Consider any 2xx or 3xx response as connected
	if resp.StatusCode < 400 {
		return &ConnectionStatus{
			ServerURL:   serverConfig.URL,
			Status:      "connected",
			Message:     fmt.Sprintf("HTTP %d", resp.StatusCode),
			LastChecked: time.Now().Unix(),
			Version:     version,
		}, nil
	}

	return &ConnectionStatus{
		ServerURL:   serverConfig.URL,
		Status:      "error",
		Message:     fmt.Sprintf("HTTP %d", resp.StatusCode),
		LastChecked: time.Now().Unix(),
		Version:     version,
	}, nil
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

	// Create a short-lived session for health check - this method is now deprecated since we use simplified health check
	// but keeping it here for potential future use
	_ = serverURL
	_ = identity
	session := (*mcp.ClientSession)(nil)
	err := fmt.Errorf("deprecated method - using simplified health check instead")
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
func (c *ProxiedMCPClient) ListTools(ctx context.Context, identity *integrations.RequestIdentity, serverConfig MCPServerConfig) (*ToolList, error) {
	c.logger.Debug("Listing tools from MCP server using MCP SDK", "server_url", serverConfig.URL)

	// Get or create MCP session
	session, err := c.sessionManager.GetOrCreateSession(
		ctx,
		serverConfig.URL,
		identity,
		func(ctx context.Context) (*mcp.ClientSession, error) {
			return c.createMCPSession(ctx, serverConfig, identity)
		},
	)
	if err != nil {
		c.logger.Error("Failed to get MCP session for ListTools", "server_url", serverConfig.URL, "error", err)
		return nil, NewConnectionError(serverConfig.URL, fmt.Sprintf("Failed to establish MCP session: %v", err))
	}

	// Call MCP ListTools method
	result, err := session.ListTools(ctx, nil)
	if err != nil {
		c.logger.Error("Failed to list tools via MCP protocol", "server_url", serverConfig.URL, "error", err)

		// Close the session on error as it might be corrupted
		c.sessionManager.CloseSession(serverConfig.URL, identity)

		// Map MCP errors to our error types
		return nil, c.mapMCPError(err, serverConfig.URL)
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
		ServerURL: serverConfig.URL,
		Tools:     tools,
	}

	c.logger.Debug("Successfully retrieved tools from MCP server using SDK",
		"server_url", serverConfig.URL,
		"tool_count", len(toolList.Tools))

	return toolList, nil
}

// createMCPSession creates a new MCP client session
func (c *ProxiedMCPClient) createMCPSession(ctx context.Context, serverConfig MCPServerConfig, identity *integrations.RequestIdentity) (*mcp.ClientSession, error) {
	// Create MCP client
	client := mcp.NewClient(
		c.config.ToMCPImplementation(),
		c.config.ToMCPClientOptions(),
	)

	// Validate and normalize transport type from server config
	transportType := ValidateAndNormalizeTransportType(serverConfig.Type, c.logger, serverConfig.URL)

	// Create transport based on server configuration
	var transport mcp.Transport
	var err error

	transportOptions := c.config.ToTransportOptions()

	switch transportType {
	case TransportTypeSSE:
		transport, err = c.transportFactory.CreateSSETransport(serverConfig.URL, identity, transportOptions)
		if err != nil {
			return nil, fmt.Errorf("failed to create SSE transport: %w", err)
		}
	case TransportTypeStreamableHTTP:
		transport, err = c.transportFactory.CreateStreamableHTTPTransport(serverConfig.URL, identity, transportOptions)
		if err != nil {
			return nil, fmt.Errorf("failed to create StreamableHTTP transport: %w", err)
		}
	default:
		return nil, fmt.Errorf("unsupported transport type: %s", transportType)
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
	// Check for our custom NonSSEResponseError first (defined in transport_factory.go)
	if nonSSEErr, ok := err.(*NonSSEResponseError); ok {
		return c.mapNonSSEError(nonSSEErr, serverURL)
	}

	// Check if this is an SSE parsing error that might indicate a JSON response
	errMsg := err.Error()
	if strings.Contains(errMsg, "malformed line in SSE stream") && strings.Contains(errMsg, "{") {
		// This looks like the MCP SDK tried to parse JSON as SSE
		// Try to make a request to get the actual JSON response
		if jsonErr := c.detectJSONErrorResponse(serverURL); jsonErr != nil {
			return jsonErr
		}
	}

	// For all other errors, return a generic server unavailable error
	return NewMCPErrorWithServer(ErrCodeServerUnavailable, fmt.Sprintf("MCP error: %v", err), serverURL, 500)
}

// detectJSONErrorResponse makes a request to detect if server returned JSON instead of SSE
func (c *ProxiedMCPClient) detectJSONErrorResponse(serverURL string) error {
	req, err := http.NewRequest("GET", serverURL, nil)
	if err != nil {
		return nil // If we can't make request, just return nil
	}

	// Set headers to accept SSE
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil // If request fails, just return nil
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}

	// Check if this looks like a JSON error response
	bodyStr := strings.TrimSpace(string(body))
	if len(bodyStr) > 0 && (bodyStr[0] == '{' || bodyStr[0] == '[') {
		return &NonSSEResponseError{
			StatusCode: resp.StatusCode,
			Body:       bodyStr,
			Headers:    resp.Header,
		}
	}

	return nil
}

// mapNonSSEError maps NonSSEResponseError to appropriate MCP error types
func (c *ProxiedMCPClient) mapNonSSEError(nonSSEErr *NonSSEResponseError, serverURL string) error {
	// Simply return the NonSSEResponseError as-is
	// The API layer will handle converting it to appropriate HTTP response
	return nonSSEErr
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

// resolveServerVersion resolves the server version by connecting to MCP server
func (c *ProxiedMCPClient) resolveServerVersion(ctx context.Context, identity *integrations.RequestIdentity, serverConfig MCPServerConfig) string {
	// Get version directly from MCP server initialization
	mcpVersion := c.getMCPServerVersion(ctx, identity, serverConfig)
	if mcpVersion != "" {
		c.logger.Debug("Retrieved version from MCP server", "server_url", serverConfig.URL, "version", mcpVersion)
		return mcpVersion
	}

	// Fallback to "N/A" if MCP server version retrieval failed
	c.logger.Debug("No version available from MCP server, using N/A", "server_url", serverConfig.URL)
	return "N/A"
}

// getMCPServerVersion attempts to get the version from MCP server initialization
func (c *ProxiedMCPClient) getMCPServerVersion(ctx context.Context, identity *integrations.RequestIdentity, serverConfig MCPServerConfig) string {
	// Create a temporary MCP session to get initialization result
	session, err := c.createMCPSession(ctx, serverConfig, identity)
	if err != nil {
		c.logger.Error("Failed to create MCP session for version retrieval", "server_url", serverConfig.URL, "error", err)
		return ""
	}
	defer func() {
		if session != nil {
			session.Close()
		}
	}()

	// Get initialization result
	initResult := session.InitializeResult()
	if initResult == nil {
		c.logger.Warn("No initialization result available from MCP server", "server_url", serverConfig.URL)
		return ""
	}

	// Extract version from ServerInfo (based on MCP SDK v0.3.1 documentation)
	if initResult.ServerInfo != nil && initResult.ServerInfo.Version != "" {
		c.logger.Info("Successfully retrieved version from MCP server", "server_url", serverConfig.URL, "version", initResult.ServerInfo.Version)
		return initResult.ServerInfo.Version
	}

	// Log different scenarios for better debugging
	if initResult.ServerInfo == nil {
		c.logger.Info("MCP server initialization result has no ServerInfo", "server_url", serverConfig.URL)
	} else {
		c.logger.Info("MCP server ServerInfo has empty version", "server_url", serverConfig.URL)
	}

	return ""
}

// NewInternalError creates an internal error
func NewInternalError(message string) *MCPError {
	return NewMCPError(ErrCodeInternalError, message, 500)
}
