package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
)

type CreatePipelineRunEnvelope Envelope[*models.PipelineRun, None]

// CreatePipelineRunHandler handles POST /api/v1/pipeline-runs
//
// Creates a new AutoRAG pipeline run with automatic pipeline discovery.
//
// The BFF automatically:
//  1. Discovers the managed AutoRAG pipeline in the namespace (via middleware)
//  2. Injects the discovered pipeline ID and version ID
//  3. Maps the AutoRAG-specific request to KFP v2beta1 runtime config
//  4. Submits the run to the Pipeline Server
//
// Requirements:
//   - AutoRAG pipeline must exist in the namespace (returns 500 if not found)
//   - All required fields in CreateAutoRAGRunRequest must be provided
//
// Request Body: CreateAutoRAGRunRequest (JSON)
// Response: PipelineRun (wrapped in envelope)
//
// Error Responses:
//   - 400: Invalid request body or missing required fields
//   - 500: No AutoRAG pipeline found or Pipeline Server error
func (app *App) CreatePipelineRunHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.PipelineServerClientKey).(ps.PipelineServerClientInterface)
	if !ok {
		app.badRequestResponse(w, r, fmt.Errorf("pipeline server client not found in context"))
		return
	}

	// Get discovered pipeline from context - required for POST
	discovered, ok := ctx.Value(constants.DiscoveredPipelineKey).(*repositories.DiscoveredPipeline)
	if !ok || discovered == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("no AutoRAG pipeline found in namespace - ensure a managed AutoRAG pipeline is deployed"))
		return
	}

	var req models.CreateAutoRAGRunRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid request body: %w", err))
		return
	}

	if err := repositories.ValidateCreateAutoRAGRunRequest(req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	runResponse, err := app.repositories.PipelineRuns.CreatePipelineRun(
		client,
		ctx,
		req,
		discovered.PipelineID,
		discovered.PipelineVersionID,
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
