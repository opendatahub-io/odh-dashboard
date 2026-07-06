package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
)

// ExperimentsEnvelope is the response envelope for listing experiments.
type ExperimentsEnvelope = Envelope[models.ExperimentsResponse, None]

// MLflowListExperimentsHandler handles GET /api/v1/experiments.
func (app *App) MLflowListExperimentsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	pageToken := r.URL.Query().Get("pageToken")
	filter := r.URL.Query().Get("filter")

	var maxResults int
	if maxStr := r.URL.Query().Get("maxResults"); maxStr != "" {
		val, err := strconv.Atoi(maxStr)
		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
		if val <= 0 {
			app.badRequestResponse(w, r, fmt.Errorf("maxResults must be a positive integer, got %d", val))
			return
		}
		maxResults = val
	}

	result, err := app.repositories.Experiments.ListExperiments(ctx, pageToken, maxResults, filter)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	envelope := ExperimentsEnvelope{
		Data: *result,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
