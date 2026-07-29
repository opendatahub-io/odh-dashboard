package api

import (
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

// GetNIMServingResourceHandler handles GET /api/v1/nim-serving/:nimResource.
// Performs a cross-resource lookup: fetches NIM Account CR, resolves the resource name,
// then fetches the Secret or ConfigMap.
// Registered as a publicRoute (no auth) - uses SA client, not user token.
func (app *App) GetNIMServingResourceHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	nimResource := ps.ByName("nimResource")

	result, err := app.repositories.NIM.GetNIMServingResource(r.Context(), app.config.Namespace, nimResource)
	if err != nil {
		var notFound *models.NIMNotFoundError
		if errors.As(err, &notFound) {
			app.notFoundResponse(w, r)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	resp := models.NIMServingResourceResponse{Body: result}
	if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
