package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
)

// maxRequestBodyBytes caps the request body size to 10 MiB to prevent unbounded memory use.
const maxRequestBodyBytes = 10 << 20

type CreatePipelineRunEnvelope Envelope[*models.PipelineRun, None]

// CreatePipelineRunHandler handles POST /api/v1/pipeline-runs
//
// Creates a new AutoML pipeline run using the auto-discovered pipeline for the
// pipeline type derived from the request body's task_type field (tabular for
// binary/multiclass/regression, timeseries for timeseries forecasting).
//
// Both the Pipeline Server (DSPipelineApplication) and the managed AutoML pipelines are
// automatically discovered — no explicit pipeline ID or version ID is required.
//
// Error Responses:
//   - 400: Invalid or missing required fields, unknown JSON fields, invalid task_type
//   - 404: Required managed AutoML pipelines not found on the pipeline server
//   - 500: Pipeline Server error
func (app *App) CreatePipelineRunHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
		return
	}

	// Decode the request body first to access task_type
	var req models.CreateAutoMLRunRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, maxRequestBodyBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid request body: %w", err))
		return
	}
	var extra interface{}
	if err := decoder.Decode(&extra); err != io.EOF {
		app.badRequestResponse(w, r, fmt.Errorf("request body must contain only a single JSON object"))
		return
	}

	// Determine pipeline type from task_type in request body
	if req.TaskType == nil || *req.TaskType == "" {
		app.badRequestResponse(w, r, fmt.Errorf("task_type is required in request body"))
		return
	}

	pipelineType, err := repositories.DeterminePipelineType(*req.TaskType)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	discoveredPipelines, ok := ctx.Value(constants.DiscoveredPipelinesKey).(map[string]*repositories.DiscoveredPipeline)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("discovered pipelines context key has wrong type - check middleware configuration"))
		return
	}
	if !repositories.HasAllRequiredAutoMLPipelines(discoveredPipelines) {
		app.notFoundResponseWithMessage(w, r, repositories.ManagedPipelinesNotFoundMessage)
		return
	}

	// pipelineType is tabular or timeseries; HasAllRequiredAutoMLPipelines guarantees both are present.
	discovered := discoveredPipelines[pipelineType]

	runResponse, err := app.repositories.PipelineRuns.CreatePipelineRun(
		client,
		ctx,
		req,
		discovered.PipelineID,
		discovered.PipelineVersionID,
		pipelineType,
	)
	if err != nil {
		// Check if this is a validation error (client error - 400) vs server error (500)
		var validationErr *repositories.ValidationError
		if errors.As(err, &validationErr) {
			app.badRequestResponse(w, r, err)
			return
		}
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
