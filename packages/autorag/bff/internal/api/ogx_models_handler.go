package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type LSDModelsEnvelope Envelope[*models.OGXModelsData, None]

// OGXModelsHandler handles GET /api/v1/ogx/models
// Returns all available models from Open GenAI Stack Distribution.

func (app *App) OGXModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Call repository to get models
	// Repository retrieves the Open GenAI Stack client from context (added by middleware)
	modelsData, err := app.repositories.OGXModels.GetLSDModels(ctx)
	if err != nil {
		app.handleOGXClientError(w, r, err)
		return
	}

	lsdModelsEnvelope := LSDModelsEnvelope{
		Data: modelsData,
	}

	err = app.WriteJSON(w, http.StatusOK, lsdModelsEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
