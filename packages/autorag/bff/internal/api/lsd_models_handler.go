package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// LlamaStackModelsHandler handles GET /api/v1/lsd/models
// Returns all available models from LlamaStack Distribution.

func (app *App) LlamaStackModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Call repository to get models
	// Repository retrieves the LlamaStack client from context (added by middleware)
	modelsData, err := app.repositories.LSDModels.GetLSDModels(ctx)
	if err != nil {
		app.handleLlamaStackClientError(w, r, err)
		return
	}

	err = app.WriteJSON(w, http.StatusOK, modelsData, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
