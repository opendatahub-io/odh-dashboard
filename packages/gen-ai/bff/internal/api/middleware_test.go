package api

import (
	"context"
	"crypto/x509"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// CapturingMockClientFactory wraps the standard mock factory to capture URLs
// used when creating clients, for verification in tests.
type CapturingMockClientFactory struct {
	CapturedURL string
}

func (f *CapturingMockClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) llamastack.LlamaStackClientInterface {
	f.CapturedURL = baseURL
	return lsmocks.NewMockLlamaStackClient()
}

func TestAttachLlamaStackClient(t *testing.T) {
	t.Run("should attach mock client when MockLSClient is true", func(t *testing.T) {
		app := App{
			config:                  config.EnvConfig{MockLSClient: true},
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/llamastack-distribution/status", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testutil.TestNamespace))
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			client := r.Context().Value(constants.LlamaStackClientKey)
			assert.NotNil(t, client)
			// Verify the mock client is attached and is functional
			mockClient := client.(*lsmocks.MockLlamaStackClient)
			models, _ := mockClient.ListModels(r.Context())
			assert.Len(t, models, 4)
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("should use LLAMA_STACK_URL environment override when set", func(t *testing.T) {
		mockFactory := &CapturingMockClientFactory{}

		app := App{
			config:                  config.EnvConfig{LlamaStackURL: testutil.TestLlamaStackURL},
			llamaStackClientFactory: mockFactory,
			repositories:            repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/llamastack-distribution/status", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testutil.TestNamespace)
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "FAKE_BEARER_TOKEN"})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			assert.NotNil(t, r.Context().Value(constants.LlamaStackClientKey))
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, testutil.TestLlamaStackURL, mockFactory.CapturedURL)
	})

	t.Run("should retrieve service url from LlamaStackDistribution when no env provided", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		testEnv, ctrlClient, err := k8smocks.SetupEnvTest(k8smocks.TestEnvInput{
			Users: k8smocks.DefaultTestUsers, Logger: slog.Default(), Ctx: ctx, Cancel: cancel,
		})
		require.NoError(t, err)
		defer func() {
			_ = testEnv.Stop()
		}()

		k8sFactory, _ := k8smocks.NewTokenClientFactory(ctrlClient, testEnv.Config, slog.Default())
		mockFactory := &CapturingMockClientFactory{}

		app := App{
			kubernetesClientFactory: k8sFactory,
			llamaStackClientFactory: mockFactory,
			repositories:            repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/llamastack-distribution/status", nil)
		reqCtx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testutil.TestNamespace)
		reqCtx = context.WithValue(reqCtx, constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "FAKE_BEARER_TOKEN"})
		req = req.WithContext(reqCtx)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			assert.NotNil(t, r.Context().Value(constants.LlamaStackClientKey))
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "http://mock-lsd.test-namespace.svc.cluster.local:8321", mockFactory.CapturedURL)
	})

	// Error cases
	t.Run("should return error when namespace is missing from context", func(t *testing.T) {
		app := App{
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/llamastack-distribution/status", nil)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "missing namespace in context")
	})

	t.Run("should return error when RequestIdentity is missing from context", func(t *testing.T) {
		app := App{
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/llamastack-distribution/status", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testutil.TestNamespace))
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})

}

func TestRequireAccessToService(t *testing.T) {
	t.Run("should skip authorization checks when auth is disabled", func(t *testing.T) {
		app := App{
			config: config.EnvConfig{AuthMethod: config.AuthMethodDisabled},
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/test", nil)
		rr := httptest.NewRecorder()

		handlerCalled := false
		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.True(t, handlerCalled, "Next handler should be called when auth is disabled")
	})

	t.Run("should return bad request when RequestIdentity is missing", func(t *testing.T) {
		app := App{
			config: config.EnvConfig{AuthMethod: config.AuthMethodUser},
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/test", nil)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "missing RequestIdentity in context")
	})

	t.Run("should return bad request when ValidateRequestIdentity fails", func(t *testing.T) {
		mockFactory := k8smocks.NewMockTokenClientFactory()
		app := App{
			config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/test", nil)
		// Add invalid identity (missing token)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: ""})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "token is required")
	})

	t.Run("should skip namespace authorization when namespace is not in context", func(t *testing.T) {
		mockFactory := k8smocks.NewMockTokenClientFactory()
		app := App{
			config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/test", nil)
		// Add valid identity but NO namespace
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "valid-token"})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handlerCalled := false
		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.True(t, handlerCalled, "Next handler should be called when namespace is not present")
	})

	t.Run("should return server error when k8sClient.GetClient fails", func(t *testing.T) {
		// Create a mock factory that returns an error when GetClient is called
		mockFactory := &k8smocks.FailingMockTokenClientFactory{
			GetClientError: assert.AnError,
		}
		app := App{
			config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "valid-token"})
		// add a namespace so we enter block to test for namespace access
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testutil.TestNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		// Server errors return generic message (detailed error is logged but not exposed to client)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})

	t.Run("should return 401 with clear message when k8s API returns Unauthorized", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListLSDError: k8smocks.NewUnauthorizedError(),
		}
		app := App{
			config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "invalid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testutil.TestNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "authentication failed: invalid or expired token")
	})

	t.Run("should return 403 with clear message when k8s API returns Forbidden", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListLSDError: k8smocks.NewForbiddenError(),
		}
		app := App{
			config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "valid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testutil.TestNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusForbidden, rr.Code)
		assert.Contains(t, rr.Body.String(), "insufficient permissions to access services in this namespace")
	})

	t.Run("should return server error when CanListLlamaStackDistributions returns other error", func(t *testing.T) {
		// Use a K8sError to match what the real implementation returns after wrapping
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListLSDError: kubernetes.NewK8sErrorWithNamespace(
				kubernetes.ErrCodeInternalError,
				"failed to verify user permissions: some internal error",
				testutil.TestNamespace,
				500,
			),
		}
		app := App{
			config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "valid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testutil.TestNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		// Server errors return the K8sError message
		assert.Contains(t, rr.Body.String(), "failed to verify user permissions")
	})

	t.Run("should return 403 when user is not allowed to access namespace", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListLSDAllowed: false, // User not allowed
		}
		app := App{
			config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "valid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testutil.TestNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusForbidden, rr.Code)
		assert.Contains(t, rr.Body.String(), "user does not have permission to access services in this namespace")
	})

	t.Run("should call next handler when user is allowed to access namespace", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListLSDAllowed: true, // User allowed
		}
		app := App{
			config:                  config.EnvConfig{AuthMethod: config.AuthMethodUser},
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/gen-ai/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "valid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testutil.TestNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handlerCalled := false
		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			handlerCalled = true
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.True(t, handlerCalled, "Next handler should be called when user is authorized")
	})
}
