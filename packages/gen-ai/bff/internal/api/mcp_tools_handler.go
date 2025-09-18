package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
)

type MCPToolsEnvelope = Envelope[*genaiassets.ToolsStatus, None]

// MCPToolsHandler handles GET /genai/v1/mcp/tools?namespace=<>&server_url=<>
func (app *App) MCPToolsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	identity, k8sClient, err := app.setupMCPEndpointWithTokenValidation(ctx, r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	_, _, decodedURL, err := app.parseMCPEndpointParams(r, true)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	serverConfig, err := app.findMCPServerConfig(ctx, k8sClient, identity, decodedURL)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	toolsStatus, err := app.repositories.MCPClient.ListMCPServerToolsWithStatus(ctx, identity, serverConfig)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := MCPToolsEnvelope{
		Data: toolsStatus,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
