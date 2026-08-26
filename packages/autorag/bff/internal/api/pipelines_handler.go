package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

type pipelinesRepository interface {
	GetCombinedRuns(ctx context.Context, namespace string, pageSize int32, page int64) (*models.PipelineRunsData, error)
	GetManagedRun(ctx context.Context, namespace, runID string) (*models.PipelineRun, error)
	CreateRun(ctx context.Context, namespace string, req models.CreateAutoRAGRunRequest) (*models.PipelineRun, error)
	CreateIndexingRun(ctx context.Context, namespace string, req models.CreateIndexingPipelineRunRequest) (*models.PipelineRun, error)
	TerminateRun(ctx context.Context, namespace, runID string) error
	RetryRun(ctx context.Context, namespace, runID string) error
	DeleteRun(ctx context.Context, namespace, runID string) error
	ListManagedPipelines(ctx context.Context, namespace string) (*models.ManagedPipelinesData, error)
	EnableManagedPipelines(ctx context.Context, namespace string) (*pipelines.EnableManagedPipelinesResult, error)
}

type PipelinesHandler struct {
	logger *slog.Logger
	repo   pipelinesRepository
}

const maxRequestBodyBytes = 10 << 20

type PipelineRunsEnvelope Envelope[*models.PipelineRunsData, None]
type PipelineRunEnvelope Envelope[*models.PipelineRun, None]
type CreatePipelineRunEnvelope Envelope[*models.PipelineRun, None]
type ManagedPipelinesEnvelope Envelope[*models.ManagedPipelinesData, None]

// PipelineRunsHandler handles GET /api/v1/pipeline-runs
func (h *PipelinesHandler) PipelineRunsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}

	query := r.URL.Query()

	pageSize := int32(20)
	if pageSizeStr := query.Get("pageSize"); pageSizeStr != "" {
		parsed, err := strconv.ParseInt(pageSizeStr, 10, 32)
		if err != nil || parsed <= 0 || parsed > 100 {
			badRequestResponse(h.logger, w, r, "invalid pageSize parameter: must be between 1 and 100")
			return
		}
		pageSize = int32(parsed)
	}

	page := int64(1)
	if pageStr := query.Get("page"); pageStr != "" {
		parsed, err := strconv.ParseInt(pageStr, 10, 64)
		if err != nil || parsed <= 0 {
			badRequestResponse(h.logger, w, r, "invalid page parameter: must be a positive integer")
			return
		}
		page = parsed
	}

	result, err := h.repo.GetCombinedRuns(r.Context(), namespace, pageSize, page)
	if err != nil {
		h.mapPipelineError(w, r, err)
		return
	}

	if err := writeJSON(w, http.StatusOK, PipelineRunsEnvelope{Data: result}, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// PipelineRunHandler handles GET /api/v1/pipeline-runs/:runId
func (h *PipelinesHandler) PipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}
	runID := params.ByName("runId")
	if runID == "" {
		badRequestResponse(h.logger, w, r, "missing runId parameter")
		return
	}

	run, err := h.repo.GetManagedRun(r.Context(), namespace, runID)
	if err != nil {
		h.mapPipelineError(w, r, err)
		return
	}

	if err := writeJSON(w, http.StatusOK, PipelineRunEnvelope{Data: run}, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// CreatePipelineRunHandler handles POST /api/v1/pipeline-runs
func (h *PipelinesHandler) CreatePipelineRunHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		NewUIError(http.StatusBadRequest, "missing_namespace", "missing namespace in context - ensure AttachNamespace middleware is used first").
			WithLogger(h.logger).
			WithTracing(r).
			WriteTo(w)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	var req models.CreateAutoRAGRunRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			NewUIError(http.StatusRequestEntityTooLarge, "request_body_too_large", "request body exceeds maximum size").
				WithDetail("maxBytes", maxRequestBodyBytes).
				WithLogger(h.logger).
				WithTracing(r).
				WriteTo(w)
			return
		}
		NewUIError(http.StatusBadRequest, "invalid_request_body", "invalid request body").
			WithDetail("error", err.Error()).
			WithLogger(h.logger).
			WithTracing(r).
			WriteTo(w)
		return
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			NewUIError(http.StatusRequestEntityTooLarge, "request_body_too_large", "request body exceeds maximum size").
				WithDetail("maxBytes", maxRequestBodyBytes).
				WithLogger(h.logger).
				WithTracing(r).
				WriteTo(w)
			return
		}
		if err != nil {
			NewUIError(http.StatusBadRequest, "invalid_request_body", "invalid request body").
				WithDetail("error", err.Error()).
				WithLogger(h.logger).
				WithTracing(r).
				WriteTo(w)
			return
		}
		errorReason := "request body must contain only a single JSON object"
		NewUIError(http.StatusBadRequest, "unsupported_multiple_json_request", errorReason).
			WithDetail("reason", errorReason).
			WithLogger(h.logger).
			WithTracing(r).
			WriteTo(w)
		return
	}

	run, err := h.repo.CreateRun(r.Context(), namespace, req)
	if err != nil {
		h.mapPipelineError(w, r, err)
		return
	}

	js, err := json.MarshalIndent(CreatePipelineRunEnvelope{Data: run}, "", "\t")
	if err != nil {
		h.logger.Error(err.Error(), "method", r.Method, "uri", r.URL.Path)
		NewUIError(http.StatusInternalServerError, "response_serialization_failed", "the server encountered a problem and could not process your request").
			WithLogger(h.logger).
			WithTracing(r).
			WriteTo(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(append(js, '\n')); err != nil {
		h.logger.Error("failed to write response body", "method", r.Method, "uri", r.URL.Path, "error", err.Error())
	}
}

// CreateIndexingPipelineRunHandler handles POST /api/v1/indexing-pipeline-runs
func (h *PipelinesHandler) CreateIndexingPipelineRunHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	var req models.CreateIndexingPipelineRunRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			payloadTooLargeResponse(h.logger, w, r, "request body exceeds maximum size")
			return
		}
		badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid request body: %s", err))
		return
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		badRequestResponse(h.logger, w, r, "request body must contain only a single JSON object")
		return
	}

	run, err := h.repo.CreateIndexingRun(r.Context(), namespace, req)
	if err != nil {
		h.mapPipelineError(w, r, err)
		return
	}

	if err := writeJSON(w, http.StatusOK, CreatePipelineRunEnvelope{Data: run}, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// TerminatePipelineRunHandler handles POST /api/v1/pipeline-runs/:runId/terminate
func (h *PipelinesHandler) TerminatePipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}
	runID := params.ByName("runId")
	if runID == "" {
		badRequestResponse(h.logger, w, r, "missing runId parameter")
		return
	}

	if err := h.repo.TerminateRun(r.Context(), namespace, runID); err != nil {
		h.mapPipelineError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeletePipelineRunHandler handles DELETE /api/v1/pipeline-runs/:runId
func (h *PipelinesHandler) DeletePipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}
	runID := params.ByName("runId")
	if runID == "" {
		badRequestResponse(h.logger, w, r, "missing runId parameter")
		return
	}

	if err := h.repo.DeleteRun(r.Context(), namespace, runID); err != nil {
		h.mapPipelineError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// RetryPipelineRunHandler handles POST /api/v1/pipeline-runs/:runId/retry
func (h *PipelinesHandler) RetryPipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}
	runID := params.ByName("runId")
	if runID == "" {
		badRequestResponse(h.logger, w, r, "missing runId parameter")
		return
	}

	if err := h.repo.RetryRun(r.Context(), namespace, runID); err != nil {
		h.mapPipelineError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// mapPipelineError maps domain errors to HTTP responses.
func (h *PipelinesHandler) mapPipelineError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, repositories.ErrPipelineRunNotFound) {
		notFoundResponse(h.logger, w, r)
		return
	}
	if errors.Is(err, repositories.ErrManagedPipelinesNotFound) {
		notFoundResponseWithMessage(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, repositories.ErrValidation) {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, pipelines.ErrInvalidInput) || errors.Is(err, pipelines.ErrInvalidRunState) {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, pipelines.ErrNoDSPAFound) {
		notFoundResponseWithMessage(h.logger, w, r, "no Pipeline Server (DSPipelineApplication) found in namespace")
		return
	}
	if errors.Is(err, pipelines.ErrDSPANotReady) {
		serviceUnavailableResponseWithMessage(h.logger, w, r, err,
			"Pipeline Server exists but is not ready - check that the APIServer component is running")
		return
	}
	if errors.Is(err, kubernetes.ErrForbidden) {
		forbiddenResponse(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, kubernetes.ErrNotFound) {
		notFoundResponse(h.logger, w, r)
		return
	}
	serverErrorResponse(h.logger, w, r, err)
}

// ListManagedPipelinesHandler handles GET /api/v1/managed-pipelines
func (h *PipelinesHandler) ListManagedPipelinesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}

	result, err := h.repo.ListManagedPipelines(r.Context(), namespace)
	if err != nil {
		h.mapPipelineError(w, r, err)
		return
	}

	if err := writeJSON(w, http.StatusOK, ManagedPipelinesEnvelope{Data: result}, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// EnableManagedPipelinesHandler handles POST /api/v1/managed-pipelines/enable
func (h *PipelinesHandler) EnableManagedPipelinesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}

	result, err := h.repo.EnableManagedPipelines(r.Context(), namespace)
	if err != nil {
		h.mapPipelineError(w, r, err)
		return
	}

	if err := writeJSON(w, http.StatusOK, map[string]string{
		"message": "managed pipelines " + result.Action,
		"dspa":    result.DSPAName,
	}, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}
