// Package api implements the Core BFF HTTP server, routing, and middleware.
package api

import (
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"
	"path"

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

	"github.com/julienschmidt/httprouter"
)

const (
	// Version is the current BFF version string.
	Version = "1.0.0"
	// PathPrefix is the URL prefix for BFF-scoped paths.
	PathPrefix = "/core-bff"
	// APIPathPrefix is the base API path prefix.
	APIPathPrefix = "/api"
	// APIVersion is the API version path segment.
	APIVersion = "/v1"
	// HealthCheckPath is the health check endpoint path.
	HealthCheckPath = "/healthcheck"
	// APIHealthCheckPath is the full API health check path.
	APIHealthCheckPath = APIPathPrefix + APIVersion + "/healthcheck"
	// UserPath is the user endpoint path.
	UserPath = APIPathPrefix + APIVersion + "/user"
	// NamespacePath is the namespaces endpoint path.
	NamespacePath = APIPathPrefix + APIVersion + "/namespaces"
	// OpenAPIPath is the OpenAPI spec endpoint path.
	OpenAPIPath = PathPrefix + "/openapi"
	// OpenAPIJSONPath is the OpenAPI JSON spec endpoint path.
	OpenAPIJSONPath = PathPrefix + "/openapi.json"
	// OpenAPIYAMLPath is the OpenAPI YAML spec endpoint path.
	OpenAPIYAMLPath = PathPrefix + "/openapi.yaml"
	// SwaggerUIPath is the Swagger UI endpoint path.
	SwaggerUIPath = PathPrefix + "/swagger-ui"
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
	factory   k8s.KubernetesClientFactory
	testEnv   *envtest.Environment
	clientset kubernetes.Interface
}

// NewApp creates a new BFF application instance with all dependencies initialized.
func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	logger.Debug("Initializing app with config", slog.Any("config", cfg))

	rootCAs := initRootCAs(cfg.BundlePaths, logger)

	k8sResult, err := initKubernetesClients(cfg, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	ci := initStartupClusterInfo(cfg, k8sResult, logger)
	bffFactory := initBFFClientFactory(cfg, rootCAs, logger)

	openAPIHandler, err := NewOpenAPIHandler(logger)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize OpenAPI handler: %w", err)
	}

	app := &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sResult.factory,
		repositories:            repositories.NewRepositories(),
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
	} else {
		result.factory, err = k8s.NewKubernetesClientFactory(cfg, logger)
	}

	return result, err
}

func initStartupClusterInfo(cfg config.EnvConfig, k8sResult k8sSetupResult, logger *slog.Logger) clusterInfo {
	ci := clusterInfo{clusterBranding: defaultClusterBranding}

	if cfg.MockK8Client {
		dynClient, dynErr := dynamic.NewForConfig(k8sResult.testEnv.Config)
		if dynErr != nil {
			logger.Warn("Failed to create dynamic client for startup queries", slog.Any("error", dynErr))
			return ci
		}
		return queryClusterInfo(k8sResult.clientset, dynClient, logger)
	}

	kubeconfig, kcErr := helpers.GetKubeconfig()
	if kcErr != nil {
		logger.Warn("Failed to get kubeconfig for startup queries", slog.Any("error", kcErr))
		return ci
	}

	typedClient, tcErr := kubernetes.NewForConfig(kubeconfig)
	dynClient, dcErr := dynamic.NewForConfig(kubeconfig)
	if tcErr != nil || dcErr != nil {
		logger.Warn("Failed to create clients for startup queries",
			slog.Any("typedErr", tcErr), slog.Any("dynamicErr", dcErr))
		return ci
	}
	return queryClusterInfo(typedClient, dynClient, logger)
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

func (app *App) Routes() http.Handler {
	// Router for /api/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// Minimal Kubernetes-backed starter endpoints
	apiRouter.GET(APIHealthCheckPath, app.HealthcheckHandler)
	apiRouter.GET(UserPath, app.UserHandler)
	apiRouter.GET(NamespacePath, app.GetNamespacesHandler)

	// App Router
	appMux := http.NewServeMux()

	// handler for api calls
	appMux.Handle(APIPathPrefix+"/", apiRouter)
	appMux.Handle(PathPrefix+APIPathPrefix+"/", http.StripPrefix(PathPrefix, apiRouter))
	appMux.HandleFunc(APIPathPrefix, func(w http.ResponseWriter, r *http.Request) {
		app.notFoundResponse(w, r)
	})
	appMux.HandleFunc(PathPrefix+APIPathPrefix, func(w http.ResponseWriter, r *http.Request) {
		app.notFoundResponse(w, r)
	})

	// K8s API proxy and WebSocket proxy
	if app.k8sProxy != nil {
		appMux.Handle(proxy.K8sProxyPrefix, app.k8sProxy)
		appMux.Handle(PathPrefix+proxy.K8sProxyPrefix, http.StripPrefix(PathPrefix, app.k8sProxy))
	}
	if app.wsProxy != nil {
		appMux.Handle(proxy.WssProxyPrefix, app.wsProxy)
		appMux.Handle(PathPrefix+proxy.WssProxyPrefix, http.StripPrefix(PathPrefix, app.wsProxy))
	}

	// file server for the frontend file and SPA routes
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helpers.GetContextLoggerFromReq(r)
		// Check if the requested file exists
		if _, err := staticDir.Open(r.URL.Path); err == nil {
			ctxLogger.Debug("Serving static file", slog.String("path", r.URL.Path))
			// Serve the file if it exists
			fileServer.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for SPA routes
		ctxLogger.Debug("Static asset not found, serving index.html", slog.String("path", r.URL.Path))
		http.ServeFile(w, r, path.Join(app.config.StaticAssetsDir, "index.html"))
	})

	// Create a mux for the healthcheck endpoint
	healthcheckMux := http.NewServeMux()
	healthcheckRouter := httprouter.New()
	healthcheckRouter.GET(HealthCheckPath, app.HealthcheckHandler)
	healthcheckMux.Handle(HealthCheckPath, app.RecoverPanic(app.EnableTelemetry(healthcheckRouter)))

	// Combines the healthcheck endpoint with the rest of the routes
	// Apply middleware to appMux which contains the API routes
	combinedMux := http.NewServeMux()
	combinedMux.Handle(HealthCheckPath, healthcheckMux)
	combinedMux.HandleFunc(OpenAPIJSONPath, app.openAPI.HandleOpenAPIJSONWrapper)
	combinedMux.HandleFunc(OpenAPIYAMLPath, app.openAPI.HandleOpenAPIYAMLWrapper)
	if app.config.DevMode {
		combinedMux.HandleFunc(SwaggerUIPath, app.openAPI.HandleSwaggerUIWrapper)
		combinedMux.HandleFunc(OpenAPIPath, app.openAPI.HandleOpenAPIRedirectWrapper)
	}
	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(app.InjectRequestIdentity(appMux)))))

	return combinedMux
}
