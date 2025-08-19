package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2"
)

type ModelsResponse struct {
	Data []openai.Model `json:"data"`
}

// LlamaStackModelsHandler handles GET /genai/v1/models
func (app *App) LlamaStackModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	models, err := app.repositories.LlamaStackModels.ListModels(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := ModelsResponse{
		Data: models,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
