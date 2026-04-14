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

// pipelineDefinition returns the PipelineDefinition for the given pipeline type.
func (app *App) pipelineDefinition(pipelineType string) repositories.PipelineDefinition {
	switch pipelineType {
	case constants.PipelineTypeTimeSeries:
		return repositories.PipelineDefinition{
			Name:        app.config.AutoMLTimeSeriesPipelineNamePrefix,
			PipelineDir: "autogluon_timeseries_training_pipeline",
		}
	case constants.PipelineTypeTabular:
		return repositories.PipelineDefinition{
			Name:        app.config.AutoMLTabularPipelineNamePrefix,
			PipelineDir: "autogluon_tabular_training_pipeline",
		}
	default:
		return repositories.PipelineDefinition{Name: pipelineType}
	}
}

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

	// Get the discovered pipeline for the requested type from context
	discoveredPipelines, _ := ctx.Value(constants.DiscoveredPipelinesKey).(map[string]*repositories.DiscoveredPipeline)
	var discovered *repositories.DiscoveredPipeline
	if discoveredPipelines != nil {
		discovered = discoveredPipelines[pipelineType]
	}

	// If pipeline was not discovered, auto-create it
	if discovered == nil {
		namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if namespace == "" {
			app.serverErrorResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used"))
			return
		}
		pipelineServerBaseURL, _ := ctx.Value(constants.PipelineServerBaseURLKey).(string)
		def := app.pipelineDefinition(pipelineType)

		var ensureErr error
		discovered, ensureErr = app.repositories.Pipeline.EnsurePipeline(client, ctx, namespace, pipelineServerBaseURL, def)
		if ensureErr != nil {
			app.serverErrorResponseWithMessage(w, r,
				fmt.Errorf("failed to ensure AutoML %s pipeline: %w", pipelineType, ensureErr),
				fmt.Sprintf("failed to create AutoML %s pipeline in namespace", pipelineType))
			return
		}
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
