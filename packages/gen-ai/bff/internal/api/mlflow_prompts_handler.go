package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MLflowPromptsEnvelope is the response envelope for MLflow prompts
type MLflowPromptsEnvelope = Envelope[models.MLflowPromptsResponse, None]

// MLflowListPromptsHandler handles GET /api/v1/mlflow/prompts
func (app *App) MLflowListPromptsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	result, err := app.repositories.MLflowPrompts.ListPrompts(ctx)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := MLflowPromptsEnvelope{
		Data: *result,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
