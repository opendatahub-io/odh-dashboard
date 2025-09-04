package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp"
)

type MCPStatusEnvelope = Envelope[*mcp.ConnectionStatus, None]

// MCPStatusHandler handles GET /genai/v1/mcp/status?namespace=<>&mcp_url=<>
func (app *App) MCPStatusHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Common setup using helper
	identity, k8sClient, err := app.setupMCPEndpoint(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Parse and validate parameters using helper
	_, _, decodedURL, err := app.parseMCPEndpointParams(r, true)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Find server config using helper
	serverConfig, err := app.findMCPServerConfig(ctx, k8sClient, identity, decodedURL)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	// Check connection status of the MCP server
	connectionStatus, err := app.repositories.MCPClient.CheckMCPServerStatus(ctx, identity, serverConfig)
	if err != nil {
		// Map MCP client errors to appropriate HTTP status codes using helper
		app.handleMCPClientError(w, r, err)
		return
	}

	// Create response with envelope - return just the connection status
	response := MCPStatusEnvelope{
		Data: connectionStatus,
	}

	// Return JSON response with envelope structure
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
