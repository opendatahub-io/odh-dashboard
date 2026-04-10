package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

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
//   - 400: Missing runId or pipeline server client
//   - 404: Run not found, run belongs to a different pipeline, or missing pipeline reference
//   - 500: Pipeline Server error or no AutoRAG pipeline discovered
func (app *App) PipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()

	// Get pipeline server client from context (added by middleware)
	client, ok := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
		return
	}

	// Get discovered pipeline from context — may be nil if no pipeline exists yet
	discoveredPipelines, ok2 := ctx.Value(constants.DiscoveredPipelinesKey).(map[string]*repositories.DiscoveredPipeline)
	if !ok2 {
		app.serverErrorResponse(w, r, fmt.Errorf("discovered pipelines context key has wrong type - check middleware configuration"))
		return
	}
	discovered := discoveredPipelines[constants.PipelineTypeAutoRAG]

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

	// Verify that the run belongs to the discovered AutoRAG pipeline
	// This ensures users can only access runs from the AutoRAG pipeline in their namespace

	// Defense-in-depth: Validate that PipelineVersionReference exists
	// KFP should always set this field, but we check explicitly for data integrity
	if run.PipelineVersionReference == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Warn("Run missing PipelineVersionReference - possible data integrity issue",
			"runId", runID,
			"namespace", ctx.Value(constants.NamespaceHeaderParameterKey))
		// Return 404 for security (don't leak that run exists with invalid data)
		app.notFoundResponse(w, r)
		return
	}

	// Validate that the run belongs to the discovered AutoRAG pipeline
	if discovered == nil ||
		run.PipelineVersionReference.PipelineID != discovered.PipelineID ||
		run.PipelineVersionReference.PipelineVersionID != discovered.PipelineVersionID {
		// Run exists but belongs to a different pipeline - return 404 for security
		app.notFoundResponse(w, r)
		return
	}

	// Set the pipeline type now that ownership is confirmed.
	run.PipelineType = constants.PipelineTypeAutoRAG

	// Wrap in envelope response
	response := PipelineRunEnvelope{
		Data: run,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
