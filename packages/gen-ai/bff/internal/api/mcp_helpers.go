package api

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
)

// parseMCPEndpointParams extracts and validates query parameters common to MCP endpoints
func (app *App) parseMCPEndpointParams(r *http.Request, requireServerURL bool) (namespace, serverURL, decodedURL string, err error) {
	namespace = r.URL.Query().Get("namespace")
	serverURL = r.URL.Query().Get("server_url")

	if namespace == "" {
		return "", "", "", fmt.Errorf("namespace parameter is required")
	}

	if requireServerURL {
		if serverURL == "" {
			return "", "", "", fmt.Errorf("server_url parameter is required")
		}

		decodedURL, err = url.QueryUnescape(serverURL)
		if err != nil {
			return "", "", "", fmt.Errorf("invalid server_url parameter: %w", err)
		}
	}

	return namespace, serverURL, decodedURL, nil
}

// setupMCPEndpoint performs common setup for MCP endpoints: identity extraction, k8s client setup, and repository validation
func (app *App) setupMCPEndpoint(ctx context.Context) (*integrations.RequestIdentity, kubernetes.KubernetesClientInterface, error) {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		return nil, nil, fmt.Errorf("missing RequestIdentity in context")
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get Kubernetes client: %w", err)
	}

	if app.repositories.MCPClient == nil {
		return nil, nil, fmt.Errorf("MCP client not initialized")
	}

	return identity, k8sClient, nil
}

// setupMCPEndpointWithTokenValidation performs MCP endpoint setup with MCP token validation
func (app *App) setupMCPEndpointWithTokenValidation(ctx context.Context, r *http.Request) (*integrations.RequestIdentity, kubernetes.KubernetesClientInterface, error) {
	identity, k8sClient, err := app.setupMCPEndpoint(ctx)
	if err != nil {
		return nil, nil, err
	}

	mcpIdentity, err := app.mcpClientFactory.ExtractRequestIdentity(r.Header)
	if err != nil {
		return nil, nil, err
	}

	identity.MCPToken = mcpIdentity.MCPToken

	return identity, k8sClient, nil
}

// findMCPServerConfig looks up MCP server configuration by URL from ConfigMap
func (app *App) findMCPServerConfig(
	ctx context.Context,
	k8sClient kubernetes.KubernetesClientInterface,
	identity *integrations.RequestIdentity,
	decodedURL string,
	dashboardNamespace string,
) (genaiassets.MCPServerConfig, error) {
	servers, err := app.repositories.MCPClient.GetMCPServersFromConfig(
		k8sClient,
		ctx,
		identity,
		dashboardNamespace,
		constants.MCPServerName,
	)
	if err != nil {
		return genaiassets.MCPServerConfig{}, fmt.Errorf("failed to get MCP server configurations: %w", err)
	}

	for _, server := range servers {
		if server.Config.URL == decodedURL {
			return server.Config, nil
		}
	}

	return genaiassets.MCPServerConfig{}, fmt.Errorf("MCP server not found for URL: %s", decodedURL)
}

// handleMCPClientError maps MCP client errors to appropriate HTTP status codes
func (app *App) handleMCPClientError(w http.ResponseWriter, r *http.Request, err error) {
	if nonSSEErr, ok := err.(*mcp.NonSSEResponseError); ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(nonSSEErr.StatusCode)
		if _, writeErr := w.Write([]byte(nonSSEErr.Body)); writeErr != nil {
			app.logger.Error("failed to write response body", "error", writeErr)
		}
		return
	}

	if mcpErr, ok := err.(*mcp.MCPError); ok {
		statusCode := mcpErr.StatusCode
		if statusCode == 0 {
			statusCode = app.getDefaultStatusCodeForMCPError(mcpErr.Code)
		}

		httpError := app.mapMCPErrorToHTTPError(mcpErr, statusCode)
		app.errorResponse(w, r, httpError)
	} else {
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
		code = "mcp_error"
		message = fmt.Sprintf("MCP server error (HTTP %d): %s", statusCode, mcpErr.Message)
		statusCode = http.StatusBadGateway
	}

	return &integrations.HTTPError{
		StatusCode: statusCode,
		ErrorResponse: integrations.ErrorResponse{
			Code:    code,
			Message: message,
		},
	}
}
