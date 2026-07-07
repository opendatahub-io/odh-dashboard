package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	k8mocks "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes/k8mocks"
	k8smocks "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newManagedPipelinesTestApp(t *testing.T) *App {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	logger := slog.Default()
	cfg := config.EnvConfig{
		MockK8Client: true,
		AuthMethod:   config.AuthMethodDisabled,
	}

	testEnv, clientset, err := k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
		Logger: logger,
		Ctx:    ctx,
		Cancel: cancel,
	})
	require.NoError(t, err)
	t.Cleanup(func() {
		if testEnv != nil {
			_ = testEnv.Stop()
		}
	})

	k8sFactory, err := k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)
	require.NoError(t, err)

	return &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sFactory,
		repositories:            repositories.NewRepositories(logger),
	}
}

func newManagedPipelinesRequest(namespace string) *http.Request {
	req, _ := http.NewRequest(http.MethodPost,
		"/api/v1/managed-pipelines/enable?namespace="+namespace, nil)
	ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, namespace)
	ctx = context.WithValue(ctx, constants.RequestIdentityKey, &kubernetes.RequestIdentity{
		UserID: "test-user",
		Groups: []string{"system:authenticated"},
	})
	return req.WithContext(ctx)
}

func TestEnableManagedPipelinesHandler_Success(t *testing.T) {
	app := newManagedPipelinesTestApp(t)

	t.Run("should return 200 for namespace with a DSPA", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := newManagedPipelinesRequest("test-namespace")

		app.EnableManagedPipelinesHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]string
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "managed pipelines enabled", response["message"])
		assert.Equal(t, "dspa", response["dspa"])
	})
}

func TestEnableManagedPipelinesHandler_NoDSPA(t *testing.T) {
	app := newManagedPipelinesTestApp(t)

	t.Run("should return 404 for namespace without a DSPA", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := newManagedPipelinesRequest("no-dspas-namespace")

		app.EnableManagedPipelinesHandler(rr, req, nil)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})
}

func TestEnableManagedPipelinesHandler_MissingNamespace(t *testing.T) {
	app := newManagedPipelinesTestApp(t)

	t.Run("should return 400 when namespace is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/managed-pipelines/enable", nil)

		app.EnableManagedPipelinesHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}

func TestEnableManagedPipelinesHandler_K8sClientError(t *testing.T) {
	t.Run("should return 500 when k8s client factory fails", func(t *testing.T) {
		app := &App{
			config: config.EnvConfig{
				MockK8Client: true,
				AuthMethod:   config.AuthMethodInternal,
			},
			logger:                  slog.Default(),
			kubernetesClientFactory: &failingK8sClientFactory{},
			repositories:            repositories.NewRepositories(slog.Default()),
		}

		rr := httptest.NewRecorder()
		req := newManagedPipelinesRequest("test-namespace")

		app.EnableManagedPipelinesHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

func TestEnableManagedPipelinesHandler_AuthForbidden(t *testing.T) {
	t.Run("should return 403 when permission check returns not allowed", func(t *testing.T) {
		app := &App{
			config: config.EnvConfig{
				MockK8Client: true,
				AuthMethod:   config.AuthMethodInternal,
			},
			logger: slog.Default(),
			kubernetesClientFactory: &k8smocks.ConfigurableMockTokenClientFactory{
				CanListDSPAAllowed: false,
			},
			repositories: repositories.NewRepositories(slog.Default()),
		}

		rr := httptest.NewRecorder()
		req := newManagedPipelinesRequest("test-namespace")

		app.EnableManagedPipelinesHandler(rr, req, nil)

		assert.Equal(t, http.StatusForbidden, rr.Code)
	})
}

func TestEnableManagedPipelinesHandler_AuthError(t *testing.T) {
	t.Run("should return 500 when permission check returns an error", func(t *testing.T) {
		app := &App{
			config: config.EnvConfig{
				MockK8Client: true,
				AuthMethod:   config.AuthMethodInternal,
			},
			logger: slog.Default(),
			kubernetesClientFactory: &k8smocks.ConfigurableMockTokenClientFactory{
				CanListDSPAError: assert.AnError,
			},
			repositories: repositories.NewRepositories(slog.Default()),
		}

		rr := httptest.NewRecorder()
		req := newManagedPipelinesRequest("test-namespace")

		app.EnableManagedPipelinesHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

type failingK8sClientFactory struct{}

func (f *failingK8sClientFactory) GetClient(_ context.Context) (kubernetes.KubernetesClientInterface, error) {
	return nil, assert.AnError
}

func (f *failingK8sClientFactory) ExtractRequestIdentity(_ http.Header) (*kubernetes.RequestIdentity, error) {
	return nil, assert.AnError
}

func (f *failingK8sClientFactory) ValidateRequestIdentity(_ *kubernetes.RequestIdentity) error {
	return assert.AnError
}
