package api

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
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

func (f *CapturingMockClientFactory) CreateClient(baseURL string) llamastack.LlamaStackClientInterface {
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
