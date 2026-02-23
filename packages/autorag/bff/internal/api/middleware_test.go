package api

import (
	"context"
	"crypto/x509"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes/k8smocks"
	ls "github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	testNamespace     = "test-namespace"
	testLlamaStackURL = "http://test-llama-stack:8321"
)

// CapturingMockClientFactory wraps the standard mock factory to capture URLs
// used when creating clients, for verification in tests.
type CapturingMockClientFactory struct {
	CapturedURL string
}

func (f *CapturingMockClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool, apiPath string) ls.LlamaStackClientInterface {
	f.CapturedURL = baseURL
	return lsmocks.NewMockLlamaStackClient()
}

func TestAttachNamespace(t *testing.T) {
	t.Run("should return 400 when namespace query parameter is missing", func(t *testing.T) {
		app := App{}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil) // no ?namespace=
		rr := httptest.NewRecorder()

		app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called when namespace is missing")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "missing required query parameter")
	})

	t.Run("should attach namespace to context and call next when namespace is present", func(t *testing.T) {
		app := App{}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models?namespace=my-namespace", nil)
		rr := httptest.NewRecorder()

		var capturedNamespace string
		app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			capturedNamespace = r.Context().Value(constants.NamespaceQueryParameterKey).(string)
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "my-namespace", capturedNamespace)
	})
}

func TestAttachLlamaStackClient(t *testing.T) {
	t.Run("should attach mock client when MockLSClient is true", func(t *testing.T) {
		app := App{
			config:                  config.EnvConfig{MockLSClient: true},
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testNamespace))
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			client := r.Context().Value(constants.LlamaStackClientKey)
			assert.NotNil(t, client)
			mockClient := client.(*lsmocks.MockLlamaStackClient)
			models, _ := mockClient.ListModels(r.Context())
			assert.Len(t, models, 7) // autorag mock returns 7 models
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("should use LLAMA_STACK_URL environment override when set", func(t *testing.T) {
		mockFactory := &CapturingMockClientFactory{}

		app := App{
			config:                  config.EnvConfig{LlamaStackURL: testLlamaStackURL},
			llamaStackClientFactory: mockFactory,
			repositories:            repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testNamespace)
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "FAKE_BEARER_TOKEN"})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			assert.NotNil(t, r.Context().Value(constants.LlamaStackClientKey))
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, testLlamaStackURL, mockFactory.CapturedURL)
	})

	t.Run("should retrieve service url from LlamaStackDistribution when no env provided", func(t *testing.T) {
		mockK8sFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListLSDAllowed: true,
			// Will return default mock LSD with serviceURL
		}
		mockLSFactory := &CapturingMockClientFactory{}

		app := App{
			logger:                  slog.Default(),
			kubernetesClientFactory: mockK8sFactory,
			llamaStackClientFactory: mockLSFactory,
			repositories:            repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		reqCtx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testNamespace)
		reqCtx = context.WithValue(reqCtx, constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "FAKE_BEARER_TOKEN"})
		req = req.WithContext(reqCtx)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			assert.NotNil(t, r.Context().Value(constants.LlamaStackClientKey))
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "http://mock-lsd.test-namespace.svc.cluster.local:8321", mockLSFactory.CapturedURL)
	})

	t.Run("should return error when namespace is missing from context", func(t *testing.T) {
		app := App{
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "missing namespace in context")
	})

	t.Run("should return error when RequestIdentity is missing from context (non-mock mode)", func(t *testing.T) {
		app := App{
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		req = req.WithContext(context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testNamespace))
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})

	t.Run("should return error when GetClient fails", func(t *testing.T) {
		mockK8sFactory := &k8smocks.FailingMockTokenClientFactory{
			GetClientError: assert.AnError,
		}

		app := App{
			config:                  config.EnvConfig{},
			kubernetesClientFactory: mockK8sFactory,
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testNamespace)
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})

	t.Run("should return error when GetLlamaStackDistributions fails", func(t *testing.T) {
		mockK8sFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			GetLSDError: assert.AnError,
		}

		app := App{
			config:                  config.EnvConfig{},
			kubernetesClientFactory: mockK8sFactory,
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testNamespace)
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})

	t.Run("should return 404 when no LlamaStackDistribution found in namespace", func(t *testing.T) {
		mockK8sFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			ShouldReturnEmptyLSD: true,
		}

		app := App{
			config:                  config.EnvConfig{},
			kubernetesClientFactory: mockK8sFactory,
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testNamespace)
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		// 404 is correct: no LSD resource exists in the namespace, so the resource is not found
		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), "the requested resource could not be found")
	})

	t.Run("should return error when LlamaStackDistribution has no serviceURL", func(t *testing.T) {
		mockK8sFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			ShouldReturnNoURL: true,
		}

		app := App{
			config:                  config.EnvConfig{},
			kubernetesClientFactory: mockK8sFactory,
			llamaStackClientFactory: lsmocks.NewMockClientFactory(),
			repositories:            repositories.NewRepositories(),
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testNamespace)
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		// Server errors return generic message (detailed error is logged but not exposed to client)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})

	t.Run("should handle multiple LlamaStackDistributions by using the first", func(t *testing.T) {
		mockK8sFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			GetLSDList: &lsdapi.LlamaStackDistributionList{
				Items: []lsdapi.LlamaStackDistribution{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "lsd-1",
							Namespace: testNamespace,
						},
						Status: lsdapi.LlamaStackDistributionStatus{
							ServiceURL: "http://lsd-1.test-namespace.svc.cluster.local:8321",
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "lsd-2",
							Namespace: testNamespace,
						},
						Status: lsdapi.LlamaStackDistributionStatus{
							ServiceURL: "http://lsd-2.test-namespace.svc.cluster.local:8321",
						},
					},
				},
			},
		}
		mockLSFactory := &CapturingMockClientFactory{}

		app := App{
			config:                  config.EnvConfig{},
			kubernetesClientFactory: mockK8sFactory,
			llamaStackClientFactory: mockLSFactory,
			repositories:            repositories.NewRepositories(),
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/lsd/models", nil)
		ctx := context.WithValue(req.Context(), constants.NamespaceQueryParameterKey, testNamespace)
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.AttachLlamaStackClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			assert.NotNil(t, r.Context().Value(constants.LlamaStackClientKey))
			w.WriteHeader(http.StatusOK)
		})(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		// Should use the first LSD's serviceURL
		assert.Equal(t, "http://lsd-1.test-namespace.svc.cluster.local:8321", mockLSFactory.CapturedURL)
	})
}

func TestRequireAccessToService(t *testing.T) {
	t.Run("should return bad request when RequestIdentity is missing", func(t *testing.T) {
		app := App{}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
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
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: ""})
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
			kubernetesClientFactory: mockFactory,
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		// Add valid identity but NO namespace
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
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
		mockFactory := &k8smocks.FailingMockTokenClientFactory{
			GetClientError: assert.AnError,
		}
		app := App{
			kubernetesClientFactory: mockFactory,
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		// add a namespace so we enter block to test for namespace access
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		// Server errors return generic message (detailed error is logged but not exposed to client)
		assert.Contains(t, rr.Body.String(), "the server encountered a problem")
	})

	t.Run("should return 401 when k8s API returns Unauthorized", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListLSDError: k8smocks.NewUnauthorizedError(),
		}
		app := App{
			kubernetesClientFactory: mockFactory,
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "invalid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "authentication failed")
	})

	t.Run("should return 403 when k8s API returns Forbidden", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListLSDError: k8smocks.NewForbiddenError(),
		}
		app := App{
			kubernetesClientFactory: mockFactory,
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testNamespace)
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		app.RequireAccessToService(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			t.Fatal("Handler should not be called")
		})(rr, req, nil)

		assert.Equal(t, http.StatusForbidden, rr.Code)
		assert.Contains(t, rr.Body.String(), "insufficient permissions")
	})

	t.Run("should return 403 when user is not allowed to access namespace", func(t *testing.T) {
		mockFactory := &k8smocks.ConfigurableMockTokenClientFactory{
			CanListLSDAllowed: false, // User not allowed
		}
		app := App{
			kubernetesClientFactory: mockFactory,
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testNamespace)
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
			kubernetesClientFactory: mockFactory,
			logger:                  slog.Default(),
		}

		req := httptest.NewRequest("GET", "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: "valid-token"})
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, testNamespace)
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
