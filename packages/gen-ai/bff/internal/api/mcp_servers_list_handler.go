package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp"
)

type MCPServersListEnvelope = Envelope[[]map[string]mcp.MCPServerConfig, None]

// MCPServersListHandler handles GET /genai/v1/aa/mcps?namespace=<>
func (app *App) MCPServersListHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Common setup using helper
	identity, k8sClient, err := app.setupMCPEndpoint(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Parse and validate parameters using helper (server_url not required for this endpoint)
	_, _, _, err = app.parseMCPEndpointParams(r, false)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Get all MCP server configurations from ConfigMap (using hardcoded constants)
	servers, err := app.repositories.MCPClient.GetMCPServersFromConfig(
		k8sClient,
		ctx,
		identity,
		constants.MCPServerNamespace,
		constants.MCPServerName,
	)
	if err != nil {
		// Map MCP client errors to appropriate HTTP status codes using helper
		app.handleMCPClientError(w, r, err)
		return
	}

	// Transform servers to the new format: each server becomes a map[serverName]config
	transformedServers := make([]map[string]mcp.MCPServerConfig, 0, len(servers))
	for _, server := range servers {
		serverMap := map[string]mcp.MCPServerConfig{
			server.Name: server.Config,
		}
		transformedServers = append(transformedServers, serverMap)
	}

	// Create response with envelope - return the transformed server data
	response := MCPServersListEnvelope{
		Data: transformedServers,
	}

	// Return JSON response with envelope structure
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
