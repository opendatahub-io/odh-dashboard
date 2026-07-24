package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestMiddleware_AttachNamespace(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	tests := []struct {
		name             string
		queryParam       string
		wantStatusCode   int
		wantBodySubstr   string
		wantNamespaceCtx string // expected namespace in context; empty means inner handler should not be called
	}{
		{
			name:           "missing namespace query param returns 400",
			queryParam:     "",
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing required query parameter",
		},
		{
			name:           "empty string namespace returns 400",
			queryParam:     "",
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing required query parameter",
		},
		{
			name:           "invalid namespace (DNS-1123 violation) returns 400",
			queryParam:     "INVALID_NAMESPACE",
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "invalid namespace",
		},
		{
			name:             "valid namespace passes through",
			queryParam:       "my-namespace",
			wantStatusCode:   http.StatusOK,
			wantNamespaceCtx: "my-namespace",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mw := &Middleware{
				logger: logger,
				config: config.EnvConfig{},
			}

			var capturedNamespace string
			inner := func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
				ns, _ := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
				capturedNamespace = ns
				w.WriteHeader(http.StatusOK)
			}

			handler := mw.AttachNamespace(inner)

			url := "/test"
			if tt.queryParam != "" {
				url += "?namespace=" + tt.queryParam
			}
			req := httptest.NewRequest(http.MethodGet, url, nil)
			rr := httptest.NewRecorder()

			handler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)
			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}
			if tt.wantNamespaceCtx != "" {
				assert.Equal(t, tt.wantNamespaceCtx, capturedNamespace)
			}
		})
	}
}

func TestMiddleware_RequireAccessToService(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	tests := []struct {
		name           string
		authMethod     string
		namespace      string // injected into context; empty means no namespace in context
		mockAllowed    bool
		mockErr        error
		wantStatusCode int
		wantBodySubstr string
		expectMockCall bool // whether CanAccessResource should be called
	}{
		{
			name:           "auth disabled passes through without RBAC check",
			authMethod:     config.AuthMethodDisabled,
			namespace:      "",
			wantStatusCode: http.StatusOK,
			expectMockCall: false,
		},
		{
			name:           "missing namespace in context returns 400",
			authMethod:     config.AuthMethodInternal,
			namespace:      "",
			wantStatusCode: http.StatusBadRequest,
			wantBodySubstr: "missing namespace in context",
			expectMockCall: false,
		},
		{
			name:           "SSAR returns allowed=true passes through",
			authMethod:     config.AuthMethodInternal,
			namespace:      "test-ns",
			mockAllowed:    true,
			mockErr:        nil,
			wantStatusCode: http.StatusOK,
			expectMockCall: true,
		},
		{
			name:           "SSAR returns allowed=false returns 403",
			authMethod:     config.AuthMethodInternal,
			namespace:      "test-ns",
			mockAllowed:    false,
			mockErr:        nil,
			wantStatusCode: http.StatusForbidden,
			wantBodySubstr: "services",
			expectMockCall: true,
		},
		{
			name:           "SSAR returns ErrUnauthorized returns 401",
			authMethod:     config.AuthMethodUser,
			namespace:      "test-ns",
			mockAllowed:    false,
			mockErr:        kubernetes.ErrUnauthorized,
			wantStatusCode: http.StatusUnauthorized,
			expectMockCall: true,
		},
		{
			name:           "SSAR returns ErrForbidden returns 403",
			authMethod:     config.AuthMethodUser,
			namespace:      "test-ns",
			mockAllowed:    false,
			mockErr:        kubernetes.ErrForbidden,
			wantStatusCode: http.StatusForbidden,
			wantBodySubstr: "insufficient permissions",
			expectMockCall: true,
		},
		{
			name:           "SSAR returns generic error returns 500",
			authMethod:     config.AuthMethodInternal,
			namespace:      "test-ns",
			mockAllowed:    false,
			mockErr:        errors.New("connection refused"),
			wantStatusCode: http.StatusInternalServerError,
			expectMockCall: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			k8sMock := new(mockK8sService)

			if tt.expectMockCall {
				k8sMock.On("CanAccessResource",
					mock.Anything,
					tt.namespace,
					"list",
					"datasciencepipelinesapplications.opendatahub.io",
					"datasciencepipelinesapplications",
					"",
				).Return(tt.mockAllowed, tt.mockErr)
			}

			mw := &Middleware{
				logger:     logger,
				config:     config.EnvConfig{AuthMethod: tt.authMethod},
				k8sService: k8sMock,
			}

			innerCalled := false
			inner := func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
				innerCalled = true
				w.WriteHeader(http.StatusOK)
			}

			handler := mw.RequireAccessToService(inner)

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			// Inject a trace logger into context so GetContextLoggerFromReq does not warn
			ctx := context.WithValue(req.Context(), constants.TraceLoggerKey, logger)
			if tt.namespace != "" {
				ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, tt.namespace)
			}
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			handler(rr, req, httprouter.Params{})

			assert.Equal(t, tt.wantStatusCode, rr.Code)

			if tt.wantStatusCode == http.StatusOK {
				assert.True(t, innerCalled, "expected inner handler to be called")
			} else {
				assert.False(t, innerCalled, "expected inner handler NOT to be called")
				// Verify error response is valid JSON with error envelope
				var envelope ErrorEnvelope
				err := json.Unmarshal(rr.Body.Bytes(), &envelope)
				assert.NoError(t, err, "response body should be valid JSON")
				assert.NotNil(t, envelope.Error, "error envelope should contain an error")
			}

			if tt.wantBodySubstr != "" {
				assert.Contains(t, rr.Body.String(), tt.wantBodySubstr)
			}

			k8sMock.AssertExpectations(t)
		})
	}
}
