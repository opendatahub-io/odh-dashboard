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
		body           string
		repoResult     *models.PipelineRun
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name: "success",
			body: validBody,
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
			name:           "invalid JSON body",
			body:           `{invalid json`,
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid request body",
		},
		{
			name:           "empty body",
			body:           "",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "unknown field in body",
			body:           `{"display_name":"x","unknown_field":"y"}`,
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid request body",
		},
		{
			name:           "multiple JSON objects in body",
			body:           validBody + `{"extra": true}`,
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "single JSON object",
		},
		{
			name:           "repo validation error",
			body:           validBody,
			repoResult:     nil,
			repoErr:        fmt.Errorf("missing field: %w", repositories.ErrValidation),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: `"code": "400"`,
		},
		{
			name:           "repo server error",
			body:           validBody,
			repoResult:     nil,
			repoErr:        errors.New("pipeline creation failed"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
		{
			name:           "repo no DSPA found",
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
			if tt.body == validBody {
				repo.On("CreateRun", mock.Anything, ns, mock.AnythingOfType("models.CreateAutoRAGRunRequest")).
					Return(tt.repoResult, tt.repoErr)
			}

			req := pipelineRequestWithNamespace(http.MethodPost, "/api/v1/pipeline-runs", ns, tt.body)
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
