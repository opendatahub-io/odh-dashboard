package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MaaSModelsHandler handles GET /v1/models
func (app *App) MaaSModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	maasModels, err := app.repositories.MaaSModels.ListModels(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := models.MaaSModelsResponse{
		Object: "list",
		Data:   maasModels,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
