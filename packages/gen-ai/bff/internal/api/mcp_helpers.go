package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// ErrRegistryMCPServerNotFound indicates a registry MCP server could not be resolved.
var ErrRegistryMCPServerNotFound = errors.New("registry MCP server not found")

// ErrRegistryMCPClientUnavailable indicates the MLflow BFF client is not configured or reachable.
var ErrRegistryMCPClientUnavailable = errors.New("MLflow BFF client unavailable")

// ErrInvalidRegistryServerName indicates the server_name parameter failed validation.
var ErrInvalidRegistryServerName = errors.New("invalid server_name parameter")

// handleRegistryResolveError maps registry resolution failures to HTTP responses.
func (app *App) handleRegistryResolveError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, ErrRegistryMCPServerNotFound) {
		app.notFoundResponse(w, r)
		return
	}
	if errors.Is(err, ErrRegistryMCPClientUnavailable) {
		app.serviceUnavailableResponse(w, r, err)
		return
	}
	if errors.Is(err, ErrInvalidRegistryServerName) {
		app.badRequestResponse(w, r, err)
		return
	}
	app.serverErrorResponse(w, r, err)
}

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

// parseMCPToolsStatusParams extracts query parameters for MCP tools/status endpoints.
// Either server_url (ConfigMap path) or server_name (registry path) must be provided.
func (app *App) parseMCPToolsStatusParams(r *http.Request) (namespace, serverURL, decodedURL, serverName string, err error) {
	namespace = r.URL.Query().Get("namespace")
	if namespace == "" {
		return "", "", "", "", fmt.Errorf("namespace parameter is required")
	}

	serverName = r.URL.Query().Get("server_name")
	serverURL = r.URL.Query().Get("server_url")
	if serverName == "" && serverURL == "" {
		return "", "", "", "", fmt.Errorf("server_url or server_name parameter is required")
	}

	if serverURL != "" {
		decodedURL, err = url.QueryUnescape(serverURL)
		if err != nil {
			return "", "", "", "", fmt.Errorf("invalid server_url parameter: %w", err)
		}
	}

	return namespace, serverURL, decodedURL, serverName, nil
}

// maxRegistryPages caps the number of pages fetched from the MLflow BFF registry to prevent
// an infinite loop if the server returns a cyclic or perpetually non-empty next_page_token.
const maxRegistryPages = 100

// fetchRegistryMCPServerSummaries lists active registry MCP servers from the MLflow BFF.
func (app *App) fetchRegistryMCPServerSummaries(
	ctx context.Context,
	workspace string,
	mlflowClient bffclient.BFFClientInterface,
) ([]models.MCPServerSummary, error) {
	servers := make([]models.MCPServerSummary, 0)
	pageToken := ""

	for page := 0; ; page++ {
		if page >= maxRegistryPages {
			return nil, fmt.Errorf("registry pagination exceeded %d pages", maxRegistryPages)
		}

		callCtx, cancel := context.WithTimeout(ctx, bffCallTimeout)
		path := "/mcp-registry/servers?workspace=" + url.QueryEscape(workspace)
		if pageToken != "" {
			path += "&page_token=" + url.QueryEscape(pageToken)
		}

		var envelope models.MLflowMCPServersEnvelope
		err := mlflowClient.Call(callCtx, "GET", path, nil, &envelope)
		cancel()
		if err != nil {
			return nil, err
		}

		for _, server := range envelope.Data.Servers {
			if !isRegistryServerListable(server) {
				continue
			}
			servers = append(servers, app.mapRegistryServerToSummary(server))
		}

		pageToken = envelope.Data.NextPageToken
		if pageToken == "" {
			break
		}
	}

	return servers, nil
}

func isRegistryServerListable(server models.MLflowMCPServer) bool {
	if server.Status != "active" {
		return false
	}
	if len(server.AccessEndpoints) == 0 || server.AccessEndpoints[0].EndpointURL == "" {
		return false
	}
	return true
}

func (app *App) mapRegistryServerToSummary(server models.MLflowMCPServer) models.MCPServerSummary {
	if len(server.AccessEndpoints) == 0 {
		return models.MCPServerSummary{}
	}

	endpoint := server.AccessEndpoints[0]
	tools := make([]models.MCPServerToolSummary, 0)
	version := ""

	if endpoint.ResolvedVersion != nil {
		version = endpoint.ResolvedVersion.Version
		for _, tool := range endpoint.ResolvedVersion.Tools {
			tools = append(tools, models.MCPServerToolSummary(tool))
		}
	}

	return models.MCPServerSummary{
		Name:        server.Name,
		URL:         endpoint.EndpointURL,
		Transport:   app.normalizeTransportType(endpoint.TransportType),
		Description: server.Description,
		Logo:        nil,
		Status:      "healthy",
		Source:      models.MCPServerSourceRegistry,
		Version:     version,
		Tools:       tools,
		ToolCount:   len(tools),
	}
}

// resolveRegistryServerConfig fetches a single MCP server from the MLflow BFF registry.
func (app *App) resolveRegistryServerConfig(
	ctx context.Context,
	workspace string,
	serverName string,
	mlflowClient bffclient.BFFClientInterface,
) (models.MCPServerConfig, error) {
	if mlflowClient == nil {
		return models.MCPServerConfig{}, fmt.Errorf("%w", ErrRegistryMCPClientUnavailable)
	}

	serverSegment, err := mcpRegistryServerNamePathSegment(serverName)
	if err != nil {
		return models.MCPServerConfig{}, fmt.Errorf("%w: %w", ErrInvalidRegistryServerName, err)
	}

	callCtx, cancel := context.WithTimeout(ctx, bffCallTimeout)
	defer cancel()

	path := "/mcp-registry/servers/" + serverSegment + "?workspace=" + url.QueryEscape(workspace)
	var envelope models.MLflowMCPServerEnvelope
	err = mlflowClient.Call(callCtx, "GET", path, nil, &envelope)
	if err != nil {
		var bffErr *bffclient.BFFClientError
		if errors.As(err, &bffErr) && bffErr.Code == bffclient.ErrCodeNotFound {
			return models.MCPServerConfig{}, fmt.Errorf("%w: %s", ErrRegistryMCPServerNotFound, serverName)
		}
		return models.MCPServerConfig{}, err
	}

	server := envelope.Data
	if len(server.AccessEndpoints) == 0 || server.AccessEndpoints[0].EndpointURL == "" {
		return models.MCPServerConfig{}, fmt.Errorf("%w: no access endpoint for %s", ErrRegistryMCPServerNotFound, serverName)
	}

	endpoint := server.AccessEndpoints[0]
	return models.MCPServerConfig{
		URL:       endpoint.EndpointURL,
		Transport: app.normalizeTransportType(endpoint.TransportType),
	}, nil
}

// mcpRegistryServerNamePathSegment escapes each "/"-separated part of an
// unvalidated MCP registry server name independently, preserving the "/" the
// MLflow BFF's catch-all route expects while still escaping unsafe characters.
func mcpRegistryServerNamePathSegment(name string) (string, error) {
	parts := strings.Split(name, "/")
	for i, p := range parts {
		if p == "" {
			return "", fmt.Errorf("invalid MCP registry server name %q: empty path segment", name)
		}
		escaped := url.PathEscape(p)
		if escaped == "." || escaped == ".." {
			escaped = strings.ReplaceAll(escaped, ".", "%2E")
		}
		parts[i] = escaped
	}
	return strings.Join(parts, "/"), nil
}

// setupMCPIdentityWithTokenValidation extracts request identity and MCP bearer token
// without requiring a Kubernetes client (used for registry-backed MCP requests).
func (app *App) setupMCPIdentityWithTokenValidation(ctx context.Context, r *http.Request) (*integrations.RequestIdentity, error) {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		if app.config.AuthMethod == config.AuthMethodDisabled {
			identity = &integrations.RequestIdentity{}
		} else {
			return nil, fmt.Errorf("missing RequestIdentity in context")
		}
	}

	mcpIdentity, err := app.mcpClientFactory.ExtractRequestIdentity(r.Header)
	if err != nil {
		return nil, err
	}

	identity.MCPToken = mcpIdentity.MCPToken
	return identity, nil
}

// setupMCPEndpoint performs common setup for MCP endpoints: identity extraction, k8s client setup, and repository validation
func (app *App) setupMCPEndpoint(ctx context.Context) (*integrations.RequestIdentity, kubernetes.KubernetesClientInterface, error) {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		if app.config.AuthMethod == config.AuthMethodDisabled {
			identity = &integrations.RequestIdentity{}
		} else {
			return nil, nil, fmt.Errorf("missing RequestIdentity in context")
		}
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
) (models.MCPServerConfig, error) {
	servers, err := app.repositories.MCPClient.GetMCPServersFromConfig(
		k8sClient,
		ctx,
		identity,
		dashboardNamespace,
		constants.MCPServerName,
	)
	if err != nil {
		return models.MCPServerConfig{}, fmt.Errorf("failed to get MCP server configurations: %w", err)
	}

	for _, server := range servers {
		if server.Config.URL == decodedURL {
			return server.Config, nil
		}
	}

	return models.MCPServerConfig{}, fmt.Errorf("MCP server not found for URL: %s", decodedURL)
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
