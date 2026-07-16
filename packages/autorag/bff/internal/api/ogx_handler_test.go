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
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func newTestOGXHandler() (*OGXHandler, *mockOGXRepo) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := new(mockOGXRepo)
	return &OGXHandler{logger: logger, repo: repo}, repo
}

func ogxRequestWithNamespace(url, namespace string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, url, nil)
	if namespace != "" {
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, namespace)
		req = req.WithContext(ctx)
	}
	return req
}

// ---------- OGXModelsHandler ----------

func TestOGXModelsHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		queryString    string
		repoResult     *models.OGXModelsData
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:        "success",
			queryString: "?secretName=my-ogx-secret",
			repoResult: &models.OGXModelsData{
				Models: []models.OGXModel{
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
			name:           "ErrOGXCredentialValidation returns 400",
			queryString:    "?secretName=bad-cred-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("credential issue: %w", repositories.ErrOGXCredentialValidation),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:        "OGX client invalid request error returns 400",
			queryString: "?secretName=my-ogx-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list OGX models: %w",
				ogx.NewOGXError(ogx.ErrCodeInvalidRequest, "invalid request", http.StatusBadRequest)),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "bad_request",
		},
		{
			name:        "OGX client unauthorized error returns 401",
			queryString: "?secretName=my-ogx-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list OGX models: %w",
				ogx.NewOGXError(ogx.ErrCodeUnauthorized, "unauthorized", http.StatusUnauthorized)),
			wantStatusCode: http.StatusUnauthorized,
			wantBodySubstr: "unauthorized",
		},
		{
			name:        "OGX client not found error returns 404",
			queryString: "?secretName=my-ogx-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list OGX models: %w",
				ogx.NewOGXError(ogx.ErrCodeNotFound, "not found", http.StatusNotFound)),
			wantStatusCode: http.StatusNotFound,
			wantBodySubstr: "not_found",
		},
		{
			name:        "OGX client connection failed error returns 502",
			queryString: "?secretName=my-ogx-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list OGX models: %w",
				ogx.NewOGXError(ogx.ErrCodeConnectionFailed, "connection failed", http.StatusBadGateway)),
			wantStatusCode: http.StatusBadGateway,
			wantBodySubstr: "bad_gateway",
		},
		{
			name:        "OGX client timeout error returns 503",
			queryString: "?secretName=my-ogx-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list OGX models: %w",
				ogx.NewOGXError(ogx.ErrCodeTimeout, "timeout", http.StatusServiceUnavailable)),
			wantStatusCode: http.StatusServiceUnavailable,
			wantBodySubstr: "service_unavailable",
		},
		{
			name:        "OGX client server unavailable error returns 503",
			queryString: "?secretName=my-ogx-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list OGX models: %w",
				ogx.NewOGXError(ogx.ErrCodeServerUnavailable, "unavailable", http.StatusServiceUnavailable)),
			wantStatusCode: http.StatusServiceUnavailable,
			wantBodySubstr: "service_unavailable",
		},
		{
			name:        "OGX client internal error returns 500",
			queryString: "?secretName=my-ogx-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list OGX models: %w",
				ogx.NewOGXError(ogx.ErrCodeInternalError, "internal error", http.StatusInternalServerError)),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: "internal_server_error",
		},
		{
			name:        "OGX client error with zero status code uses default mapping",
			queryString: "?secretName=my-ogx-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list OGX models: %w",
				ogx.NewOGXError(ogx.ErrCodeInvalidRequest, "bad request", 0)),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "bad_request",
		},
		{
			name:           "generic error returns 500",
			queryString:    "?secretName=my-ogx-secret",
			repoResult:     nil,
			repoErr:        errors.New("something broke"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestOGXHandler()

			secretName := ""
			if tt.queryString != "" {
				req := httptest.NewRequest(http.MethodGet, "/test"+tt.queryString, nil)
				secretName = req.URL.Query().Get("secretName")
			}

			// Only set up repo expectation if handler is expected to call the repo
			if secretName != "" {
				// Validate resource name to see if handler would reject it first
				if err := kubernetes.ValidateResourceName("secretName", secretName); err == nil {
					repo.On("GetOGXModels", mock.Anything, ns, secretName).
						Return(tt.repoResult, tt.repoErr)
				}
			}

			req := ogxRequestWithNamespace("/api/v1/ogx/models"+tt.queryString, ns)
			rr := httptest.NewRecorder()

			h.OGXModelsHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}
			repo.AssertExpectations(t)
		})
	}
}

// ---------- OGXVectorStoresHandler ----------

func TestOGXVectorStoresHandler(t *testing.T) {
	ns := "test-ns"

	tests := []struct {
		name           string
		queryString    string
		repoResult     *models.OGXVectorStoreProvidersData
		repoErr        error
		wantStatusCode int
		wantBodySubstr string
	}{
		{
			name:        "success",
			queryString: "?secretName=my-ogx-secret",
			repoResult: &models.OGXVectorStoreProvidersData{
				VectorStoreProviders: []models.OGXVectorStoreProvider{
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
			name:        "OGX client connection error returns 502",
			queryString: "?secretName=my-ogx-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list providers: %w",
				ogx.NewOGXError(ogx.ErrCodeConnectionFailed, "connection failed", http.StatusBadGateway)),
			wantStatusCode: http.StatusBadGateway,
			wantBodySubstr: "bad_gateway",
		},
		{
			name:        "OGX client invalid request error returns 400",
			queryString: "?secretName=my-ogx-secret",
			repoResult:  nil,
			repoErr: fmt.Errorf("failed to list providers: %w",
				ogx.NewOGXError(ogx.ErrCodeInvalidRequest, "bad request", http.StatusBadRequest)),
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "bad_request",
		},
		{
			name:           "ErrOGXCredentialValidation returns 400",
			queryString:    "?secretName=bad-cred-secret",
			repoResult:     nil,
			repoErr:        fmt.Errorf("credential issue: %w", repositories.ErrOGXCredentialValidation),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name:           "generic error returns 500",
			queryString:    "?secretName=my-ogx-secret",
			repoResult:     nil,
			repoErr:        errors.New("something broke"),
			wantStatusCode: http.StatusInternalServerError,
			wantBodySubstr: `"code": "500"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, repo := newTestOGXHandler()

			secretName := ""
			if tt.queryString != "" {
				req := httptest.NewRequest(http.MethodGet, "/test"+tt.queryString, nil)
				secretName = req.URL.Query().Get("secretName")
			}

			// Only set up repo expectation if handler is expected to call the repo
			if secretName != "" {
				if err := kubernetes.ValidateResourceName("secretName", secretName); err == nil {
					repo.On("GetOGXVectorStoreProviders", mock.Anything, ns, secretName).
						Return(tt.repoResult, tt.repoErr)
				}
			}

			req := ogxRequestWithNamespace("/api/v1/ogx/vector-stores"+tt.queryString, ns)
			rr := httptest.NewRecorder()

			h.OGXVectorStoresHandler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}
			repo.AssertExpectations(t)
		})
	}
}

// ---------- handleOGXOrK8sError ----------

func TestHandleOGXOrK8sError(t *testing.T) {
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
			name:           "ErrOGXCredentialValidation",
			err:            fmt.Errorf("credential: %w", repositories.ErrOGXCredentialValidation),
			wantStatusCode: http.StatusBadRequest,
		},
		{
			name: "OGX client error delegates to handleOGXClientError",
			err: fmt.Errorf("wrapped: %w",
				ogx.NewOGXError(ogx.ErrCodeNotFound, "not found", http.StatusNotFound)),
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "not_found",
		},
		{
			name:           "generic error falls through to handleOGXClientError then 500",
			err:            errors.New("unknown error"),
			wantStatusCode: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, _ := newTestOGXHandler()

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			rr := httptest.NewRecorder()

			h.handleOGXOrK8sError(rr, req, tt.err)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}
		})
	}
}

// ---------- handleOGXClientError ----------

func TestHandleOGXClientError(t *testing.T) {
	tests := []struct {
		name             string
		err              error
		wantStatusCode   int
		wantBodyContains string
	}{
		{
			name:             "OGX invalid request",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeInvalidRequest, "bad input", http.StatusBadRequest)),
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "bad_request",
		},
		{
			name:             "OGX unauthorized",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeUnauthorized, "not authorized", http.StatusUnauthorized)),
			wantStatusCode:   http.StatusUnauthorized,
			wantBodyContains: "unauthorized",
		},
		{
			name:             "OGX not found",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeNotFound, "resource not found", http.StatusNotFound)),
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "not_found",
		},
		{
			name:             "OGX connection failed",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeConnectionFailed, "conn failed", http.StatusBadGateway)),
			wantStatusCode:   http.StatusBadGateway,
			wantBodyContains: "bad_gateway",
		},
		{
			name:             "OGX timeout",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeTimeout, "timed out", http.StatusServiceUnavailable)),
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "service_unavailable",
		},
		{
			name:             "OGX server unavailable",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeServerUnavailable, "unavailable", http.StatusServiceUnavailable)),
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "service_unavailable",
		},
		{
			name:             "OGX internal error",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeInternalError, "internal", http.StatusInternalServerError)),
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "internal_server_error",
		},
		{
			name:             "OGX error with zero status uses default mapping for invalid request",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeInvalidRequest, "bad", 0)),
			wantStatusCode:   http.StatusBadRequest,
			wantBodyContains: "bad_request",
		},
		{
			name:             "OGX error with zero status uses default mapping for unauthorized",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeUnauthorized, "auth", 0)),
			wantStatusCode:   http.StatusUnauthorized,
			wantBodyContains: "unauthorized",
		},
		{
			name:             "OGX error with zero status uses default mapping for not found",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeNotFound, "gone", 0)),
			wantStatusCode:   http.StatusNotFound,
			wantBodyContains: "not_found",
		},
		{
			name:             "OGX error with zero status uses default mapping for connection failed",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeConnectionFailed, "conn", 0)),
			wantStatusCode:   http.StatusBadGateway,
			wantBodyContains: "bad_gateway",
		},
		{
			name:             "OGX error with zero status uses default mapping for timeout",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeTimeout, "timeout", 0)),
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "service_unavailable",
		},
		{
			name:             "OGX error with zero status uses default mapping for server unavailable",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError(ogx.ErrCodeServerUnavailable, "down", 0)),
			wantStatusCode:   http.StatusServiceUnavailable,
			wantBodyContains: "service_unavailable",
		},
		{
			name:             "OGX error with zero status and unknown code defaults to 500",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError("UNKNOWN_CODE", "unknown", 0)),
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "internal_server_error",
		},
		{
			name:             "OGX error with custom 4xx status",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError("CUSTOM", "custom error", 429)),
			wantStatusCode:   429,
			wantBodyContains: "ogx_error",
		},
		{
			name:             "OGX error with custom 5xx status",
			err:              fmt.Errorf("wrapped: %w", ogx.NewOGXError("CUSTOM", "custom server error", 599)),
			wantStatusCode:   599,
			wantBodyContains: "server_error",
		},
		{
			name:             "non-OGX error returns 500",
			err:              errors.New("generic failure"),
			wantStatusCode:   http.StatusInternalServerError,
			wantBodyContains: "server encountered a problem",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, _ := newTestOGXHandler()

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			rr := httptest.NewRecorder()

			h.handleOGXClientError(rr, req, tt.err)

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodyContains != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodyContains)
			}
		})
	}
}
