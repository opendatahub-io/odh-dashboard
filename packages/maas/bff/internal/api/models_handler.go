package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// ListModelsHandler handles GET /api/v1/models
// Returns a list of available MaaS models
func ListModelsHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	// Preserve Gen-AI model enrichment without forwarding gateway identity headers.
	// The MaaS client derives Authorization from the authenticated context.
	var ALLOWED_HEADERS = []string{"X-MaaS-Return-All-Models"}
	headers := make(http.Header)
	for _, h := range ALLOWED_HEADERS {
		for _, value := range r.Header.Values(h) {
			headers.Add(h, value)
		}
	}
	modelsList, err := app.repositories.Models.ListModels(ctx, headers)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[models.MaaSModelsResponse, None]{
		Data: models.MaaSModelsResponse{
			Object: "list",
			Data:   modelsList,
		},
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
