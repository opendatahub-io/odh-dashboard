package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
)

type PipelineRunsEnvelope Envelope[*models.PipelineRunsData, None]
type PipelineRunEnvelope Envelope[*models.PipelineRun, None]

// PipelineRunsHandler handles GET /api/v1/pipeline-runs
//
// Returns pipeline runs for the auto-discovered AutoRAG pipeline version.
// The pipeline is discovered via the AttachDiscoveredPipeline middleware.
//
// Query Parameters:
//   - namespace: Kubernetes namespace (required, validated by middleware)
//   - pageSize: Number of results per page (optional, default: 20, max: 100)
//   - nextPageToken: Pagination token (optional)
//
// Error Responses:
//   - 400: Invalid query parameters
//   - 500: Missing pipeline server client (middleware misconfiguration) or no AutoRAG pipeline found
func (app *App) PipelineRunsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get pipeline server client from context (added by middleware)
	client, ok := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
		return
	}

	// Get discovered AutoRAG pipeline — may be nil if no pipeline exists yet
	pipelines, ok := ctx.Value(constants.DiscoveredPipelinesKey).(map[string]*repositories.DiscoveredPipeline)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("discovered pipelines context key has wrong type - check middleware configuration"))
		return
	}
	discovered := pipelines[constants.PipelineTypeAutoRAG]
	if discovered == nil {
		// No pipeline discovered — return empty runs list.
		// The pipeline will be auto-created when the user submits their first experiment.
		if err := app.WriteJSON(w, http.StatusOK, PipelineRunsEnvelope{
			Data: &models.PipelineRunsData{Runs: []models.PipelineRun{}},
		}, nil); err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Parse pagination parameters
	query := r.URL.Query()

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

	// Call repository to get pipeline runs for the discovered AutoRAG pipeline version.
	runsData, err := app.repositories.PipelineRuns.GetPipelineRuns(
		client,
		ctx,
		discovered.PipelineVersionID,
		pageSize,
		pageToken,
		constants.PipelineTypeAutoRAG,
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
// Returns a single pipeline run by ID, but only if it belongs to the discovered AutoRAG pipeline.
//
// Security: This endpoint validates that the requested run belongs to the AutoRAG pipeline
// in the namespace before returning it. This prevents users from accessing runs from other
// pipelines that may exist in the same namespace.
//
// Validation includes:
//   - PipelineVersionReference must exist (defense-in-depth for data integrity)
//   - Pipeline ID must match discovered AutoRAG pipeline
//   - Pipeline version ID must match discovered AutoRAG pipeline version
//
// Error Responses:
//   - 400: Missing runId
//   - 404: Run not found, run belongs to a different pipeline, or missing pipeline reference
//   - 500: Missing pipeline server client (middleware misconfiguration), Pipeline Server error, or no AutoRAG pipeline discovered
func (app *App) PipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	_, run, ok := app.resolveOwnedRun(w, r, params)
	if !ok {
		return
	}

	// Wrap in envelope response
	response := PipelineRunEnvelope{
		Data: run,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// resolveOwnedRun extracts the pipeline-server client, validates the runId
// parameter, fetches the run, and verifies it belongs to the discovered
// AutoRAG pipeline. On success it sets run.PipelineType. On any validation
// failure it writes the appropriate HTTP error response and returns ok=false.
func (app *App) resolveOwnedRun(
	w http.ResponseWriter,
	r *http.Request,
	params httprouter.Params,
) (ps.PipelineServerClientInterface, *models.PipelineRun, bool) {
	ctx := r.Context()

	client, clientOk := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !clientOk {
		app.serverErrorResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
		return nil, nil, false
	}

	discoveredPipelines, dpOk := ctx.Value(constants.DiscoveredPipelinesKey).(map[string]*repositories.DiscoveredPipeline)
	if !dpOk {
		app.serverErrorResponse(w, r, fmt.Errorf("discovered pipelines context key has wrong type - check middleware configuration"))
		return nil, nil, false
	}
	discovered := discoveredPipelines[constants.PipelineTypeAutoRAG]

	runID := params.ByName("runId")
	if runID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing runId parameter"))
		return nil, nil, false
	}

	run, err := app.repositories.PipelineRuns.GetPipelineRun(client, ctx, runID)
	if err != nil {
		if errors.Is(err, repositories.ErrPipelineRunNotFound) {
			app.notFoundResponse(w, r)
			return nil, nil, false
		}
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get pipeline run: %w", err))
		return nil, nil, false
	}

	if run.PipelineVersionReference == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Warn("Run missing PipelineVersionReference - possible data integrity issue",
			"runId", runID,
			"namespace", ctx.Value(constants.NamespaceHeaderParameterKey))
		app.notFoundResponse(w, r)
		return nil, nil, false
	}

	if discovered == nil ||
		run.PipelineVersionReference.PipelineID != discovered.PipelineID ||
		run.PipelineVersionReference.PipelineVersionID != discovered.PipelineVersionID {
		app.notFoundResponse(w, r)
		return nil, nil, false
	}

	run.PipelineType = constants.PipelineTypeAutoRAG

	return client, run, true
}

// mapMutationError maps the error from a pipeline run mutation (terminate/retry)
// to the appropriate HTTP response: 404 for not-found, 400 for bad-request
// from the Pipeline Server, and 500 for everything else.
func (app *App) mapMutationError(w http.ResponseWriter, r *http.Request, err error, action string) {
	if errors.Is(err, repositories.ErrPipelineRunNotFound) {
		app.notFoundResponse(w, r)
		return
	}
	var httpErr *ps.HTTPError
	if errors.As(err, &httpErr) && httpErr.Status() == http.StatusBadRequest {
		app.badRequestResponse(w, r, err)
		return
	}
	app.serverErrorResponse(w, r, fmt.Errorf("failed to %s pipeline run: %w", action, err))
}

// terminatableStates lists the run states that are eligible for termination.
var terminatableStates = map[string]bool{
	"PENDING": true,
	"RUNNING": true,
	"PAUSED":  true,
}

// TerminatePipelineRunHandler handles POST /api/v1/pipeline-runs/:runId/terminate
//
// Terminates an active AutoRAG pipeline run. The run must be in an active state
// (PENDING, RUNNING, or PAUSED) and belong to the discovered AutoRAG
// pipeline in the namespace. The run transitions to CANCELING and then CANCELED state.
//
// Security: This endpoint validates that the requested run belongs to the AutoRAG pipeline
// in the namespace before terminating it. This prevents users from terminating runs from
// other pipelines that may exist in the same namespace.
//
// Error Responses:
//   - 400: Missing runId or run is not in a terminatable state
//   - 404: Run not found, run belongs to a different pipeline, or no AutoRAG pipeline discovered
//   - 500: Missing pipeline server client (middleware misconfiguration) or Pipeline Server error
func (app *App) TerminatePipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	client, run, ok := app.resolveOwnedRun(w, r, params)
	if !ok {
		return
	}

	// Validate the run is in a terminatable state
	runState := strings.ToUpper(run.State)
	if !terminatableStates[runState] {
		app.badRequestResponse(w, r, fmt.Errorf("run %s is in state %s and cannot be terminated; only PENDING, RUNNING, or PAUSED runs can be terminated", run.RunID, runState))
		return
	}

	// Ownership and state confirmed — terminate the run
	if err := app.repositories.PipelineRuns.TerminatePipelineRun(client, r.Context(), run.RunID); err != nil {
		app.mapMutationError(w, r, err, "terminate")
		return
	}

	w.WriteHeader(http.StatusOK)
}

// deletableStates lists the run states that are eligible for deletion.
var deletableStates = map[string]bool{
	"SUCCEEDED": true,
	"FAILED":    true,
	"CANCELED":  true,
}

// DeletePipelineRunHandler handles DELETE /api/v1/pipeline-runs/:runId
//
// Permanently deletes a completed, failed, or canceled AutoRAG pipeline run. The run must belong
// to the discovered AutoRAG pipeline in the namespace.
//
// Security: This endpoint validates that the requested run belongs to the AutoRAG pipeline
// in the namespace before deleting it. This prevents users from deleting runs from
// other pipelines that may exist in the same namespace.
//
// Only runs in SUCCEEDED, FAILED, or CANCELED state can be deleted.
//
// Error Responses:
//   - 400: Missing runId or run is not in a deletable state
//   - 404: Run not found, run belongs to a different pipeline, or no AutoRAG pipeline discovered
//   - 500: Missing pipeline server client (middleware misconfiguration) or Pipeline Server error
func (app *App) DeletePipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	client, run, ok := app.resolveOwnedRun(w, r, params)
	if !ok {
		return
	}

	runState := strings.ToUpper(run.State)
	if !deletableStates[runState] {
		app.badRequestResponse(w, r, fmt.Errorf("run %s is in state %s and cannot be deleted; only SUCCEEDED, FAILED, or CANCELED runs can be deleted", run.RunID, runState))
		return
	}

	if err := app.repositories.PipelineRuns.DeletePipelineRun(client, r.Context(), run.RunID); err != nil {
		app.mapMutationError(w, r, err, "delete")
		return
	}

	w.WriteHeader(http.StatusOK)
}

// retryableStates lists the run states that are eligible for retry.
var retryableStates = map[string]bool{
	"FAILED":   true,
	"CANCELED": true,
}

// RetryPipelineRunHandler handles POST /api/v1/pipeline-runs/:runId/retry
//
// Re-initiates a failed or terminated AutoRAG pipeline run. The run must belong to the
// discovered AutoRAG pipeline in the namespace (same ownership validation as TerminatePipelineRunHandler).
//
// Security: This endpoint validates that the requested run belongs to the AutoRAG pipeline
// in the namespace before retrying it. This prevents users from retrying runs from
// other pipelines that may exist in the same namespace.
//
// Only runs in FAILED or CANCELED state can be retried.
//
// Error Responses:
//   - 400: Missing runId or run is not in a retryable state
//   - 404: Run not found, run belongs to a different pipeline, or no AutoRAG pipeline discovered
//   - 500: Missing pipeline server client (middleware misconfiguration) or Pipeline Server error
func (app *App) RetryPipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	client, run, ok := app.resolveOwnedRun(w, r, params)
	if !ok {
		return
	}

	// Validate the run is in a retryable state
	runState := strings.ToUpper(run.State)
	if !retryableStates[runState] {
		app.badRequestResponse(w, r, fmt.Errorf("run %s is in state %s and cannot be retried; only FAILED or CANCELED runs can be retried", run.RunID, runState))
		return
	}

	// Ownership and state confirmed — retry the run
	if err := app.repositories.PipelineRuns.RetryPipelineRun(client, r.Context(), run.RunID); err != nil {
		app.mapMutationError(w, r, err, "retry")
		return
	}

	w.WriteHeader(http.StatusOK)
}
