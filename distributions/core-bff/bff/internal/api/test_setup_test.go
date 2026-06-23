package api

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/bffclient/bffmocks"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

var (
	testK8sFactory  k8s.KubernetesClientFactory
	testEnvInstance *envtest.Environment
	testSADynClient dynamic.Interface
	testSAClientset kubernetes.Interface
)

func TestMain(m *testing.M) {
	logger := testLogger()

	env, clientset, err := k8mocks.SetupEnvTest(k8mocks.TestEnvInput{})
	if err != nil {
		logger.Error("failed to setup envtest", slog.Any("error", err))
		os.Exit(1)
	}

	cfg := config.EnvConfig{
		AuthMethod:      config.AuthMethodDisabled,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		AuthTokenPrefix: config.DefaultAuthTokenPrefix,
	}

	factory, err := k8mocks.NewMockedKubernetesClientFactory(clientset, env, cfg, logger)
	if err != nil {
		logger.Error("failed to create mocked k8s factory", slog.Any("error", err))
		_ = env.Stop()
		os.Exit(1)
	}

	testK8sFactory = factory
	testEnvInstance = env

	saDyn, err := dynamic.NewForConfig(env.Config)
	if err != nil {
		logger.Error("failed to create SA dynamic client", slog.Any("error", err))
		_ = env.Stop()
		os.Exit(1)
	}
	testSADynClient = saDyn

	saCS, err := kubernetes.NewForConfig(env.Config)
	if err != nil {
		logger.Error("failed to create SA clientset", slog.Any("error", err))
		_ = env.Stop()
		os.Exit(1)
	}
	testSAClientset = saCS

	code := m.Run()

	_ = env.Stop()
	os.Exit(code)
}

func newTestApp(overrides ...func(*App)) *App {
	logger := testLogger()

	openAPIHandler, _ := NewOpenAPIHandler(logger)

	app := &App{
		config: config.EnvConfig{
			AuthMethod:      config.AuthMethodDisabled,
			AuthTokenHeader: config.DefaultAuthTokenHeader,
			AuthTokenPrefix: config.DefaultAuthTokenPrefix,
			StaticAssetsDir: os.TempDir(),
		},
		logger:                  logger,
		kubernetesClientFactory: testK8sFactory,
		repositories:            repositories.NewRepositories(false, testSADynClient, testSAClientset, ""),
		bffClientFactory:        bffmocks.NewMockClientFactory(logger),
		openAPI:                 openAPIHandler,
		clusterInfo:             clusterInfo{clusterBranding: defaultClusterBranding},
	}

	for _, o := range overrides {
		o(app)
	}

	return app
}

func reqWithIdentity(r *http.Request, identity *k8s.RequestIdentity) *http.Request {
	ctx := context.WithValue(r.Context(), constants.RequestIdentityKey, identity)
	return r.WithContext(ctx)
}
