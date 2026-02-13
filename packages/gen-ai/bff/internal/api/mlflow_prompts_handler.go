package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// MLflowListPromptsHandler handles GET /api/v1/mlflow/prompts
func (app *App) MLflowListPromptsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	response, err := app.repositories.MLflowPrompts.ListPrompts(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
