package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

const maxRequestBodyBytes = 10 << 20

type PipelineRunsEnvelope Envelope[*models.PipelineRunsData, None]
type PipelineRunEnvelope Envelope[*models.PipelineRun, None]
type CreatePipelineRunEnvelope Envelope[*models.PipelineRun, None]

// PipelineRunsHandler handles GET /api/v1/pipeline-runs
func (app *App) PipelineRunsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace, _ := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)

	pageSize := int32(20)
	if pageSizeStr := r.URL.Query().Get("pageSize"); pageSizeStr != "" {
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

	page := int64(1)
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		parsed, err := strconv.ParseInt(pageStr, 10, 64)
		if err != nil || parsed <= 0 {
			app.badRequestResponse(w, r, fmt.Errorf("invalid page parameter: must be a positive integer"))
			return
		}
		page = parsed
	}

	result, err := app.repositories.Pipelines.GetCombinedRuns(r.Context(), namespace, page, pageSize)
	if err != nil {
		app.mapPipelineError(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, PipelineRunsEnvelope{Data: result}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// PipelineRunHandler handles GET /api/v1/pipeline-runs/:runId
func (app *App) PipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	namespace, _ := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	runID := params.ByName("runId")
	if runID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing runId parameter"))
		return
	}

	run, err := app.repositories.Pipelines.GetManagedRun(r.Context(), namespace, runID)
	if err != nil {
		app.mapPipelineError(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, PipelineRunEnvelope{Data: run}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// CreatePipelineRunHandler handles POST /api/v1/pipeline-runs
func (app *App) CreatePipelineRunHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace, _ := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	var req models.CreateAutoMLRunRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			app.payloadTooLargeResponse(w, r, "request body exceeds maximum size")
			return
		}
		app.badRequestResponse(w, r, fmt.Errorf("invalid request body: %w", err))
		return
	}
	var extra interface{}
	if err := decoder.Decode(&extra); err != io.EOF {
		app.badRequestResponse(w, r, fmt.Errorf("request body must contain only a single JSON object"))
		return
	}

	run, err := app.repositories.Pipelines.CreateRun(r.Context(), namespace, req)
	if err != nil {
		app.mapPipelineError(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, CreatePipelineRunEnvelope{Data: run}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// TerminatePipelineRunHandler handles POST /api/v1/pipeline-runs/:runId/terminate
func (app *App) TerminatePipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	namespace, _ := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	runID := params.ByName("runId")
	if runID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing runId parameter"))
		return
	}

	if err := app.repositories.Pipelines.TerminateRun(r.Context(), namespace, runID); err != nil {
		app.mapPipelineError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeletePipelineRunHandler handles DELETE /api/v1/pipeline-runs/:runId
func (app *App) DeletePipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	namespace, _ := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	runID := params.ByName("runId")
	if runID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing runId parameter"))
		return
	}

	if err := app.repositories.Pipelines.DeleteRun(r.Context(), namespace, runID); err != nil {
		app.mapPipelineError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// RetryPipelineRunHandler handles POST /api/v1/pipeline-runs/:runId/retry
func (app *App) RetryPipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	namespace, _ := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	runID := params.ByName("runId")
	if runID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing runId parameter"))
		return
	}

	if err := app.repositories.Pipelines.RetryRun(r.Context(), namespace, runID); err != nil {
		app.mapPipelineError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// mapPipelineError maps domain errors to HTTP responses.
func (app *App) mapPipelineError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, repositories.ErrPipelineRunNotFound) {
		app.notFoundResponse(w, r)
		return
	}
	if errors.Is(err, repositories.ErrValidation) {
		app.badRequestResponse(w, r, err)
		return
	}
	if errors.Is(err, pipelines.ErrInvalidInput) || errors.Is(err, pipelines.ErrInvalidRunState) {
		app.badRequestResponse(w, r, err)
		return
	}
	app.serverErrorResponse(w, r, err)
}
