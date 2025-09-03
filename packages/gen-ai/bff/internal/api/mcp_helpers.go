package api

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	kubernetes "github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/kubernetes"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/mcp"
)

// parseMCPEndpointParams extracts and validates query parameters common to MCP endpoints
func (app *App) parseMCPEndpointParams(r *http.Request, requireMcpURL bool) (namespace, mcpURL, decodedURL string, err error) {
	namespace = r.URL.Query().Get("namespace")
	mcpURL = r.URL.Query().Get("mcp_url")

	// Validate required parameters
	if namespace == "" {
		return "", "", "", fmt.Errorf("namespace parameter is required")
	}

	// Only validate mcp_url if required
	if requireMcpURL {
		if mcpURL == "" {
			return "", "", "", fmt.Errorf("mcp_url parameter is required")
		}

		// URL decode the mcp_url parameter
		decodedURL, err = url.QueryUnescape(mcpURL)
		if err != nil {
			return "", "", "", fmt.Errorf("invalid mcp_url parameter: %w", err)
		}
	}

	return namespace, mcpURL, decodedURL, nil
}

// setupMCPEndpoint performs common setup for MCP endpoints: identity extraction, k8s client setup, and repository validation
func (app *App) setupMCPEndpoint(ctx context.Context) (*integrations.RequestIdentity, kubernetes.KubernetesClientInterface, error) {
	// Get request identity from context
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		return nil, nil, fmt.Errorf("missing RequestIdentity in context")
	}

	// Get Kubernetes client from middleware
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get Kubernetes client: %w", err)
	}

	// Check if MCPClient repository is available
	if app.repositories.MCPClient == nil {
		return nil, nil, fmt.Errorf("MCP client not initialized")
	}

	return identity, k8sClient, nil
}

// findMCPServerConfig looks up MCP server configuration by URL from ConfigMap
func (app *App) findMCPServerConfig(
	ctx context.Context,
	k8sClient kubernetes.KubernetesClientInterface,
	identity *integrations.RequestIdentity,
	decodedURL string,
) (mcp.MCPServerConfig, error) {
	// Get all MCP server configurations from ConfigMap (using hardcoded constants)
	servers, err := app.repositories.MCPClient.GetMCPServersFromConfig(
		k8sClient,
		ctx,
		identity,
		constants.MCPServerNamespace,
		constants.MCPServerName,
	)
	if err != nil {
		return mcp.MCPServerConfig{}, fmt.Errorf("failed to get MCP server configurations: %w", err)
	}

	// Find the server config that matches the decoded URL
	for _, server := range servers {
		if server.Config.URL == decodedURL {
			return server.Config, nil
		}
	}

	return mcp.MCPServerConfig{}, fmt.Errorf("MCP server not found for URL: %s", decodedURL)
}

// handleMCPClientError maps MCP client errors to appropriate HTTP status codes
func (app *App) handleMCPClientError(w http.ResponseWriter, r *http.Request, err error) {
	// Check if it's a NonSSEResponseError - return the JSON response directly
	if nonSSEErr, ok := err.(*mcp.NonSSEResponseError); ok {
		// Return the server's JSON response as-is with the original status code
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(nonSSEErr.StatusCode)
		w.Write([]byte(nonSSEErr.Body))
		return
	}

	// Check if it's an MCP-specific error
	if mcpErr, ok := err.(*mcp.MCPError); ok {
		// Use the status code from the MCP error if it has one, otherwise map by error code
		statusCode := mcpErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForMCPError(mcpErr.Code)
		}

		// Map status codes to appropriate HTTP response codes and error codes
		httpError := app.mapMCPErrorToHTTPError(mcpErr, statusCode)
		app.errorResponse(w, r, httpError)
	} else {
		// Non-MCP errors - use 500 Internal Server Error
		app.serverErrorResponse(w, r, err)
	}
}

// getDefaultStatusCodeForMCPError returns default HTTP status codes for MCP error codes
func (app *App) getDefaultStatusCodeForMCPError(errorCode string) int {
	switch errorCode {
	case mcp.ErrCodeUnauthorized:
		return http.StatusUnauthorized
	case mcp.ErrCodeConnectionFailed, mcp.ErrCodeTimeout:
		return http.StatusServiceUnavailable
	case mcp.ErrCodeServerUnavailable:
		return http.StatusServiceUnavailable
	case mcp.ErrCodeInvalidResponse:
		return http.StatusBadGateway
	default:
		return http.StatusInternalServerError
	}
}

// mapMCPErrorToHTTPError converts MCP error to HTTP error with appropriate codes
func (app *App) mapMCPErrorToHTTPError(mcpErr *mcp.MCPError, statusCode int) *integrations.HTTPError {
	var code string
	var message string

	// Map status codes to error codes and adjust messages
	switch statusCode {
	case http.StatusUnauthorized:
		code = "unauthorized"
		message = mcpErr.Message
	case http.StatusForbidden:
		code = "forbidden"
		message = mcpErr.Message
	case http.StatusServiceUnavailable:
		code = "service_unavailable"
		message = mcpErr.Message
	case http.StatusBadGateway:
		code = "bad_gateway"
		message = fmt.Sprintf("Invalid response from MCP server: %s", mcpErr.Message)
	case http.StatusInternalServerError:
		code = "internal_server_error"
		message = mcpErr.Message
	default:
		// For any other status code, use a generic approach
		code = "mcp_error"
		message = fmt.Sprintf("MCP server error (HTTP %d): %s", statusCode, mcpErr.Message)
		statusCode = http.StatusBadGateway // Default to 502 for unknown server issues
	}

	return &integrations.HTTPError{
		StatusCode: statusCode,
		ErrorResponse: integrations.ErrorResponse{
			Code:    code,
			Message: message,
		},
	}
}
