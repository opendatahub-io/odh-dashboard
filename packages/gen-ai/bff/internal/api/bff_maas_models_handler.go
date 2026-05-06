package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// BFFMaaSModelsHandler handles GET /bff/maas/models
// Calls the MaaS BFF GET /models endpoint to retrieve the list of available MaaS models.
// The X-MaaS-Return-All-Models header is forwarded via the BFF client custom headers
// (set in AttachBFFMaaSClient middleware) so the MaaS BFF passes it through to the MaaS API.
func (app *App) BFFMaaSModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	maasClient := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
	if maasClient == nil {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: "MaaS BFF is not available",
			},
		})
		return
	}

	var modelsResponse models.MaaSModelsResponse
	if err := maasClient.Call(ctx, "GET", "/models", nil, &modelsResponse); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, modelsResponse, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
