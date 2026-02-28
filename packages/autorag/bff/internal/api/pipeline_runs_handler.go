package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
)

type PipelineRunsEnvelope Envelope[*models.PipelineRunsData, None]
type PipelineRunEnvelope Envelope[*models.PipelineRun, None]

// PipelineRunsHandler handles GET /api/v1/pipeline-runs
// Returns pipeline runs from a specific Pipeline Server filtered by pipeline version ID
func (app *App) PipelineRunsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get pipeline server client from context (added by middleware)
	client, ok := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !ok {
		app.badRequestResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
		return
	}

	// Parse query parameters
	query := r.URL.Query()

	// Get pipeline version ID from query params (optional)
	pipelineVersionID := query.Get("pipelineVersionId")

	// Parse pagination parameters
	pageSize := int32(20) // default
	if pageSizeStr := query.Get("pageSize"); pageSizeStr != "" {
		parsed, err := strconv.ParseInt(pageSizeStr, 10, 32)
		if err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("invalid pageSize parameter: must be a valid integer"))
			return
		}
		if parsed <= 0 {
			app.badRequestResponse(w, r, fmt.Errorf("invalid pageSize parameter: must be greater than 0"))
			return
		}
		if parsed > 100 {
			app.badRequestResponse(w, r, fmt.Errorf("invalid pageSize parameter: must not exceed 100"))
			return
		}
		pageSize = int32(parsed)
	}

	pageToken := query.Get("nextPageToken")

	// Call repository to get filtered pipeline runs
	runsData, err := app.repositories.PipelineRuns.GetPipelineRuns(
		client,
		ctx,
		pipelineVersionID,
		pageSize,
		pageToken,
	)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get pipeline runs: %w", err))
		return
	}

	// Wrap in envelope response
	response := PipelineRunsEnvelope{
		Data: runsData,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// PipelineRunHandler handles GET /api/v1/pipeline-runs/:runId
// Returns a single pipeline run by ID
func (app *App) PipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()

	// Get pipeline server client from context (added by middleware)
	client, ok := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !ok {
		app.badRequestResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
		return
	}

	// Get run ID from URL path parameter
	runID := params.ByName("runId")
	if runID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing runId parameter"))
		return
	}

	// Call repository to get the pipeline run
	run, err := app.repositories.PipelineRuns.GetPipelineRun(client, ctx, runID)
	if err != nil {
		// Check if this is a "not found" error and return 404
		if errors.Is(err, repositories.ErrPipelineRunNotFound) {
			app.notFoundResponse(w, r)
			return
		}
		// For all other errors, return 500
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get pipeline run: %w", err))
		return
	}

	// Wrap in envelope response
	response := PipelineRunEnvelope{
		Data: run,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
