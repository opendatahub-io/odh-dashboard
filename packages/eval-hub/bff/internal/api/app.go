package api

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path"
	"regexp"
	"strings"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	ehmocks "github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub/ehmocks"
	k8s "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	k8mocks "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes/k8mocks"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	helper "github.com/opendatahub-io/eval-hub/bff/internal/helpers"

	"github.com/opendatahub-io/eval-hub/bff/internal/config"
	"github.com/opendatahub-io/eval-hub/bff/internal/repositories"

	"github.com/julienschmidt/httprouter"
)

const (
	Version                  = "1.0.0"
	PathPrefix               = "/eval-hub"
	ApiPathPrefix            = "/api/v1"
	HealthCheckPath          = "/healthcheck"
	HealthPath               = ApiPathPrefix + "/health"
	UserPath                 = ApiPathPrefix + "/user"
	NamespacePath            = ApiPathPrefix + "/namespaces"
	EvaluationJobsPath       = ApiPathPrefix + "/evaluations/jobs"
	EvaluationJobByIDPath    = ApiPathPrefix + "/evaluations/jobs/:id"
	CollectionsPath          = ApiPathPrefix + "/evaluations/collections"
	ProvidersPath            = ApiPathPrefix + "/evaluations/providers"
	EvalHubCRStatusPath      = ApiPathPrefix + "/evalhub/status"
	EvalHubServiceHealthPath = ApiPathPrefix + "/evalhub/health"
	InferenceServicesPath    = ApiPathPrefix + "/inferenceservices"
	VerifyConnectionPath     = ApiPathPrefix + "/evaluations/verify-connection"
)

var hashPattern = regexp.MustCompile(`[.\-][0-9a-f]{8,}`)
var staticAssetPattern = regexp.MustCompile(`(?i)\.(woff2?|ttf|eot|png|jpe?g|gif|svg|ico|webp|avif|bmp)$`)

func isHashedAsset(filePath string) bool {
	match := hashPattern.FindString(path.Base(filePath))
	return match != "" && strings.ContainsAny(match, "abcdef")
}

func isStaticAsset(filePath string) bool {
	return staticAssetPattern.MatchString(filePath)
}

func cacheControlForStaticFile(filePath string) string {
	if isHashedAsset(filePath) {
		return "public, max-age=31536000, immutable"
	}
	if isStaticAsset(filePath) {
		return "public, max-age=86400"
	}
	return "no-cache"
}

type App struct {
	config                  config.EnvConfig
	logger                  *slog.Logger
	kubernetesClientFactory k8s.KubernetesClientFactory
	evalHubClientFactory    evalhub.EvalHubClientFactory
	repositories            *repositories.Repositories
	testEnv                 *envtest.Environment
	rootCAs                 *x509.CertPool
	openAPI                 *OpenAPIHandler
	dashboardNamespace      string
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	logger.Debug("Initializing app with config", slog.Any("config", cfg))
	var k8sFactory k8s.KubernetesClientFactory
	var err error
	// used only on mocked k8s client
	var testEnv *envtest.Environment
	var rootCAs *x509.CertPool

	// Initialize CA pool if bundle paths are provided
	if len(cfg.BundlePaths) > 0 {
		// Start with system certs if available
		if pool, err := x509.SystemCertPool(); err == nil {
			rootCAs = pool
		} else {
			rootCAs = x509.NewCertPool()
		}
		var loadedAny bool
		for _, p := range cfg.BundlePaths {
			p = strings.TrimSpace(p)
			if p == "" {
				continue
			}
			// Read and append each PEM bundle; ignore errors per file, log at debug
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
			// If none were loaded successfully, keep rootCAs nil to fall back to default transport behavior
			rootCAs = nil
			logger.Warn("No CA certificates loaded from bundle-paths; falling back to system defaults")
		}
	}

	if cfg.MockK8Client {
		//mock all k8s calls with 'env test'
		var clientset kubernetes.Interface
		ctx, cancel := context.WithCancel(context.Background())
		testEnv, clientset, err = k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
			Logger: logger,
			Ctx:    ctx,
			Cancel: cancel,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to setup envtest: %w", err)
		}
		//create mocked kubernetes client factory
		k8sFactory, err = k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)

	} else {
		//create kubernetes client factory
		k8sFactory, err = k8s.NewKubernetesClientFactory(cfg, logger)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	dashboardNamespace, err := helper.GetCurrentNamespace()
	if err != nil {
		logger.Warn("Failed to detect dashboard namespace, using default",
			slog.Any("error", err), slog.String("default", "opendatahub"))
		dashboardNamespace = "opendatahub"
	}
	logger.Info("Detected dashboard namespace", slog.String("namespace", dashboardNamespace))

	var ehFactory evalhub.EvalHubClientFactory
	if cfg.MockEvalHubClient {
		ehFactory = ehmocks.NewMockClientFactory()
		logger.Info("Using mock EvalHub client")
	} else {
		ehFactory = evalhub.NewRealClientFactory()
	}

	var openAPIHandler *OpenAPIHandler
	openAPIHandler, err = NewOpenAPIHandler(logger)
	if err != nil {
		logger.Warn("Failed to load OpenAPI spec, Swagger UI will be unavailable", slog.Any("error", err))
	}

	app := &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sFactory,
		evalHubClientFactory:    ehFactory,
		repositories:            repositories.NewRepositories(),
		testEnv:                 testEnv,
		rootCAs:                 rootCAs,
		openAPI:                 openAPIHandler,
		dashboardNamespace:      dashboardNamespace,
	}
	return app, nil
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
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// Minimal Kubernetes-backed starter endpoints
	apiRouter.GET(UserPath, app.UserHandler)
	apiRouter.GET(NamespacePath, app.GetNamespacesHandler)

	// EvalHub endpoints
	// Middleware chain: AttachNamespace → RequireAccessToService → AttachEvalHubClient → handler
	// AttachNamespace reads ?namespace= from the query and injects it into context.
	// RequireAccessToService performs a SubjectAccessReview to verify the user can list EvalHub CRs.
	// AttachEvalHubClient resolves the EvalHub service URL (env override or CR auto-discovery).
	apiRouter.GET(EvaluationJobsPath, app.AttachNamespace(app.RequireAccessToService(app.AttachEvalHubClient(app.EvaluationJobsHandler))))
	apiRouter.POST(EvaluationJobsPath, app.AttachNamespace(app.RequireAccessToService(app.AttachEvalHubClient(app.CreateEvaluationJobHandler))))
	apiRouter.GET(EvaluationJobByIDPath, app.AttachNamespace(app.RequireAccessToService(app.AttachEvalHubClient(app.GetEvaluationJobHandler))))
	apiRouter.DELETE(EvaluationJobByIDPath, app.AttachNamespace(app.RequireAccessToService(app.AttachEvalHubClient(app.CancelEvaluationJobHandler))))
	apiRouter.GET(CollectionsPath, app.AttachNamespace(app.RequireAccessToService(app.AttachEvalHubClient(app.CollectionsHandler))))
	apiRouter.GET(ProvidersPath, app.AttachNamespace(app.RequireAccessToService(app.AttachEvalHubClient(app.ProvidersHandler))))

	// InferenceService listing (user-token dynamic client, no EvalHub REST client needed)
	apiRouter.GET(InferenceServicesPath, app.AttachNamespace(app.RequireAccessToService(app.InferenceServicesHandler)))

	// Connection verification (probes external endpoints, no EvalHub REST client needed)
	apiRouter.POST(VerifyConnectionPath, app.AttachNamespace(app.RequireAccessToService(app.VerifyConnectionHandler)))

	// EvalHub CR status endpoint (reads CR directly, does not need the EvalHub REST client)
	apiRouter.GET(EvalHubCRStatusPath, app.AttachNamespace(app.EvalHubCRStatusHandler))

	// EvalHub service health endpoint: accepts an optional ?namespace= to enable ConfigMap/CR
	// discovery in the user's namespace. Falls back to dashboardNamespace when omitted.
	// Returns a three-state response: "healthy", "service-unreachable", or "cr-not-found".
	apiRouter.GET(EvalHubServiceHealthPath, app.EvalHubServiceHealthHandler)

	// App Router
	appMux := http.NewServeMux()

	// handler for api calls
	appMux.Handle(ApiPathPrefix+"/", apiRouter)
	appMux.Handle(PathPrefix+ApiPathPrefix+"/", http.StripPrefix(PathPrefix, apiRouter))

	// file server for the frontend file and SPA routes
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helper.GetContextLoggerFromReq(r)
		// Check if the requested file exists
		if f, err := staticDir.Open(r.URL.Path); err == nil {
			f.Close()
			ctxLogger.Debug("Serving static file", slog.String("path", r.URL.Path))
			// Serve the file if it exists
			w.Header().Set("Cache-Control", cacheControlForStaticFile(r.URL.Path))
			fileServer.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for SPA routes
		ctxLogger.Debug("Static asset not found, serving index.html", slog.String("path", r.URL.Path))
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, path.Join(app.config.StaticAssetsDir, "index.html"))
	})

	// Unprotected health endpoints (no auth required)
	healthRouter := httprouter.New()
	healthRouter.GET(HealthCheckPath, app.HealthcheckHandler)
	healthRouter.GET(HealthPath, app.HealthHandler)
	healthHandler := app.RecoverPanic(app.EnableTelemetry(healthRouter))

	combinedMux := http.NewServeMux()
	combinedMux.Handle(HealthCheckPath, healthHandler)
	combinedMux.Handle(HealthPath, healthHandler)
	combinedMux.Handle(PathPrefix+HealthPath, http.StripPrefix(PathPrefix, healthHandler))

	// OpenAPI / Swagger UI routes (unprotected)
	if app.openAPI != nil {
		combinedMux.HandleFunc(OpenAPIPath, app.openAPI.HandleOpenAPIRedirectWrapper)
		combinedMux.HandleFunc(OpenAPIJSONPath, app.openAPI.HandleOpenAPIJSONWrapper)
		combinedMux.HandleFunc(OpenAPIYAMLPath, app.openAPI.HandleOpenAPIYAMLWrapper)
		combinedMux.HandleFunc(SwaggerUIPath, app.openAPI.HandleSwaggerUIWrapper)
	}

	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(app.InjectRequestIdentity(appMux)))))

	return combinedMux
}
