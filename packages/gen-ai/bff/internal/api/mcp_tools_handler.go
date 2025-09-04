package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/mcp"
)

type MCPToolsEnvelope = Envelope[[]mcp.Tool, None]

// MCPToolsHandler handles GET /genai/v1/mcp/tools?namespace=<>&mcp_url=<>
func (app *App) MCPToolsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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

	// Get tools from the MCP server
	toolList, err := app.repositories.MCPClient.ListMCPServerTools(ctx, identity, serverConfig)
	if err != nil {
		// Map MCP client errors to appropriate HTTP status codes using helper
		app.handleMCPClientError(w, r, err)
		return
	}

	// Create response with envelope - return just the tools array
	response := MCPToolsEnvelope{
		Data: toolList.Tools,
	}

	// Return JSON response with envelope structure
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
