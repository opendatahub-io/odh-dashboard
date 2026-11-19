// Package api implements the Core BFF HTTP server, routing, and middleware.
package api

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/bffclient/bffmocks"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	k8mocks "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
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
	// platformConfirmed is false when the platform was guessed after an
	// inconclusive ClusterVersion probe rather than configured or detected.
	platformConfirmed bool
	// k8sProxy handles /api/k8s/* HTTP passthrough to the K8s API server
	k8sProxy http.Handler
	// wsTracker manages active WebSocket connections and stale cleanup
	wsTracker *proxy.ConnectionTracker
	// wsProxy handles /wss/k8s/* WebSocket relay to the K8s API server
	wsProxy http.Handler
	// modelServingProxy handles /api/service/model-serving/* passthrough
	modelServingProxy http.Handler
	// moduleProxies holds proxy handlers for federated module API paths
	moduleProxies []moduleProxyHandler
	// devFallbackToken is the kubeconfig bearer token used in dev mode for
	// proxied requests (Prometheus, model-serving) when the identity has no real token.
	devFallbackToken string
	// probeSemaphore limits concurrent connection test probes
	probeSemaphore chan struct{}
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
	// cfg implements slog.LogValuer, so this never emits credential values.
	logger.Debug("Initializing app with config", slog.Any("config", cfg))

	rootCAs := initRootCAs(cfg.BundlePaths, logger)
	// config.Validate already checked the explicit bundles, but this is a second
	// read. If they vanished in between, falling back to the system pool would
	// silently drop the operator's trust anchors.
	if cfg.BundlePathsRequired && rootCAs == nil {
		return nil, fmt.Errorf("BUNDLE_PATHS was set explicitly but no CA certificate could be loaded from it; refusing to fall back to the system trust store")
	}

	k8sResult, err := initKubernetesClients(cfg, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	ci, resolvedPlatform, platformConfirmed := initStartupClusterInfo(cfg, k8sResult, logger)
	cfg.PlatformType = resolvedPlatform
	logger.Info("resolved bootstrap admission contract",
		slog.String("platform", resolvedPlatform.String()),
		slog.Bool("platformConfirmed", platformConfirmed),
		slog.String("admissionMode", config.ResolveAdmissionMode(cfg.AdmissionMode, resolvedPlatform, platformConfirmed).String()))
	bffFactory := initBFFClientFactory(cfg, rootCAs, logger)

	openAPIHandler, err := NewOpenAPIHandler(logger)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize OpenAPI handler: %w", err)
	}

	app := &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sResult.factory,
		repositories: repositories.NewRepositories(repositories.RepositoriesConfig{
			Platform:          resolvedPlatform,
			PlatformConfirmed: platformConfirmed,
			AdmissionMode:     cfg.AdmissionMode,
			SADynClient:       k8sResult.saDynClient,
			SAClientset:       k8sResult.saClientset,
			CredentialPolicy:  repositories.CredentialPolicyFor(resolvedPlatform),
			CallerClients:     callerClientsFrom(k8sResult.factory),
			Namespace:         cfg.Namespace,
			OperatorNamespace: cfg.OperatorNamespace,
			Prometheus: repositories.PrometheusConfig{
				Host:               cfg.PrometheusHost,
				Namespace:          cfg.PrometheusNamespace,
				Instance:           cfg.PrometheusInstance,
				Port:               cfg.PrometheusPort,
				RootCAs:            rootCAs,
				InsecureSkipVerify: cfg.InsecureSkipVerify && (cfg.DevMode || cfg.MockK8Client),
			},
		}),
		testEnv:           k8sResult.testEnv,
		rootCAs:           rootCAs,
		bffClientFactory:  bffFactory,
		openAPI:           openAPIHandler,
		clusterInfo:       ci,
		platformConfirmed: platformConfirmed,
		probeSemaphore:    NewProbeSemaphore(),
	}

	if err := app.initK8sProxy(cfg, k8sResult); err != nil {
		_ = app.Shutdown()
		return nil, fmt.Errorf("failed to initialize K8s proxy: %w", err)
	}

	if err := app.initModelServingProxy(); err != nil {
		_ = app.Shutdown()
		return nil, fmt.Errorf("failed to initialize model-serving proxy: %w", err)
	}

	if err := app.initModuleProxies(); err != nil {
		_ = app.Shutdown()
		return nil, fmt.Errorf("failed to initialize module proxies: %w", err)
	}

	return app, nil
}

// callerClientsFrom builds the caller-scoped client resolver repositories use
// under the caller credential policy. It goes through the same factory as every
// handler, so the clients carry exactly the credential InjectRequestIdentity
// resolved for the request. A request without an identity is an error; there is
// no service-account fallback.
func callerClientsFrom(factory k8s.KubernetesClientFactory) repositories.CallerClientsFunc {
	return func(ctx context.Context) (kubernetes.Interface, dynamic.Interface, error) {
		if factory == nil {
			return nil, nil, fmt.Errorf("no Kubernetes client factory")
		}
		// A request without a caller identity is an authentication failure
		// (401 under the error contract), not an internal error.
		if identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity); !ok || identity == nil {
			return nil, nil, fmt.Errorf("no caller identity on the request: %w", httpcontract.ErrIdentityUnresolved)
		}
		client, err := factory.GetClient(ctx)
		if err != nil {
			return nil, nil, err
		}
		typed, err := client.GetClientset()
		if err != nil {
			return nil, nil, err
		}
		dyn, err := client.GetDynamicClient()
		if err != nil {
			return nil, nil, err
		}
		return typed, dyn, nil
	}
}

func initKubernetesClients(cfg config.EnvConfig, logger *slog.Logger) (k8sSetupResult, error) {
	var result k8sSetupResult
	var err error

	if cfg.MockK8Client {
		result.testEnv, result.clientset, result.saDynClient, err = k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
			CRDs: k8mocks.DefaultCRDs(),
		})
		if err != nil {
			return result, fmt.Errorf("failed to setup envtest: %w", err)
		}
		result.factory, err = k8mocks.NewMockedKubernetesClientFactory(result.clientset, result.testEnv, cfg, logger)
		if err != nil {
			return result, err
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
		kubeconfig = rest.CopyConfig(kubeconfig)
		kubeconfig.Wrap(httpcontract.WrapTransport)
		result.saDynClient, err = dynamic.NewForConfig(kubeconfig)
		if err != nil {
			return result, fmt.Errorf("failed to create SA dynamic client: %w", err)
		}
		result.saClientset, err = kubernetes.NewForConfig(kubeconfig)
	}

	return result, err
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

// PlatformType returns the platform resolved at startup (configured value if
// explicit, otherwise the detected one). Callers outside the package need it to
// make platform-dependent decisions after NewApp, such as whether serving TLS
// may read the OpenShift cluster TLS profile.
func (app *App) PlatformType() config.PlatformType {
	return app.config.PlatformType
}

// ServeTLSWithoutClusterProfile reports whether HTTPS may be served with the
// static Intermediate defaults instead of tracking the OpenShift cluster TLS
// profile. That is only safe on a confirmed xKS platform (configured, or
// positively detected). When the platform was guessed after an inconclusive
// probe the cluster may still be OpenShift, so the profile-aware listener is
// kept: on OpenShift it enforces the administrator's Modern or Custom policy,
// and where the profile API is absent it falls back to the same defaults.
func (app *App) ServeTLSWithoutClusterProfile() bool {
	return app.config.PlatformType.IsXKS() && app.platformConfirmed
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
