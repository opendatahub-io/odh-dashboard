package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type PipelineRunsEnvelope Envelope[*models.PipelineRunsData, None]

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
	if ps := query.Get("pageSize"); ps != "" {
		parsed, err := strconv.ParseInt(ps, 10, 32)
		if err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("invalid pageSize parameter: must be a valid integer"))
			return
		}
		if parsed <= 0 {
			app.badRequestResponse(w, r, fmt.Errorf("invalid pageSize parameter: must be greater than 0"))
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
