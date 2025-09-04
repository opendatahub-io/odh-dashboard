package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
)

type MCPServersListEnvelope = Envelope[[]repositories.MCPServerInfo, None]

// MCPServersListHandler handles GET /genai/v1/aa/mcps?namespace=<>
func (app *App) MCPServersListHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Common setup using helper
	identity, k8sClient, err := app.setupMCPEndpoint(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Parse and validate parameters using helper (mcp_url not required for this endpoint)
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

	// Create response with envelope - return just the server info (name + config)
	response := MCPServersListEnvelope{
		Data: servers,
	}

	// Return JSON response with envelope structure
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
