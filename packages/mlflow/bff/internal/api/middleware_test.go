package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mlflow/bff/internal/config"
	"github.com/opendatahub-io/mlflow/bff/internal/constants"
	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

var discardLogger = slog.New(slog.NewTextHandler(io.Discard, nil))

// mockK8sFactory is a lightweight mock for KubernetesClientFactory used in middleware tests.
type mockK8sFactory struct {
	mock.Mock
}

func (m *mockK8sFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(k8s.KubernetesClientInterface), args.Error(1)
}

func (m *mockK8sFactory) ExtractRequestIdentity(httpHeader http.Header) (*k8s.RequestIdentity, error) {
	args := m.Called(httpHeader)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*k8s.RequestIdentity), args.Error(1)
}

func (m *mockK8sFactory) ValidateRequestIdentity(identity *k8s.RequestIdentity) error {
	args := m.Called(identity)
	return args.Error(0)
}

func newTestAppWithFactory(factory mlflowpkg.MLflowClientFactory) *App {
	return &App{
		config:              config.EnvConfig{AuthMethod: config.AuthMethodUser},
		logger:              discardLogger,
		mlflowClientFactory: factory,
	}
}

func newTestAppWithFactories(mlflowFactory mlflowpkg.MLflowClientFactory, k8sFactory k8s.KubernetesClientFactory) *App {
	return &App{
		config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
		logger:                  discardLogger,
		mlflowClientFactory:     mlflowFactory,
		kubernetesClientFactory: k8sFactory,
	}
}

// withIdentity adds a RequestIdentity to the request context.
func withIdentity(req *http.Request, identity *k8s.RequestIdentity) *http.Request {
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
	return req.WithContext(ctx)
}

// withWorkspace adds a workspace value to the request context.
func withWorkspace(req *http.Request, workspace string) *http.Request {
	ctx := context.WithValue(req.Context(), constants.WorkspaceQueryParameterKey, workspace)
	return req.WithContext(ctx)
}

// --- AttachWorkspace tests ---

func TestAttachWorkspaceSuccess(t *testing.T) {
	app := newTestAppWithFactory(nil)
	var capturedWorkspace string

	handler := app.AttachWorkspace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		capturedWorkspace, _ = r.Context().Value(constants.WorkspaceQueryParameterKey).(string)
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments?workspace=my-ns", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "my-ns", capturedWorkspace)
}

func TestAttachWorkspaceMissing(t *testing.T) {
	app := newTestAppWithFactory(nil)

	handler := app.AttachWorkspace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		t.Fatal("handler should not be called")
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Contains(t, errResp.Error.Message, "workspace")
}

func TestAttachWorkspaceEmpty(t *testing.T) {
	app := newTestAppWithFactory(nil)

	handler := app.AttachWorkspace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		t.Fatal("handler should not be called")
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments?workspace=", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- RequireValidIdentity tests ---

func TestRequireValidIdentitySuccess(t *testing.T) {
	k8sMock := &mockK8sFactory{}
	app := newTestAppWithFactories(nil, k8sMock)

	identity := &k8s.RequestIdentity{Token: k8s.NewBearerToken("my-token")}
	k8sMock.On("ValidateRequestIdentity", identity).Return(nil)

	var called bool
	handler := app.RequireValidIdentity(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	req = withIdentity(req, identity)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.True(t, called)
	k8sMock.AssertExpectations(t)
}

func TestRequireValidIdentityMissing(t *testing.T) {
	k8sMock := &mockK8sFactory{}
	app := newTestAppWithFactories(nil, k8sMock)

	handler := app.RequireValidIdentity(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		t.Fatal("handler should not be called")
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Contains(t, errResp.Error.Message, "RequestIdentity")
}

func TestRequireValidIdentityValidationFails(t *testing.T) {
	k8sMock := &mockK8sFactory{}
	app := newTestAppWithFactories(nil, k8sMock)

	identity := &k8s.RequestIdentity{}
	k8sMock.On("ValidateRequestIdentity", identity).Return(fmt.Errorf("token is required for token-based authentication"))

	handler := app.RequireValidIdentity(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		t.Fatal("handler should not be called")
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	req = withIdentity(req, identity)
	rr := httptest.NewRecorder()
	handler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)

	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "Access unauthorized", errResp.Error.Message)
	k8sMock.AssertExpectations(t)
}

// --- AttachMLflowClient tests ---

func TestAttachMLflowClientWithIdentityToken(t *testing.T) {
	mockFactory := &mlflowpkg.MockFactory{}
	mockClient := &mlflowpkg.MockClient{}
	app := newTestAppWithFactory(mockFactory)

	// Factory receives raw token (no "Bearer " prefix); factory adds it internally
	mockFactory.On("GetClient", mock.Anything, "my-token", "my-ns").
		Return(mockClient, nil)

	var capturedClient mlflowpkg.ClientInterface
	handler := app.AttachMLflowClient(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		capturedClient = r.Context().Value(constants.MLflowClientKey).(mlflowpkg.ClientInterface)
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	req = withIdentity(req, &k8s.RequestIdentity{Token: k8s.NewBearerToken("my-token")})
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	handler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, mockClient, capturedClient)
	mockFactory.AssertExpectations(t)
}

func TestAttachMLflowClientDisabledAuthSkipsIdentity(t *testing.T) {
	mockFactory := &mlflowpkg.MockFactory{}
	mockClient := &mlflowpkg.MockClient{}
	app := newTestAppWithFactory(mockFactory)
	app.config.AuthMethod = config.AuthMethodDisabled

	mockFactory.On("GetClient", mock.Anything, "", "my-ns").
		Return(mockClient, nil)

	handler := app.AttachMLflowClient(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	handler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	mockFactory.AssertExpectations(t)
}

func TestAttachMLflowClientMissingIdentityReturns500(t *testing.T) {
	mockFactory := &mlflowpkg.MockFactory{}
	app := newTestAppWithFactory(mockFactory)
	app.config.AuthMethod = config.AuthMethodUser

	handler := app.AttachMLflowClient(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	req = withWorkspace(req, "my-ns")
	rr := httptest.NewRecorder()

	handler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestAttachMLflowClientGetClientErrors(t *testing.T) {
	tests := []struct {
		name            string
		token           string
		workspace       string
		err             error
		expectedStatus  int
		expectedCode    string
		messageContains string
	}{
		{
			name:           "MLflow not configured returns 503",
			token:          "some-token",
			workspace:      "",
			err:            mlflowpkg.ErrMLflowNotConfigured,
			expectedStatus: http.StatusServiceUnavailable,
			expectedCode:   "service_unavailable",
		},
		{
			name:           "unexpected factory error returns 500",
			token:          "my-token",
			workspace:      "ns",
			err:            fmt.Errorf("some unexpected factory failure"),
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name:           "ErrTokenRequired returns 401",
			token:          "my-token",
			workspace:      "ns",
			err:            mlflowpkg.ErrTokenRequired,
			expectedStatus: http.StatusUnauthorized,
			expectedCode:   "authentication_required",
		},
		{
			name:            "ErrNamespaceRequired returns 400",
			token:           "my-token",
			workspace:       "ns",
			err:             mlflowpkg.ErrNamespaceRequired,
			expectedStatus:  http.StatusBadRequest,
			messageContains: "workspace namespace is required",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			mockFactory := &mlflowpkg.MockFactory{}
			app := newTestAppWithFactory(mockFactory)

			mockFactory.On("GetClient", mock.Anything, tc.token, tc.workspace).
				Return(nil, tc.err)

			handler := app.AttachMLflowClient(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
				t.Fatal("handler should not be called")
			})

			req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
			req = withIdentity(req, &k8s.RequestIdentity{Token: k8s.NewBearerToken(tc.token)})
			if tc.workspace != "" {
				req = withWorkspace(req, tc.workspace)
			}
			rr := httptest.NewRecorder()

			handler(rr, req, nil)

			assert.Equal(t, tc.expectedStatus, rr.Code)

			if tc.expectedCode != "" || tc.messageContains != "" {
				var errResp HTTPError
				require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
				if tc.expectedCode != "" {
					assert.Equal(t, tc.expectedCode, errResp.Error.Code)
				}
				if tc.messageContains != "" {
					assert.Contains(t, errResp.Error.Message, tc.messageContains)
				}
			}

			mockFactory.AssertExpectations(t)
		})
	}
}

func TestAttachMLflowClientWorkspaceFromContext(t *testing.T) {
	mockFactory := &mlflowpkg.MockFactory{}
	mockClient := &mlflowpkg.MockClient{}
	app := newTestAppWithFactory(mockFactory)

	mockFactory.On("GetClient", mock.Anything, "my-token", "workspace-from-ctx").
		Return(mockClient, nil)

	handler := app.AttachMLflowClient(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/experiments", nil)
	req = withIdentity(req, &k8s.RequestIdentity{Token: k8s.NewBearerToken("my-token")})
	req = withWorkspace(req, "workspace-from-ctx")
	rr := httptest.NewRecorder()

	handler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	mockFactory.AssertExpectations(t)
}

// --- InjectRequestIdentity tests ---

func TestInjectRequestIdentityEnforcesAuth(t *testing.T) {
	k8sMock := &mockK8sFactory{}
	k8sMock.On("ExtractRequestIdentity", mock.Anything).
		Return(nil, fmt.Errorf("missing auth headers"))
	app := newTestAppWithFactories(nil, k8sMock)

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, ExperimentsPath, nil)

	app.InjectRequestIdentity(next).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)

	var errResp HTTPError
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&errResp))
	assert.Equal(t, "Access unauthorized", errResp.Error.Message)

	k8sMock.AssertExpectations(t)
}
