package api

import (
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
)

type PipelineRunsEnvelope Envelope[*models.PipelineRunsData, None]
type PipelineRunEnvelope Envelope[*models.PipelineRun, None]

// PipelineRunsHandler handles GET /api/v1/pipeline-runs
//
// Returns combined pipeline runs from all discovered AutoML pipelines (time-series and
// tabular). Runs are fetched from all discovered pipelines, merged, sorted by
// created_at descending, and paginated by page/pageSize.
//
// Query Parameters:
//   - namespace: Kubernetes namespace (required, validated by middleware)
//   - page: Page number, 1-indexed (optional, default: 1)
//   - pageSize: Number of results per page (optional, default: 20, max: 100)
//
// Error Responses:
//   - 400: Invalid query parameters
//   - 500: No AutoML pipelines discovered or Pipeline Server error
func (app *App) PipelineRunsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get pipeline server client from context (added by middleware)
	client, ok := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
		return
	}

	// Get all discovered pipelines from context — may be empty if no pipelines exist yet
	discoveredPipelines, ok := ctx.Value(constants.DiscoveredPipelinesKey).(map[string]*repositories.DiscoveredPipeline)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("discovered pipelines context key has wrong type - check middleware configuration"))
		return
	}
	if len(discoveredPipelines) == 0 {
		// No pipelines discovered — return empty runs list.
		// Pipelines will be auto-created when the user submits their first experiment.
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

	page := int64(1) // default, 1-indexed; use int64 to avoid overflow in start/end arithmetic
	if pageStr := query.Get("page"); pageStr != "" {
		parsed, err := strconv.ParseInt(pageStr, 10, 64)
		if err != nil || parsed <= 0 {
			app.badRequestResponse(w, r, fmt.Errorf("invalid page parameter: must be a positive integer"))
			return
		}
		page = parsed
	}

	// Fetch all runs for each discovered pipeline and merge.
	// The pipeline type key is passed through so each run carries its pipeline_type field.
	var allRuns []models.PipelineRun
	for pipelineType, discovered := range discoveredPipelines {
		runs, err := app.repositories.PipelineRuns.GetAllPipelineRuns(client, ctx, discovered.PipelineVersionID, pipelineType)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get pipeline runs: %w", err))
			return
		}
		allRuns = append(allRuns, runs...)
	}

	// Sort merged runs by created_at descending; break ties on run_id for stable pagination.
	sort.Slice(allRuns, func(i, j int) bool {
		if allRuns[i].CreatedAt != allRuns[j].CreatedAt {
			return allRuns[i].CreatedAt > allRuns[j].CreatedAt
		}
		return allRuns[i].RunID > allRuns[j].RunID
	})

	// Apply page/pageSize pagination using int64 arithmetic throughout to avoid overflow,
	// then clamp before casting to int for slice indices.
	total := len(allRuns)
	totalSize := int32(total)
	total64 := int64(total)
	start64 := (page - 1) * int64(pageSize)
	end64 := start64 + int64(pageSize)

	if start64 < 0 {
		start64 = 0
	}
	if start64 > total64 {
		start64 = total64
	}
	if end64 < start64 {
		end64 = start64
	}
	if end64 > total64 {
		end64 = total64
	}

	pagedRuns := allRuns[int(start64):int(end64)]

	runsData := &models.PipelineRunsData{
		Runs:      pagedRuns,
		TotalSize: totalSize,
	}

	response := PipelineRunsEnvelope{
		Data: runsData,
	}

	err := app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// PipelineRunHandler handles GET /api/v1/pipeline-runs/:runId
// Returns a single pipeline run by ID
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
// parameter, fetches the run, and verifies it belongs to one of the discovered
// AutoML pipelines. On success it sets run.PipelineType to the matched pipeline
// type key (e.g. "timeseries" or "tabular"). On any validation failure it
// writes the appropriate HTTP error response and returns ok=false.
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
		app.notFoundResponse(w, r)
		return nil, nil, false
	}

	discoveredPipelines, dpOk := ctx.Value(constants.DiscoveredPipelinesKey).(map[string]*repositories.DiscoveredPipeline)
	if !dpOk {
		app.serverErrorResponse(w, r, fmt.Errorf("discovered pipelines missing from context: check middleware configuration"))
		return nil, nil, false
	}
	matchedPipelineType := ""
	for pipelineType, discovered := range discoveredPipelines {
		if run.PipelineVersionReference.PipelineID == discovered.PipelineID &&
			run.PipelineVersionReference.PipelineVersionID == discovered.PipelineVersionID {
			matchedPipelineType = pipelineType
			break
		}
	}
	if matchedPipelineType == "" {
		app.notFoundResponse(w, r)
		return nil, nil, false
	}

	run.PipelineType = matchedPipelineType

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
// Terminates an active AutoML pipeline run. The run must be in an active state
// (PENDING, RUNNING, or PAUSED) and belong to one of the discovered
// AutoML pipelines (timeseries or tabular) in the namespace. The run transitions
// to CANCELING and then CANCELED state.
//
// Security: This endpoint validates that the requested run belongs to a discovered
// AutoML pipeline before terminating it. This prevents users from terminating runs
// from other pipelines in the same namespace.
//
// Error Responses:
//   - 400: Missing runId or run is not in a terminatable state
//   - 404: Run not found, run belongs to a different pipeline, or no pipelines discovered
//   - 500: Pipeline Server error
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
// Permanently deletes a completed, failed, or canceled AutoML pipeline run. The run must belong
// to one of the discovered AutoML pipelines (timeseries or tabular) in the namespace.
//
// Security: This endpoint validates that the requested run belongs to a discovered
// AutoML pipeline before deleting it. This prevents users from deleting runs
// from other pipelines in the same namespace.
//
// Only runs in SUCCEEDED, FAILED, or CANCELED state can be deleted.
//
// Error Responses:
//   - 400: Missing runId or run is not in a deletable state
//   - 404: Run not found, run belongs to a different pipeline, or no pipelines discovered
//   - 500: Pipeline Server error
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
// Re-initiates a failed or terminated AutoML pipeline run. The run must belong to one of the
// discovered AutoML pipelines (timeseries or tabular) in the namespace.
//
// Security: This endpoint validates that the requested run belongs to a discovered
// AutoML pipeline before retrying it. This prevents users from retrying runs
// from other pipelines in the same namespace.
//
// Only runs in FAILED or CANCELED state can be retried.
//
// Error Responses:
//   - 400: Missing runId or run is not in a retryable state
//   - 404: Run not found, run belongs to a different pipeline, or no pipelines discovered
//   - 500: Pipeline Server error
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
