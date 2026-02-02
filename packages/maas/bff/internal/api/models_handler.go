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
	modelsList, err := app.repositories.Models.ListModels(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := models.MaaSModelsResponse{
		Object: "list",
		Data:   modelsList,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

