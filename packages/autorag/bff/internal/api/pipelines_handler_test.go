package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func newTestPipelinesHandler() (*PipelinesHandler, *mockPipelinesRepo) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := new(mockPipelinesRepo)
	return &PipelinesHandler{logger: logger, repo: repo}, repo
}

func pipelineRequestWithNamespace(method, url, namespace string, body string) *http.Request {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, url, strings.NewReader(body))
	} else {
		req = httptest.NewRequest(method, url, nil)
	}
	if namespace != "" {
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, namespace)
		req = req.WithContext(ctx)
	}
	return req
}

// ---------- PipelineRunsHandler ----------

func TestPipelineRunsHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		queryParams    string
		repoResult     *models.PipelineRunsData
		repoErr        error
		wantPageSize   int32
		wantPage       int64
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:        "success with defaults",
			queryParams: "",
			repoResult: &models.PipelineRunsData{
				Runs:      []models.PipelineRun{{RunID: "run-1", DisplayName: "Run 1"}},
				TotalSize: 1,
			},
			repoErr:        nil,
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"run_id": "run-1"`,
		},
		{
			name:        "success with custom pagination",
			queryParams: "?pageSize=10&page=3",
			repoResult: &models.PipelineRunsData{
				Runs:      []models.PipelineRun{},
				TotalSize: 5,
			},
			repoErr:        nil,
			wantPageSize:   10,
			wantPage:       3,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"total_size": 5`,
		},
		{
			name:           "bad pageSize - not a number",
			queryParams:    "?pageSize=abc",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid pageSize",
		},
		{
			name:           "bad pageSize - zero",
			queryParams:    "?pageSize=0",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid pageSize",
		},
		{
			name:           "bad pageSize - exceeds max",
			queryParams:    "?pageSize=200",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid pageSize",
		},
		{
			name:           "bad pageSize - negative",
			queryParams:    "?pageSize=-1",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid pageSize",
		},
		{
			name:           "bad page - not a number",
			queryParams:    "?page=xyz",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid page",
		},
		{
			name:           "bad page - zero",
			queryParams:    "?page=0",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid page",
		},
		{
			name:           "bad page - negative",
			queryParams:    "?page=-5",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid page",
		},
		{
			name:           "repo error - not found",
			queryParams:    "",
			repoResult:     nil,
			repoErr:        repositories.ErrPipelineRunNotFound,
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: `"code": "404"`,
		},
		{
			name:           "repo error - validation",
			queryParams:    "",
			repoResult:     nil,
			repoErr:        fmt.Errorf("bad input: %w", repositories.ErrValidation),
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "repo error - no DSPA found",
			queryParams:    "",
			repoResult:     nil,
			repoErr:        pipelines.ErrNoDSPAFound,
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: "Pipeline Server",
		},
		{
			name:           "repo error - DSPA not ready",
			queryParams:    "",
			repoResult:     nil,
			repoErr:        pipelines.ErrDSPANotReady,
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusServiceUnavailable,
			wantBodySubstr: "not ready",
		},
		{
			name:           "repo error - managed pipelines not found",
			queryParams:    "",
			repoResult:     nil,
			repoErr:        repositories.ErrManagedPipelinesNotFound,
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: "required managed pipelines not found",
		},
		{
			name:           "repo error - forbidden",
			queryParams:    "",
			repoResult:     nil,
			repoErr:        kubernetes.ErrForbidden,
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusForbidden,
			wantBodySubstr: `"code": "403"`,
		},
		{
			name:           "repo error - k8s not found",
			queryParams:    "",
			repoResult:     nil,
			repoErr:        kubernetes.ErrNotFound,
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: `"code": "404"`,
		},
		{
			name:           "repo error - invalid input",
			queryParams:    "",
			repoResult:     nil,
			repoErr:        fmt.Errorf("bad: %w", pipelines.ErrInvalidInput),
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "repo error - invalid run state",
			queryParams:    "",
			repoResult:     nil,
			repoErr:        fmt.Errorf("state: %w", pipelines.ErrInvalidRunState),
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "repo error - generic server error",
			queryParams:    "",
			repoResult:     nil,
			repoErr:        errors.New("something broke"),
			wantPageSize:   20,
			wantPage:       1,
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestPipelinesHandler()

			// Only set up repo expectation if the handler is expected to call the repo
			if tt.wantPageSize > 0 {
				repo.On("GetCombinedRuns", mock.Anything, ns, tt.wantPageSize, tt.wantPage).
					Return(tt.repoResult, tt.repoErr)
			}

			req := pipelineRequestWithNamespace(http.MethodGet, "/api/v1/pipeline-runs"+tt.queryParams, ns, "")
			rr := httptest.NewRecorder()

			h.PipelineRunsHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			repo.AssertExpectations(t)
		})
	}
}

// ---------- PipelineRunHandler ----------

func TestPipelineRunHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		runID          string
		repoResult     *models.PipelineRun
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:  "success",
			runID: "run-abc",
			repoResult: &models.PipelineRun{
				RunID:       "run-abc",
				DisplayName: "My Run",
				State:       "SUCCEEDED",
			},
			repoErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"run_id": "run-abc"`,
		},
		{
			name:           "missing runId returns 400",
			runID:          "",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing runId",
		},
		{
			name:           "repo not found error",
			runID:          "run-missing",
			repoResult:     nil,
			repoErr:        repositories.ErrPipelineRunNotFound,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: `"code": "404"`,
		},
		{
			name:           "repo server error",
			runID:          "run-fail",
			repoResult:     nil,
			repoErr:        errors.New("connection timeout"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestPipelinesHandler()

			if tt.runID != "" {
				repo.On("GetManagedRun", mock.Anything, ns, tt.runID).
					Return(tt.repoResult, tt.repoErr)
			}

			req := pipelineRequestWithNamespace(http.MethodGet, "/api/v1/pipeline-runs/"+tt.runID, ns, "")
			rr := httptest.NewRecorder()

			params := httprouter.Params{}
			if tt.runID != "" {
				params = httprouter.Params{{Key: "runId", Value: tt.runID}}
			}

			h.PipelineRunHandler(rr, req, params)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			repo.AssertExpectations(t)
		})
	}
}

// ---------- CreatePipelineRunHandler ----------

func TestCreatePipelineRunHandler(t *testing.T) {
	ns := "test-ns"

	validBody := `{"display_name":"new-run"}`

	tests := []struct {
		name           string
		namespace      string
		body           string
		repoResult     *models.PipelineRun
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:      "success",
			namespace: ns,
			body:      validBody,
			repoResult: &models.PipelineRun{
				RunID:       "new-run-id",
				DisplayName: "new-run",
				State:       "PENDING",
			},
			repoErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"run_id": "new-run-id"`,
		},
		{
			name:           "missing namespace",
			namespace:      "",
			body:           validBody,
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing_namespace",
		},
		{
			name:           "invalid JSON body",
			namespace:      ns,
			body:           `{invalid json`,
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid_request_body",
		},
		{
			name:           "empty body",
			namespace:      ns,
			body:           "",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid_request_body",
		},
		{
			name:           "unknown field in body",
			namespace:      ns,
			body:           `{"display_name":"x","unknown_field":"y"}`,
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid_request_body",
		},
		{
			name:           "oversized body",
			namespace:      ns,
			body:           `{"display_name":"` + strings.Repeat("x", 10<<20) + `"}`,
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusRequestEntityTooLarge,
			wantBodySubstr: "request_body_too_large",
		},
		{
			name:           "multiple JSON objects in body",
			namespace:      ns,
			body:           validBody + `{"extra": true}`,
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "single JSON object",
		},
		{
			name:           "malformed trailing JSON in body",
			namespace:      ns,
			body:           validBody + `{`,
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid_request_body",
		},
		{
			name:           "repo validation error",
			namespace:      ns,
			body:           validBody,
			repoResult:     nil,
			repoErr:        fmt.Errorf("missing field: %w", repositories.ErrValidation),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "repo server error",
			namespace:      ns,
			body:           validBody,
			repoResult:     nil,
			repoErr:        errors.New("pipeline creation failed"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
		{
			name:           "repo no DSPA found",
			namespace:      ns,
			body:           validBody,
			repoResult:     nil,
			repoErr:        pipelines.ErrNoDSPAFound,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: "Pipeline Server",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestPipelinesHandler()

			// Only set up repo expectation for cases where we expect the handler to call CreateRun
			if tt.namespace != "" && tt.body == validBody {
				repo.On("CreateRun", mock.Anything, tt.namespace, mock.AnythingOfType("models.CreateAutoRAGRunRequest")).
					Return(tt.repoResult, tt.repoErr)
			}

			req := pipelineRequestWithNamespace(http.MethodPost, "/api/v1/pipeline-runs", tt.namespace, tt.body)
			rr := httptest.NewRecorder()

			h.CreatePipelineRunHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			repo.AssertExpectations(t)
		})
	}
}

// ---------- TerminatePipelineRunHandler ----------

func TestTerminatePipelineRunHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		runID          string
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:           "success",
			runID:          "run-to-terminate",
			repoErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: "",
		},
		{
			name:           "missing runId",
			runID:          "",
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing runId",
		},
		{
			name:           "repo invalid run state",
			runID:          "run-done",
			repoErr:        fmt.Errorf("cannot terminate: %w", pipelines.ErrInvalidRunState),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "repo not found",
			runID:          "run-missing",
			repoErr:        repositories.ErrPipelineRunNotFound,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: `"code": "404"`,
		},
		{
			name:           "repo server error",
			runID:          "run-error",
			repoErr:        errors.New("failed to terminate"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestPipelinesHandler()

			if tt.runID != "" {
				repo.On("TerminateRun", mock.Anything, ns, tt.runID).Return(tt.repoErr)
			}

			req := pipelineRequestWithNamespace(http.MethodPost, "/api/v1/pipeline-runs/"+tt.runID+"/terminate", ns, "")
			rr := httptest.NewRecorder()

			params := httprouter.Params{}
			if tt.runID != "" {
				params = httprouter.Params{{Key: "runId", Value: tt.runID}}
			}

			h.TerminatePipelineRunHandler(rr, req, params)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}
			repo.AssertExpectations(t)
		})
	}
}

// ---------- DeletePipelineRunHandler ----------

func TestDeletePipelineRunHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		runID          string
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:           "success",
			runID:          "run-to-delete",
			repoErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: "",
		},
		{
			name:           "missing runId",
			runID:          "",
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing runId",
		},
		{
			name:           "repo invalid run state",
			runID:          "run-active",
			repoErr:        fmt.Errorf("cannot delete active run: %w", pipelines.ErrInvalidRunState),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "repo not found",
			runID:          "run-gone",
			repoErr:        repositories.ErrPipelineRunNotFound,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: `"code": "404"`,
		},
		{
			name:           "repo server error",
			runID:          "run-err",
			repoErr:        errors.New("failed to delete"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestPipelinesHandler()

			if tt.runID != "" {
				repo.On("DeleteRun", mock.Anything, ns, tt.runID).Return(tt.repoErr)
			}

			req := pipelineRequestWithNamespace(http.MethodDelete, "/api/v1/pipeline-runs/"+tt.runID, ns, "")
			rr := httptest.NewRecorder()

			params := httprouter.Params{}
			if tt.runID != "" {
				params = httprouter.Params{{Key: "runId", Value: tt.runID}}
			}

			h.DeletePipelineRunHandler(rr, req, params)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}
			repo.AssertExpectations(t)
		})
	}
}

// ---------- RetryPipelineRunHandler ----------

func TestRetryPipelineRunHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		runID          string
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:           "success",
			runID:          "run-to-retry",
			repoErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: "",
		},
		{
			name:           "missing runId",
			runID:          "",
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing runId",
		},
		{
			name:           "repo invalid run state",
			runID:          "run-running",
			repoErr:        fmt.Errorf("cannot retry running: %w", pipelines.ErrInvalidRunState),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "repo not found",
			runID:          "run-missing",
			repoErr:        repositories.ErrPipelineRunNotFound,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: `"code": "404"`,
		},
		{
			name:           "repo forbidden",
			runID:          "run-denied",
			repoErr:        kubernetes.ErrForbidden,
			wantStatusCode: http.StatusForbidden,
			wantBodySubstr: `"code": "403"`,
		},
		{
			name:           "repo server error",
			runID:          "run-err",
			repoErr:        errors.New("retry failed"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestPipelinesHandler()

			if tt.runID != "" {
				repo.On("RetryRun", mock.Anything, ns, tt.runID).Return(tt.repoErr)
			}

			req := pipelineRequestWithNamespace(http.MethodPost, "/api/v1/pipeline-runs/"+tt.runID+"/retry", ns, "")
			rr := httptest.NewRecorder()

			params := httprouter.Params{}
			if tt.runID != "" {
				params = httprouter.Params{{Key: "runId", Value: tt.runID}}
			}

			h.RetryPipelineRunHandler(rr, req, params)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}
			repo.AssertExpectations(t)
		})
	}
}

// ---------- EnableManagedPipelinesHandler ----------

func TestEnableManagedPipelinesHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		namespace      string
		repoResult     *pipelines.EnableManagedPipelinesResult
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:      "success - enabled",
			namespace: ns,
			repoResult: &pipelines.EnableManagedPipelinesResult{
				DSPAName: "dspa",
				Action:   "enabled",
			},
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"managed pipelines enabled"`,
		},
		{
			name:      "success - restarted",
			namespace: ns,
			repoResult: &pipelines.EnableManagedPipelinesResult{
				DSPAName: "dspa",
				Action:   "restarted",
			},
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"managed pipelines restarted"`,
		},
		{
			name:           "no DSPA found",
			namespace:      ns,
			repoErr:        pipelines.ErrNoDSPAFound,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: `"code": "404"`,
		},
		{
			name:           "DSPA not ready",
			namespace:      ns,
			repoErr:        pipelines.ErrDSPANotReady,
			wantStatusCode: http.StatusServiceUnavailable,
		},
		{
			name:           "forbidden",
			namespace:      ns,
			repoErr:        kubernetes.ErrForbidden,
			wantStatusCode: http.StatusForbidden,
			wantBodySubstr: `"code": "403"`,
		},
		{
			name:           "server error",
			namespace:      ns,
			repoErr:        errors.New("k8s patch failed"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestPipelinesHandler()

			repo.On("EnableManagedPipelines", mock.Anything, tt.namespace).
				Return(tt.repoResult, tt.repoErr)

			req := pipelineRequestWithNamespace(http.MethodPost, "/api/v1/managed-pipelines/enable", tt.namespace, "")
			rr := httptest.NewRecorder()

			h.EnableManagedPipelinesHandler(rr, req, nil)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}
			repo.AssertExpectations(t)
		})
	}
}

// ---------- CreateIndexingPipelineRunHandler ----------

func TestCreateIndexingPipelineRunHandler(t *testing.T) {
	ns := "test-ns"

	validBody := `{"display_name":"index-run","parameters":{"embedding_model_id":"embed","input_data_secret_name":"sec","input_data_bucket_name":"bucket","ogx_secret_name":"ogx","vector_io_provider_id":"milvus"}}`

	tests := []struct {
		name           string
		namespace      string
		body           string
		setupRepo      bool
		repoResult     *models.PipelineRun
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:      "success",
			namespace: ns,
			body:      validBody,
			setupRepo: true,
			repoResult: &models.PipelineRun{
				RunID:        "idx-run-id",
				DisplayName:  "index-run",
				State:        "PENDING",
				PipelineType: "indexing",
			},
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"run_id": "idx-run-id"`,
		},
		{
			name:           "missing namespace",
			namespace:      "",
			body:           validBody,
			setupRepo:      false,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing namespace",
		},
		{
			name:           "invalid JSON body",
			namespace:      ns,
			body:           `{invalid json`,
			setupRepo:      false,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid request body",
		},
		{
			name:           "empty body",
			namespace:      ns,
			body:           "",
			setupRepo:      false,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "unknown field in body",
			namespace:      ns,
			body:           `{"display_name":"x","parameters":{"a":1},"unknown_field":"y"}`,
			setupRepo:      false,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid request body",
		},
		{
			name:           "multiple JSON objects in body",
			namespace:      ns,
			body:           validBody + `{"extra": true}`,
			setupRepo:      false,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "single JSON object",
		},
		{
			name:           "repo validation error",
			namespace:      ns,
			body:           validBody,
			setupRepo:      true,
			repoErr:        repositories.NewValidationError("display_name must be at most 250 characters"),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "indexing pipeline not discovered",
			namespace:      ns,
			body:           validBody,
			setupRepo:      true,
			repoErr:        repositories.ErrManagedPipelinesNotFound,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: `"code": "404"`,
		},
		{
			name:           "repo no DSPA found",
			namespace:      ns,
			body:           validBody,
			setupRepo:      true,
			repoErr:        pipelines.ErrNoDSPAFound,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: "Pipeline Server",
		},
		{
			name:           "repo server error",
			namespace:      ns,
			body:           validBody,
			setupRepo:      true,
			repoErr:        errors.New("pipeline creation failed"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestPipelinesHandler()

			if tt.setupRepo {
				repo.On("CreateIndexingRun", mock.Anything, tt.namespace, mock.AnythingOfType("models.CreateIndexingPipelineRunRequest")).
					Return(tt.repoResult, tt.repoErr)
			}

			req := pipelineRequestWithNamespace(http.MethodPost, "/api/v1/indexing-pipeline-runs", tt.namespace, tt.body)
			rr := httptest.NewRecorder()

			h.CreateIndexingPipelineRunHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			repo.AssertExpectations(t)
		})
	}
}

// ---------- ListManagedPipelinesHandler ----------

func TestListManagedPipelinesHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		namespace      string
		setupRepo      bool
		repoResult     *models.ManagedPipelinesData
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:      "success",
			namespace: ns,
			setupRepo: true,
			repoResult: &models.ManagedPipelinesData{
				Pipelines: []models.ManagedPipeline{
					{
						PipelineType:      "autorag",
						PipelineID:        "rag-id",
						PipelineVersionID: "rag-ver",
						DisplayName:       "documents-rag-optimization-pipeline",
					},
					{
						PipelineType:      "indexing",
						PipelineID:        "idx-id",
						PipelineVersionID: "idx-ver",
						DisplayName:       "documents-indexing-pipeline",
					},
				},
			},
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"pipeline_type": "indexing"`,
		},
		{
			name:           "missing namespace",
			namespace:      "",
			setupRepo:      false,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing namespace",
		},
		{
			name:           "repo no DSPA found",
			namespace:      ns,
			setupRepo:      true,
			repoErr:        pipelines.ErrNoDSPAFound,
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: "Pipeline Server",
		},
		{
			name:           "repo server error",
			namespace:      ns,
			setupRepo:      true,
			repoErr:        errors.New("discovery failed"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestPipelinesHandler()

			if tt.setupRepo {
				repo.On("ListManagedPipelines", mock.Anything, tt.namespace).
					Return(tt.repoResult, tt.repoErr)
			}

			req := pipelineRequestWithNamespace(http.MethodGet, "/api/v1/managed-pipelines", tt.namespace, "")
			rr := httptest.NewRecorder()

			h.ListManagedPipelinesHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			repo.AssertExpectations(t)
		})
	}
}
