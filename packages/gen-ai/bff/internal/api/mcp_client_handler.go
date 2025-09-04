package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/mcp"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
)

// MCPServersStatusEnvelope represents the response envelope for MCP servers status
type MCPServersStatusEnvelope = Envelope[[]repositories.MCPServerStatus, None]

// MCPServerToolsEnvelope represents the response envelope for MCP server tools
type MCPServerToolsEnvelope = Envelope[[]repositories.MCPServerStatus, None]

// MCPServersStatusHandler handles GET /genai/v1/mcp-servers/status
func (app *App) MCPServersStatusHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Get request identity from context
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Get Kubernetes client from middleware
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Parse query parameters
	includeTools := false
	if includeToolsParam := r.URL.Query().Get("include_tools"); includeToolsParam != "" {
		includeTools, _ = strconv.ParseBool(includeToolsParam)
	}

	// Check if MCPClient repository is available
	if app.repositories.MCPClient == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("MCP client not initialized"))
		return
	}

	// Get MCP servers status
	statuses, err := app.repositories.MCPClient.GetMCPServersStatus(
		k8sClient,
		ctx,
		identity,
		constants.MCPServerNamespace,
		constants.MCPServerName,
		includeTools,
	)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create response with envelope
	response := MCPServersStatusEnvelope{
		Data: statuses,
	}

	// Return JSON response with envelope structure
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// MCPServerToolsHandler handles GET /genai/v1/mcp-server/{server_name}/tools
func (app *App) MCPServerToolsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Get request identity from context
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Get server name from URL parameters
	serverName := ps.ByName("server_name")
	if serverName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("server_name is required"))
		return
	}

	// Get Kubernetes client from middleware
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Check if MCPClient repository is available
	if app.repositories.MCPClient == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("MCP client not initialized"))
		return
	}

	// First, get the server configuration to find its URL
	servers, err := app.repositories.MCPClient.GetMCPServersFromConfig(
		k8sClient,
		ctx,
		identity,
		constants.MCPServerNamespace,
		constants.MCPServerName,
	)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Find the requested server
	var serverURL string
	for _, server := range servers {
		if server.Name == serverName {
			serverURL = server.Config.URL
			break
		}
	}

	if serverURL == "" {
		app.notFoundResponse(w, r)
		return
	}

	// Get tools from the MCP server
	toolList, err := app.repositories.MCPClient.ListMCPServerTools(ctx, identity, serverURL)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create response with envelope - we'll return a single server status with tools
	serverStatus := repositories.MCPServerStatus{
		Name: serverName,
		Config: mcp.MCPServerConfig{
			URL: serverURL,
		},
		Tools: toolList.Tools,
	}

	response := MCPServerToolsEnvelope{
		Data: []repositories.MCPServerStatus{serverStatus},
	}

	// Return JSON response with envelope structure
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
