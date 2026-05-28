package api

import (
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/bffclient/bffmocks"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	k8mocks "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	helper "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"

	"github.com/julienschmidt/httprouter"
)

const (
	Version            = "1.0.0"
	PathPrefix         = "/core-bff"
	ApiPathPrefix      = "/api"
	ApiVersion         = "/v1"
	HealthCheckPath    = "/healthcheck"
	ApiHealthCheckPath = ApiPathPrefix + ApiVersion + "/healthcheck"
	UserPath           = ApiPathPrefix + ApiVersion + "/user"
	NamespacePath      = ApiPathPrefix + ApiVersion + "/namespaces"
	OpenAPIPath        = PathPrefix + "/openapi"
	OpenAPIJSONPath    = PathPrefix + "/openapi.json"
	OpenAPIYAMLPath    = PathPrefix + "/openapi.yaml"
	SwaggerUIPath      = PathPrefix + "/swagger-ui"
)

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
}

type k8sSetupResult struct {
	factory   k8s.KubernetesClientFactory
	testEnv   *envtest.Environment
	clientset kubernetes.Interface
}

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

	return &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sResult.factory,
		repositories:            repositories.NewRepositories(),
		testEnv:                 k8sResult.testEnv,
		rootCAs:                 rootCAs,
		bffClientFactory:        bffFactory,
		openAPI:                 openAPIHandler,
		clusterInfo:             ci,
	}, nil
}

func initRootCAs(bundlePaths []string, logger *slog.Logger) *x509.CertPool {
	if len(bundlePaths) == 0 {
		return nil
	}

	var rootCAs *x509.CertPool
	if pool, err := x509.SystemCertPool(); err == nil {
		rootCAs = pool
	} else {
		rootCAs = x509.NewCertPool()
	}

	var loadedAny bool
	for _, p := range bundlePaths {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		pemBytes, readErr := os.ReadFile(p)
		if readErr != nil {
			logger.Debug("CA bundle not readable, skipping", slog.String("path", p), slog.Any("error", readErr))
			continue
		}
		if ok := rootCAs.AppendCertsFromPEM(pemBytes); !ok {
			logger.Debug("No certs appended from PEM bundle", slog.String("path", p))
			continue
		}
		loadedAny = true
		logger.Info("Added CA bundle", slog.String("path", p))
	}

	if !loadedAny {
		logger.Warn("No CA certificates loaded from bundle-paths; falling back to system defaults")
		return nil
	}
	return rootCAs
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

	kubeconfig, kcErr := helper.GetKubeconfig()
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
	if app.testEnv == nil {
		return nil
	}
	//shutdown the envtest control plane when we are in the mock mode.
	app.logger.Info("shutting env test...")
	return app.testEnv.Stop()
}

func (app *App) Routes() http.Handler {
	// Router for /api/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// Minimal Kubernetes-backed starter endpoints
	apiRouter.GET(ApiHealthCheckPath, app.HealthcheckHandler)
	apiRouter.GET(UserPath, app.UserHandler)
	apiRouter.GET(NamespacePath, app.GetNamespacesHandler)

	// App Router
	appMux := http.NewServeMux()

	// handler for api calls
	appMux.Handle(ApiPathPrefix+"/", apiRouter)
	appMux.Handle(PathPrefix+ApiPathPrefix+"/", http.StripPrefix(PathPrefix, apiRouter))
	appMux.HandleFunc(ApiPathPrefix, func(w http.ResponseWriter, r *http.Request) {
		app.notFoundResponse(w, r)
	})

	// file server for the frontend file and SPA routes
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helper.GetContextLoggerFromReq(r)
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
