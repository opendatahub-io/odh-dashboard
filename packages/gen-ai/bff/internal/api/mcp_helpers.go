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
	// Check if it's an MCP-specific error
	if mcpErr, ok := err.(*mcp.MCPError); ok {
		switch mcpErr.Code {
		case "connection_error", "timeout_error":
			// Server unreachable - use 503 Service Unavailable
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode: http.StatusServiceUnavailable,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "service_unavailable",
					Message: fmt.Sprintf("MCP server is unreachable: %s", mcpErr.Message),
				},
			})
		case "server_unavailable":
			// Server unavailable - use 503 Service Unavailable
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode: http.StatusServiceUnavailable,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "service_unavailable",
					Message: mcpErr.Message,
				},
			})
		case "invalid_response":
			// Invalid response from server - use 502 Bad Gateway
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode: http.StatusBadGateway,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "bad_gateway",
					Message: fmt.Sprintf("Invalid response from MCP server: %s", mcpErr.Message),
				},
			})
		default:
			// Other MCP errors - use 500 Internal Server Error
			app.serverErrorResponse(w, r, err)
		}
	} else {
		// Non-MCP errors - use 500 Internal Server Error
		app.serverErrorResponse(w, r, err)
	}
}
