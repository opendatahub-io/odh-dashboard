package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func newTestMaaSHandler() (*MaaSHandler, *mockMaaSRepo) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := new(mockMaaSRepo)
	return &MaaSHandler{logger: logger, repo: repo}, repo
}

func maasRequestWithNamespace(url, namespace string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, url, nil)
	if namespace != "" {
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, namespace)
		req = req.WithContext(ctx)
	}
	return req
}

// ---------- MaaSModelsHandler ----------

func TestMaaSModelsHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		queryString    string
		repoResult     *models.MaaSModelsData
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:        "success",
			queryString: "?secretName=my-maas-secret",
			repoResult: &models.MaaSModelsData{
				Models: []models.MaaSModel{
					{ID: "llama3.2:3b", Type: "llm", Provider: "ollama", ResourcePath: "ollama/llama3.2:3b"},
				},
			},
			repoErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"id": "llama3.2:3b"`,
		},
		{
			name:           "missing secretName returns 400",
			queryString:    "",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "secretName",
		},
		{
			name:           "invalid secretName returns 400",
			queryString:    "?secretName=INVALID_NAME%21%21",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid secretName",
		},
		{
			name:           "k8s ErrNotFound returns 404",
			queryString:    "?secretName=missing-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("failed to get secret: %w", kubernetes.ErrNotFound),
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: "not found",
		},
		{
			name:           "k8s ErrForbidden returns 403",
			queryString:    "?secretName=forbidden-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("failed to get secret: %w", kubernetes.ErrForbidden),
			wantStatusCode: http.StatusForbidden,
			wantBodySubstr: `"code": "403"`,
		},
		{
			name:           "k8s ErrUnauthorized returns 401",
			queryString:    "?secretName=unauthorized-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("failed to get secret: %w", kubernetes.ErrUnauthorized),
			wantStatusCode: http.StatusUnauthorized,
		},
		{
			name:           "k8s ErrInvalid returns 400",
			queryString:    "?secretName=invalid-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("invalid: %w", kubernetes.ErrInvalid),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "k8s ErrBadRequest returns 400",
			queryString:    "?secretName=bad-request-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("bad request: %w", kubernetes.ErrBadRequest),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "k8s ErrAmbiguousSecretKey returns 400",
			queryString:    "?secretName=ambiguous-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("ambiguous: %w", kubernetes.ErrAmbiguousSecretKey),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "ErrMaaSCredentialValidation returns 400",
			queryString:    "?secretName=bad-cred-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("credential issue: %w", repositories.ErrMaaSCredentialValidation),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:        "MaaS client invalid request error returns 400",
			queryString: "?secretName=my-maas-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list MaaS models: %w",
				maas.NewMaaSError(maas.ErrCodeInvalidRequest, "invalid request", http.StatusBadRequest)),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "bad_request",
		},
		{
			name:        "MaaS client unauthorized error returns 401",
			queryString: "?secretName=my-maas-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list MaaS models: %w",
				maas.NewMaaSError(maas.ErrCodeUnauthorized, "unauthorized", http.StatusUnauthorized)),
			wantStatusCode: http.StatusUnauthorized,
			wantBodySubstr: "unauthorized",
		},
		{
			name:        "MaaS client not found error returns 404",
			queryString: "?secretName=my-maas-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list MaaS models: %w",
				maas.NewMaaSError(maas.ErrCodeNotFound, "not found", http.StatusNotFound)),
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: "not_found",
		},
		{
			name:        "MaaS client connection failed error returns 502",
			queryString: "?secretName=my-maas-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list MaaS models: %w",
				maas.NewMaaSError(maas.ErrCodeConnectionFailed, "connection failed", http.StatusBadGateway)),
			wantStatusCode: http.StatusBadGateway,
			wantBodySubstr: "bad_gateway",
		},
		{
			name:        "MaaS client timeout error returns 503",
			queryString: "?secretName=my-maas-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list MaaS models: %w",
				maas.NewMaaSError(maas.ErrCodeTimeout, "timeout", http.StatusServiceUnavailable)),
			wantStatusCode: http.StatusServiceUnavailable,
			wantBodySubstr: "service_unavailable",
		},
		{
			name:        "MaaS client server unavailable error returns 503",
			queryString: "?secretName=my-maas-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list MaaS models: %w",
				maas.NewMaaSError(maas.ErrCodeServerUnavailable, "unavailable", http.StatusServiceUnavailable)),
			wantStatusCode: http.StatusServiceUnavailable,
			wantBodySubstr: "service_unavailable",
		},
		{
			name:        "MaaS client internal error returns 500",
			queryString: "?secretName=my-maas-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list MaaS models: %w",
				maas.NewMaaSError(maas.ErrCodeInternalError, "internal error", http.StatusInternalServerError)),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: "internal_server_error",
		},
		{
			name:        "MaaS client error with zero status code uses default mapping",
			queryString: "?secretName=my-maas-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list MaaS models: %w",
				maas.NewMaaSError(maas.ErrCodeInvalidRequest, "bad request", 0)),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "bad_request",
		},
		{
			name:           "generic error returns 500",
			queryString:    "?secretName=my-maas-secret",
			repoResult:     nil,
			repoErr:        errors.New("something broke"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestMaaSHandler()

			secretName := ""
			if tt.queryString != "" {
				req := httptest.NewRequest(http.MethodGet, "/test"+tt.queryString, nil)
				secretName = req.URL.Query().Get("secretName")
			}

			// Only set up repo expectation if handler is expected to call the repo
			if secretName != "" {
				// Validate resource name to see if handler would reject it first
				if err := kubernetes.ValidateResourceName("secretName", secretName); err == nil {
					repo.On("GetMaaSModels", mock.Anything, ns, secretName).
						Return(tt.repoResult, tt.repoErr)
				}
			}

			req := maasRequestWithNamespace("/api/v1/maas/models"+tt.queryString, ns)
			rr := httptest.NewRecorder()

			h.MaaSModelsHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}
			repo.AssertExpectations(t)
		})
	}
}

// ---------- MaaSVectorStoresHandler ----------

func TestMaaSVectorStoresHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		queryString    string
		repoResult     *models.MaaSVectorStoreProvidersData
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:        "success",
			queryString: "?secretName=my-maas-secret",
			repoResult: &models.MaaSVectorStoreProvidersData{
				VectorStoreProviders: []models.MaaSVectorStoreProvider{
					{ProviderID: "milvus", ProviderType: "remote::milvus"},
				},
			},
			repoErr:        nil,
			wantStatusCode: http.StatusOK,
			wantBodySubstr: `"provider_id": "milvus"`,
		},
		{
			name:           "missing secretName returns 400",
			queryString:    "",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "secretName",
		},
		{
			name:           "invalid secretName returns 400",
			queryString:    "?secretName=INVALID_NAME%21%21",
			repoResult:     nil,
			repoErr:        nil,
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid secretName",
		},
		{
			name:           "k8s ErrNotFound returns 404",
			queryString:    "?secretName=missing-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("failed to get secret: %w", kubernetes.ErrNotFound),
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: "not found",
		},
		{
			name:           "k8s ErrForbidden returns 403",
			queryString:    "?secretName=forbidden-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("failed to get secret: %w", kubernetes.ErrForbidden),
			wantStatusCode: http.StatusForbidden,
			wantBodySubstr: `"code": "403"`,
		},
		{
			name:           "k8s ErrUnauthorized returns 401",
			queryString:    "?secretName=unauthorized-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("failed to get secret: %w", kubernetes.ErrUnauthorized),
			wantStatusCode: http.StatusUnauthorized,
		},
		{
			name:        "MaaS client connection error returns 502",
			queryString: "?secretName=my-maas-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list providers: %w",
				maas.NewMaaSError(maas.ErrCodeConnectionFailed, "connection failed", http.StatusBadGateway)),
			wantStatusCode: http.StatusBadGateway,
			wantBodySubstr: "bad_gateway",
		},
		{
			name:        "MaaS client invalid request error returns 400",
			queryString: "?secretName=my-maas-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list providers: %w",
				maas.NewMaaSError(maas.ErrCodeInvalidRequest, "bad request", http.StatusBadRequest)),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "bad_request",
		},
		{
			name:           "ErrMaaSCredentialValidation returns 400",
			queryString:    "?secretName=bad-cred-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("credential issue: %w", repositories.ErrMaaSCredentialValidation),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "generic error returns 500",
			queryString:    "?secretName=my-maas-secret",
			repoResult:     nil,
			repoErr:        errors.New("something broke"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestMaaSHandler()

			secretName := ""
			if tt.queryString != "" {
				req := httptest.NewRequest(http.MethodGet, "/test"+tt.queryString, nil)
				secretName = req.URL.Query().Get("secretName")
			}

			// Only set up repo expectation if handler is expected to call the repo
			if secretName != "" {
				if err := kubernetes.ValidateResourceName("secretName", secretName); err == nil {
					repo.On("GetMaaSVectorStoreProviders", mock.Anything, ns, secretName).
						Return(tt.repoResult, tt.repoErr)
				}
			}

			req := maasRequestWithNamespace("/api/v1/maas/vector-stores"+tt.queryString, ns)
			rr := httptest.NewRecorder()

			h.MaaSVectorStoresHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}
			repo.AssertExpectations(t)
		})
	}
}

// ---------- handleMaaSOrK8sError ----------

func TestHandleMaaSOrK8sError(t *testing.T) {
	tests := []struct {
		name             string
		err              error
		wantStatusCode   int
		wantBodyContains string
	}{
		{
			name:             "kubernetes ErrNotFound",
			err:              fmt.Errorf("secret not found: %w", kubernetes.ErrNotFound),
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "not found",
		},
		{
			name:           "kubernetes ErrForbidden",
			err:            fmt.Errorf("forbidden: %w", kubernetes.ErrForbidden),
			wantStatusCode: http.StatusForbidden,
		},
		{
			name:           "kubernetes ErrUnauthorized",
			err:            fmt.Errorf("unauthorized: %w", kubernetes.ErrUnauthorized),
			wantStatusCode: http.StatusUnauthorized,
		},
		{
			name:           "kubernetes ErrInvalid",
			err:            fmt.Errorf("invalid: %w", kubernetes.ErrInvalid),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "kubernetes ErrBadRequest",
			err:            fmt.Errorf("bad request: %w", kubernetes.ErrBadRequest),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "kubernetes ErrAmbiguousSecretKey",
			err:            fmt.Errorf("ambiguous: %w", kubernetes.ErrAmbiguousSecretKey),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "ErrMaaSCredentialValidation",
			err:            fmt.Errorf("credential: %w", repositories.ErrMaaSCredentialValidation),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name: "MaaS client error delegates to handleMaaSClientError",
			err: fmt.Errorf("wrapped: %w",
				maas.NewMaaSError(maas.ErrCodeNotFound, "not found", http.StatusNotFound)),
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "not_found",
		},
		{
			name:           "generic error falls through to handleMaaSClientError then 500",
			err:            errors.New("unknown error"),
			wantStatusCode: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, _ := newTestMaaSHandler()

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			rr := httptest.NewRecorder()

			h.handleMaaSOrK8sError(rr, req, tt.err)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}
		})
	}
}

// ---------- handleMaaSClientError ----------

func TestHandleMaaSClientError(t *testing.T) {
	tests := []struct {
		name             string
		err              error
		wantStatusCode   int
		wantBodyContains string
	}{
		{
			name:             "MaaS invalid request",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeInvalidRequest, "bad input", http.StatusBadRequest)),
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "bad_request",
		},
		{
			name:             "MaaS unauthorized",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeUnauthorized, "not authorized", http.StatusUnauthorized)),
			wantStatusCode:   http.StatusUnauthorized,
			wantBodyContains: "unauthorized",
		},
		{
			name:             "MaaS not found",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeNotFound, "resource not found", http.StatusNotFound)),
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "not_found",
		},
		{
			name:             "MaaS connection failed",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeConnectionFailed, "conn failed", http.StatusBadGateway)),
			wantStatusCode:   http.StatusBadGateway,
			wantBodyContains: "bad_gateway",
		},
		{
			name:             "MaaS timeout",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeTimeout, "timed out", http.StatusServiceUnavailable)),
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "service_unavailable",
		},
		{
			name:             "MaaS server unavailable",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeServerUnavailable, "unavailable", http.StatusServiceUnavailable)),
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "service_unavailable",
		},
		{
			name:             "MaaS internal error",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeInternalError, "internal", http.StatusInternalServerError)),
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "internal_server_error",
		},
		{
			name:             "MaaS error with zero status uses default mapping for invalid request",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeInvalidRequest, "bad", 0)),
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "bad_request",
		},
		{
			name:             "MaaS error with zero status uses default mapping for unauthorized",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeUnauthorized, "auth", 0)),
			wantStatusCode:   http.StatusUnauthorized,
			wantBodyContains: "unauthorized",
		},
		{
			name:             "MaaS error with zero status uses default mapping for not found",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeNotFound, "gone", 0)),
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "not_found",
		},
		{
			name:             "MaaS error with zero status uses default mapping for connection failed",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeConnectionFailed, "conn", 0)),
			wantStatusCode:   http.StatusBadGateway,
			wantBodyContains: "bad_gateway",
		},
		{
			name:             "MaaS error with zero status uses default mapping for timeout",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeTimeout, "timeout", 0)),
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "service_unavailable",
		},
		{
			name:             "MaaS error with zero status uses default mapping for server unavailable",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError(maas.ErrCodeServerUnavailable, "down", 0)),
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "service_unavailable",
		},
		{
			name:             "MaaS error with zero status and unknown code defaults to 500",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError("UNKNOWN_CODE", "unknown", 0)),
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "internal_server_error",
		},
		{
			name:             "MaaS error with custom 4xx status",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError("CUSTOM", "custom error", 429)),
			wantStatusCode:   429,
			wantBodyContains: "maas_error",
		},
		{
			name:             "MaaS error with custom 5xx status",
			err:              fmt.Errorf("wrapped: %w", maas.NewMaaSError("CUSTOM", "custom server error", 599)),
			wantStatusCode:   599,
			wantBodyContains: "server_error",
		},
		{
			name:             "non-MaaS error returns 500",
			err:              errors.New("generic failure"),
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "server encountered a problem",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, _ := newTestMaaSHandler()

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			rr := httptest.NewRecorder()

			h.handleMaaSClientError(rr, req, tt.err)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}
		})
	}
}
