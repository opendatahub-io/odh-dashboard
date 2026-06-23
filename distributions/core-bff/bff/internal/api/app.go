// Package api implements the Core BFF HTTP server, routing, and middleware.
package api

import (
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/bffclient/bffmocks"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	k8mocks "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
)

const (
	// Version is the current BFF version string.
	Version = "1.0.0"
)

// App holds the BFF application state and dependencies.
type App struct {
	config                  config.EnvConfig
	logger                  *slog.Logger
	kubernetesClientFactory k8s.KubernetesClientFactory
	repositories            *repositories.Repositories
	//used only on mocked k8s client
	testEnv *envtest.Environment
	// rootCAs used for outbound TLS connections to Client Service
	rootCAs *x509.CertPool
	// bffClientFactory creates clients for inter-BFF communication
	bffClientFactory bffclient.BFFClientFactory
	// openAPI serves the OpenAPI spec and Swagger UI
	openAPI *OpenAPIHandler
	// clusterInfo holds startup-time cluster metadata (best-effort, defaults on vanilla K8s)
	clusterInfo clusterInfo
	// k8sProxy handles /api/k8s/* HTTP passthrough to the K8s API server
	k8sProxy http.Handler
	// wsTracker manages active WebSocket connections and stale cleanup
	wsTracker *proxy.ConnectionTracker
	// wsProxy handles /wss/k8s/* WebSocket relay to the K8s API server
	wsProxy http.Handler
}

type k8sSetupResult struct {
	factory     k8s.KubernetesClientFactory
	testEnv     *envtest.Environment
	clientset   kubernetes.Interface
	saDynClient dynamic.Interface
	saClientset kubernetes.Interface
}

// NewApp creates a new BFF application instance with all dependencies initialized.
func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	logger.Debug("Initializing app with config", slog.Any("config", cfg))

	rootCAs := initRootCAs(cfg.BundlePaths, logger)

	k8sResult, err := initKubernetesClients(cfg, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	ci, resolvedPlatform := initStartupClusterInfo(cfg, k8sResult, logger)
	bffFactory := initBFFClientFactory(cfg, rootCAs, logger)

	openAPIHandler, err := NewOpenAPIHandler(logger)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize OpenAPI handler: %w", err)
	}

	app := &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sResult.factory,
		repositories:            repositories.NewRepositories(resolvedPlatform.IsXKS(), k8sResult.saDynClient, k8sResult.saClientset, cfg.Namespace),
		testEnv:                 k8sResult.testEnv,
		rootCAs:                 rootCAs,
		bffClientFactory:        bffFactory,
		openAPI:                 openAPIHandler,
		clusterInfo:             ci,
	}

	if err := app.initK8sProxy(cfg, k8sResult); err != nil {
		_ = app.Shutdown()
		return nil, fmt.Errorf("failed to initialize K8s proxy: %w", err)
	}

	return app, nil
}

func initKubernetesClients(cfg config.EnvConfig, logger *slog.Logger) (k8sSetupResult, error) {
	var result k8sSetupResult
	var err error

	if cfg.MockK8Client {
		result.testEnv, result.clientset, err = k8mocks.SetupEnvTest(k8mocks.TestEnvInput{})
		if err != nil {
			return result, fmt.Errorf("failed to setup envtest: %w", err)
		}
		result.factory, err = k8mocks.NewMockedKubernetesClientFactory(result.clientset, result.testEnv, cfg, logger)
		if err != nil {
			return result, err
		}
		result.saDynClient, err = dynamic.NewForConfig(result.testEnv.Config)
		if err != nil {
			return result, fmt.Errorf("failed to create SA dynamic client: %w", err)
		}
		result.saClientset, err = kubernetes.NewForConfig(result.testEnv.Config)
	} else {
		result.factory, err = k8s.NewKubernetesClientFactory(cfg, logger)
		if err != nil {
			return result, err
		}
		kubeconfig, kcErr := helpers.GetKubeconfig()
		if kcErr != nil {
			return result, fmt.Errorf("failed to get kubeconfig for SA client: %w", kcErr)
		}
		result.saDynClient, err = dynamic.NewForConfig(kubeconfig)
		if err != nil {
			return result, fmt.Errorf("failed to create SA dynamic client: %w", err)
		}
		result.saClientset, err = kubernetes.NewForConfig(kubeconfig)
	}

	return result, err
}

func initStartupClusterInfo(cfg config.EnvConfig, k8sResult k8sSetupResult, logger *slog.Logger) (clusterInfo, config.PlatformType) {
	ci := clusterInfo{clusterBranding: defaultClusterBranding}
	explicitPlatform := cfg.PlatformType != ""

	if explicitPlatform {
		logger.Info("Using configured platform type", slog.String("platform", cfg.PlatformType.String()))
	}

	if cfg.PlatformType.IsXKS() {
		if cfg.MockK8Client {
			ci.serverURL = k8sResult.testEnv.Config.Host
		} else if kubeconfig, err := helpers.GetKubeconfig(); err == nil {
			ci.serverURL = kubeconfig.Host
		}
		ci.currentContext = helpers.GetCurrentContext()
		return ci, cfg.PlatformType
	}

	if cfg.MockK8Client {
		dynClient, dynErr := dynamic.NewForConfig(k8sResult.testEnv.Config)
		if dynErr != nil {
			logger.Warn("Failed to create dynamic client for startup queries", slog.Any("error", dynErr))
			return ci, cfg.PlatformType
		}
		ci, probeErr := queryClusterInfo(k8sResult.clientset, dynClient, logger)
		ci.serverURL = k8sResult.testEnv.Config.Host
		ci.currentContext = helpers.GetCurrentContext()
		return ci, resolveStartupPlatform(ci, probeErr, explicitPlatform, cfg.PlatformType, logger)
	}

	kubeconfig, kcErr := helpers.GetKubeconfig()
	if kcErr != nil {
		logger.Warn("Failed to get kubeconfig for startup queries", slog.Any("error", kcErr))
		return ci, cfg.PlatformType
	}

	typedClient, tcErr := kubernetes.NewForConfig(kubeconfig)
	dynClient, dcErr := dynamic.NewForConfig(kubeconfig)
	if tcErr != nil || dcErr != nil {
		logger.Warn("Failed to create clients for startup queries",
			slog.Any("typedErr", tcErr), slog.Any("dynamicErr", dcErr))
		return ci, cfg.PlatformType
	}
	ci, probeErr := queryClusterInfo(typedClient, dynClient, logger)
	ci.serverURL = kubeconfig.Host
	ci.currentContext = helpers.GetCurrentContext()
	return ci, resolveStartupPlatform(ci, probeErr, explicitPlatform, cfg.PlatformType, logger)
}

func resolveStartupPlatform(ci clusterInfo, probeErr error, explicit bool, configured config.PlatformType, logger *slog.Logger) config.PlatformType {
	if explicit {
		return configured
	}
	if probeErr != nil {
		logger.Warn("ClusterVersion probe returned ambiguous error, defaulting to OpenShift",
			slog.Any("error", probeErr))
		return config.PlatformOpenShift
	}
	return detectPlatform(ci, logger)
}

func detectPlatform(ci clusterInfo, logger *slog.Logger) config.PlatformType {
	if ci.clusterID != "" {
		logger.Info("Detected OpenShift platform")
		return config.PlatformOpenShift
	}
	logger.Info("Detected XKS platform (no ClusterVersion found)")
	return config.PlatformXKS
}

func initBFFClientFactory(cfg config.EnvConfig, rootCAs *x509.CertPool, logger *slog.Logger) bffclient.BFFClientFactory {
	bffConfig := bffclient.NewDefaultBFFClientConfig()
	bffConfig.MockBFFClients = cfg.MockBFFClients
	bffConfig.InsecureSkipVerify = cfg.InsecureSkipVerify

	if cfg.MockBFFClients {
		logger.Info("Using mock BFF client factory")
		return bffmocks.NewMockClientFactory(logger)
	}

	logger.Info("Using real BFF client factory")
	return bffclient.NewRealClientFactory(bffConfig, rootCAs, cfg.InsecureSkipVerify, logger)
}

func (app *App) Shutdown() error {
	app.logger.Info("shutting down app...")
	if app.wsTracker != nil {
		app.wsTracker.Stop()
	}
	if app.testEnv == nil {
		return nil
	}
	app.logger.Info("shutting env test...")
	return app.testEnv.Stop()
}
