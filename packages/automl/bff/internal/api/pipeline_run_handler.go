package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
)

type CreatePipelineRunEnvelope Envelope[*models.PipelineRun, None]

// CreatePipelineRunHandler handles POST /api/v1/pipeline-runs
func (app *App) CreatePipelineRunHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
		return
	}

	var req models.CreateAutoMLRunRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := repositories.ValidateCreateAutoMLRunRequest(req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	runResponse, err := app.repositories.PipelineRuns.CreatePipelineRun(client, ctx, req)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create pipeline run: %w", err))
		return
	}

	response := CreatePipelineRunEnvelope{
		Data: runResponse,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
