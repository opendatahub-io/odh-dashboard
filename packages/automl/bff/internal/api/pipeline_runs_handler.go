package api

import (
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"

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
	ctx := r.Context()

	// Get pipeline server client from context (added by middleware)
	client, ok := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
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

	// Validate the run belongs to one of the discovered AutoML pipelines.
	// This prevents returning runs from unrelated pipelines in the namespace.
	if run.PipelineVersionReference == nil {
		app.notFoundResponse(w, r)
		return
	}
	discoveredPipelines, ok := ctx.Value(constants.DiscoveredPipelinesKey).(map[string]*repositories.DiscoveredPipeline)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("discovered pipelines missing from context: check middleware configuration"))
		return
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
		return
	}
	run.PipelineType = matchedPipelineType

	// Wrap in envelope response
	response := PipelineRunEnvelope{
		Data: run,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
