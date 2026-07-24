package api

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/model-registry/pkg/openapi"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- GetModelRegistriesHandler tests ---

func TestGetModelRegistriesHandler(t *testing.T) {
	tests := []struct {
		name             string
		setupMock        func(repo *mockModelRegistryRepo)
		wantStatusCode   int
		wantBodyContains string
	}{
		{
			name: "success returns model registries",
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("ListModelRegistries", mock.Anything).
					Return(&models.ModelRegistriesData{
						ModelRegistries: []models.ModelRegistry{
							{
								ID:          "uid-1",
								Name:        "registry-1",
								DisplayName: "Registry 1",
								IsReady:     true,
								ServerURL:   "https://registry-1.example.com",
							},
						},
					}, nil)
			},
			wantStatusCode:   http.StatusOK,
			wantBodyContains: "registry-1",
		},
		{
			name: "forbidden error returns 403",
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("ListModelRegistries", mock.Anything).
					Return(nil, repositories.ErrModelRegistryForbidden)
			},
			wantStatusCode:   http.StatusForbidden,
			wantBodyContains: "insufficient permissions",
		},
		{
			name: "server error returns 500",
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("ListModelRegistries", mock.Anything).
					Return(nil, errors.New("internal failure"))
			},
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "server encountered a problem",
		},
		{
			name: "wrapped forbidden error returns 403",
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("ListModelRegistries", mock.Anything).
					Return(nil, fmt.Errorf("access denied: %w", repositories.ErrModelRegistryForbidden))
			},
			wantStatusCode:   http.StatusForbidden,
			wantBodyContains: "insufficient permissions",
		},
		{
			name: "empty registry list returns 200",
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("ListModelRegistries", mock.Anything).
					Return(&models.ModelRegistriesData{
						ModelRegistries: []models.ModelRegistry{},
					}, nil)
			},
			wantStatusCode: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := new(mockModelRegistryRepo)
			tt.setupMock(repo)

			handler := &ModelRegistryHandler{
				logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
				repo:   repo,
			}

			req := httptest.NewRequest(http.MethodGet, "/api/v1/model-registries", nil)
			rr := httptest.NewRecorder()

			handler.GetModelRegistriesHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}
			repo.AssertExpectations(t)
		})
	}
}

// --- RegisterModelHandler tests ---

func TestRegisterModelHandler(t *testing.T) {
	validBody := `{
		"s3_path": "pipeline/run/model/predictor",
		"model_name": "my-model",
		"version_name": "v1",
		"model_description": "A test model",
		"version_description": "First version"
	}`

	artifactID := "art-123"
	testArtifact := &openapi.ModelArtifact{
		Id:   &artifactID,
		Name: openapi.PtrString("v1"),
	}

	tests := []struct {
		name             string
		registryId       string
		namespace        string
		body             string
		setupMock        func(repo *mockModelRegistryRepo)
		wantStatusCode   int
		wantBodyContains string
	}{
		{
			name:       "success registers model",
			registryId: "registry-uid-1",
			namespace:  "test-ns",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "test-ns").
					Return("rm-123", testArtifact, nil)
			},
			wantStatusCode:   http.StatusCreated,
			wantBodyContains: "rm-123",
		},
		{
			name:             "missing registryId returns 400",
			registryId:       "",
			namespace:        "test-ns",
			body:             validBody,
			setupMock:        func(repo *mockModelRegistryRepo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "registryId",
		},
		{
			name:             "whitespace-only registryId returns 400",
			registryId:       "   ",
			namespace:        "test-ns",
			body:             validBody,
			setupMock:        func(repo *mockModelRegistryRepo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "registryId",
		},
		{
			name:             "invalid JSON body returns 400",
			registryId:       "registry-uid-1",
			namespace:        "test-ns",
			body:             "{invalid json}",
			setupMock:        func(repo *mockModelRegistryRepo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "invalid request body",
		},
		{
			name:             "empty body returns 400",
			registryId:       "registry-uid-1",
			namespace:        "test-ns",
			body:             "",
			setupMock:        func(repo *mockModelRegistryRepo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "invalid request body",
		},
		{
			name:             "unknown fields in body returns 400",
			registryId:       "registry-uid-1",
			namespace:        "test-ns",
			body:             `{"s3_path":"p","model_name":"m","version_name":"v","extra_field":"bad"}`,
			setupMock:        func(repo *mockModelRegistryRepo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "invalid request body",
		},
		{
			name:             "multiple JSON objects returns 400",
			registryId:       "registry-uid-1",
			namespace:        "test-ns",
			body:             validBody + validBody,
			setupMock:        func(repo *mockModelRegistryRepo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "single JSON object",
		},
		{
			name:             "validation error - missing s3_path returns 400",
			registryId:       "registry-uid-1",
			namespace:        "test-ns",
			body:             `{"model_name":"m","version_name":"v"}`,
			setupMock:        func(repo *mockModelRegistryRepo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "s3_path",
		},
		{
			name:             "validation error - missing model_name returns 400",
			registryId:       "registry-uid-1",
			namespace:        "test-ns",
			body:             `{"s3_path":"p","version_name":"v"}`,
			setupMock:        func(repo *mockModelRegistryRepo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "model_name",
		},
		{
			name:             "validation error - missing version_name returns 400",
			registryId:       "registry-uid-1",
			namespace:        "test-ns",
			body:             `{"s3_path":"p","model_name":"m"}`,
			setupMock:        func(repo *mockModelRegistryRepo) {},
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "version_name",
		},
		{
			name:       "repo ErrModelRegistryForbidden returns 403",
			registryId: "registry-uid-1",
			namespace:  "test-ns",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "test-ns").
					Return("", nil, repositories.ErrModelRegistryForbidden)
			},
			wantStatusCode:   http.StatusForbidden,
			wantBodyContains: "insufficient permissions",
		},
		{
			name:       "repo ErrModelRegistryNotFound returns 404",
			registryId: "registry-uid-1",
			namespace:  "test-ns",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "test-ns").
					Return("", nil, repositories.ErrModelRegistryNotFound)
			},
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "no model registry found",
		},
		{
			name:       "repo ErrModelRegistryNotReady returns 503",
			registryId: "registry-uid-1",
			namespace:  "test-ns",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "test-ns").
					Return("", nil, fmt.Errorf("not ready: %w", repositories.ErrModelRegistryNotReady))
			},
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "not ready",
		},
		{
			name:       "repo ErrNoDSPAFound returns 503",
			registryId: "registry-uid-1",
			namespace:  "test-ns",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "test-ns").
					Return("", nil, fmt.Errorf("no DSPA: %w", pipelines.ErrNoDSPAFound))
			},
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "DSPA",
		},
		{
			name:       "repo ErrDSPANotReady returns 503",
			registryId: "registry-uid-1",
			namespace:  "test-ns",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "test-ns").
					Return("", nil, fmt.Errorf("DSPA not ready: %w", pipelines.ErrDSPANotReady))
			},
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "DSPA",
		},
		{
			name:       "repo model registry HTTPError returns that status",
			registryId: "registry-uid-1",
			namespace:  "test-ns",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "test-ns").
					Return("", nil, &modelregistry.HTTPError{
						StatusCode: http.StatusConflict,
						ErrorResponse: modelregistry.ErrorResponse{
							Code:    "409",
							Message: "model already exists",
						},
					})
			},
			wantStatusCode:   http.StatusConflict,
			wantBodyContains: "model already exists",
		},
		{
			name:       "repo generic error returns 500",
			registryId: "registry-uid-1",
			namespace:  "test-ns",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "test-ns").
					Return("", nil, errors.New("unexpected internal error"))
			},
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "server encountered a problem",
		},
		{
			name:       "nil artifact returns 500",
			registryId: "registry-uid-1",
			namespace:  "test-ns",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "test-ns").
					Return("rm-123", nil, nil)
			},
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "server encountered a problem",
		},
		{
			name:       "success without namespace in context",
			registryId: "registry-uid-1",
			namespace:  "",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "").
					Return("rm-123", testArtifact, nil)
			},
			wantStatusCode:   http.StatusCreated,
			wantBodyContains: "rm-123",
		},
		{
			name:       "wrapped ErrModelRegistryForbidden returns 403",
			registryId: "registry-uid-1",
			namespace:  "test-ns",
			body:       validBody,
			setupMock: func(repo *mockModelRegistryRepo) {
				repo.On("RegisterModel", mock.Anything, "registry-uid-1", mock.Anything, "test-ns").
					Return("", nil, fmt.Errorf("access denied: %w", repositories.ErrModelRegistryForbidden))
			},
			wantStatusCode:   http.StatusForbidden,
			wantBodyContains: "insufficient permissions",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := new(mockModelRegistryRepo)
			tt.setupMock(repo)

			handler := &ModelRegistryHandler{
				logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
				repo:   repo,
			}

			req := httptest.NewRequest(http.MethodPost, "/api/v1/model-registries/test-id/models",
				strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			if tt.namespace != "" {
				req = req.WithContext(ctxWithNamespace(tt.namespace))
			}
			rr := httptest.NewRecorder()
			// The registryId comes from httprouter Params, not the URL path.
			ps := httprouter.Params{{Key: "registryId", Value: tt.registryId}}

			handler.RegisterModelHandler(rr, req, ps)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}
			repo.AssertExpectations(t)
		})
	}
}

// --- RegisterModelHandler payload too large test ---

func TestRegisterModelHandler_PayloadTooLarge(t *testing.T) {
	repo := new(mockModelRegistryRepo)
	handler := &ModelRegistryHandler{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		repo:   repo,
	}

	// Create valid-looking JSON that exceeds maxRegisterModelRequestBodyBytes (1 MiB).
	// The key is that json.Decoder must encounter the MaxBytesError during Decode,
	// which requires the body to look like JSON initially.
	bigValue := strings.Repeat("a", (1<<20)+1)
	bigBody := fmt.Sprintf(`{"s3_path":"%s","model_name":"m","version_name":"v"}`, bigValue)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/model-registries/uid-1/models",
		strings.NewReader(bigBody))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	ps := httprouter.Params{{Key: "registryId", Value: "uid-1"}}

	handler.RegisterModelHandler(rr, req, ps)

	assert.Equal(t, http.StatusRequestEntityTooLarge, rr.Code)
	assert.Contains(t, rr.Body.String(), "maximum size")
}

// --- RegisterModelHandler validation edge cases ---

func TestRegisterModelHandler_ValidationEdgeCases(t *testing.T) {
	tests := []struct {
		name             string
		body             string
		wantStatusCode   int
		wantBodyContains string
	}{
		{
			name:             "s3_path with URI scheme rejected",
			body:             `{"s3_path":"s3://bucket/key","model_name":"m","version_name":"v"}`,
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "relative S3 object key",
		},
		{
			name:             "s3_path with leading slash rejected",
			body:             `{"s3_path":"/absolute/path","model_name":"m","version_name":"v"}`,
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "relative path",
		},
		{
			name:             "s3_path with path traversal rejected",
			body:             `{"s3_path":"path/../secret","model_name":"m","version_name":"v"}`,
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "traversal",
		},
		{
			name:             "s3_path with query params rejected",
			body:             `{"s3_path":"path?query=bad","model_name":"m","version_name":"v"}`,
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "query",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := new(mockModelRegistryRepo)
			handler := &ModelRegistryHandler{
				logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
				repo:   repo,
			}

			req := httptest.NewRequest(http.MethodPost, "/api/v1/model-registries/uid-1/models",
				strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = req.WithContext(ctxWithNamespace("test-ns"))
			rr := httptest.NewRecorder()
			ps := httprouter.Params{{Key: "registryId", Value: "uid-1"}}

			handler.RegisterModelHandler(rr, req, ps)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}
			repo.AssertExpectations(t)
		})
	}
}
