package api

import (
	"encoding/json"
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
// requested pipeline type. The pipelineType query parameter selects which discovered
// pipeline to use; when omitted it defaults to "timeseries".
//
// Both the Pipeline Server (DSPipelineApplication) and the managed AutoML pipeline are
// automatically discovered — no explicit pipeline ID or version ID is required.
//
// Error Responses:
//   - 400: Invalid or missing required fields, unknown JSON fields, unsupported pipelineType
//   - 500: No matching AutoML pipeline discovered or Pipeline Server error
func (app *App) CreatePipelineRunHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !ok {
		app.serverErrorResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
		return
	}

	// Determine which pipeline type to use (defaults to timeseries)
	pipelineType := r.URL.Query().Get("pipelineType")
	if pipelineType == "" {
		pipelineType = constants.PipelineTypeTimeSeries
	}

	// Validate pipelineType is a known value
	if !constants.ValidPipelineTypes[pipelineType] {
		app.badRequestResponse(w, r, fmt.Errorf("unsupported pipelineType %q: must be one of timeseries, tabular", pipelineType))
		return
	}

	// Get the discovered pipeline for the requested type from context
	discoveredPipelines, ok := ctx.Value(constants.DiscoveredPipelinesKey).(map[string]*repositories.DiscoveredPipeline)
	if !ok || discoveredPipelines == nil {
		app.serverErrorResponseWithMessage(w, r,
			fmt.Errorf("discovered pipelines missing from context for pipelineType %q", pipelineType),
			"internal error: discovered pipelines context key has wrong type - check middleware configuration")
		return
	}
	discovered := discoveredPipelines[pipelineType]
	if discovered == nil {
		app.serverErrorResponseWithMessage(w, r,
			fmt.Errorf("no AutoML %s pipeline found in namespace", pipelineType),
			fmt.Sprintf("no AutoML %s pipeline found in namespace - ensure a managed AutoML pipeline is deployed", pipelineType))
		return
	}

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

	if err := repositories.ValidateCreateAutoMLRunRequest(req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	runResponse, err := app.repositories.PipelineRuns.CreatePipelineRun(
		client,
		ctx,
		req,
		discovered.PipelineID,
		discovered.PipelineVersionID,
		pipelineType,
	)
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
