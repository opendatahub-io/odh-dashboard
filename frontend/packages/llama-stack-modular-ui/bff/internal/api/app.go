package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"path"
	"strings"

	k8s "github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/kubernetes"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	helper "github.com/opendatahub-io/llama-stack-modular-ui/internal/helpers"
)

// isAPIRoute checks if the given path is an API route
func (app *App) isAPIRoute(path string) bool {
	return path == constants.HealthCheckPath ||
		path == constants.OpenAPIPath ||
		path == constants.OpenAPIJSONPath ||
		path == constants.OpenAPIYAMLPath ||
		path == constants.SwaggerUIPath ||
		// Match exactly the configured API path prefix or any sub-path under it
		path == app.config.APIPathPrefix ||
		strings.HasPrefix(path, app.config.APIPathPrefix+"/") ||
		// Similarly for the llama-stack prefix
		path == "/llama-stack" ||
		strings.HasPrefix(path, "/llama-stack/")
}

type App struct {
	config                  config.EnvConfig
	logger                  *slog.Logger
	repositories            *repositories.Repositories
	openAPI                 *OpenAPIHandler
	kubernetesClientFactory k8s.KubernetesClientFactory
	llamaStackClient        llamastack.LlamaStackClientInterface
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	var llamaStackClient llamastack.LlamaStackClientInterface

	logger.Info("Initializing app with config", slog.Any("config", cfg))

	// Initialize LlamaStack client using factory pattern
	var factory llamastack.LlamaStackClientFactory
	if cfg.MockLSClient {
		logger.Info("Using mock LlamaStack client")
		factory = lsmocks.NewMockClientFactory()
	} else {
		logger.Info("Using real LlamaStack client", "url", cfg.LlamaStackURL)
		factory = llamastack.NewRealClientFactory()
	}
	llamaStackClient = factory.CreateClient(cfg.LlamaStackURL)

	// Initialize OpenAPI handler
	openAPIHandler, err := NewOpenAPIHandler(logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create OpenAPI handler: %w", err)
	}

	var k8sFactory k8s.KubernetesClientFactory
	// used only on mocked k8s client
	var testEnv *envtest.Environment

	if cfg.MockK8sClient {
		logger.Info("Using mocked Kubernetes client")
		var clientset kubernetes.Interface
		ctx, cancel := context.WithCancel(context.Background())
		testEnv, clientset, err = k8smocks.SetupEnvTest(k8smocks.TestEnvInput{
			Users:  k8smocks.DefaultTestUsers,
			Logger: logger,
			Ctx:    ctx,
			Cancel: cancel,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to setup envtest: %w", err)
		}
		k8sFactory, err = k8smocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)
	} else {
		k8sFactory, err = k8s.NewKubernetesClientFactory(cfg, logger)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create Kubernetes client factory: %w", err)
	}

	app := &App{
		config:                  cfg,
		logger:                  logger,
		repositories:            repositories.NewRepositories(llamaStackClient),
		openAPI:                 openAPIHandler,
		kubernetesClientFactory: k8sFactory,
		llamaStackClient:        llamaStackClient,
	}
	return app, nil
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	genaiPrefix := "/genai/v1"

	// Models
	apiRouter.GET(genaiPrefix+"/models", app.RequireAccessToService(app.AttachRESTClient(app.LlamaStackModelsHandler)))

	// Responses (OpenAI Responses API)
	apiRouter.POST(genaiPrefix+"/responses", app.RequireAccessToService(app.AttachRESTClient(app.LlamaStackCreateResponseHandler)))

	// Vector Stores
	apiRouter.GET(genaiPrefix+"/vectorstores", app.RequireAccessToService(app.AttachRESTClient(app.LlamaStackListVectorStoresHandler)))
	apiRouter.POST(genaiPrefix+"/vectorstores", app.RequireAccessToService(app.AttachRESTClient(app.LlamaStackCreateVectorStoreHandler)))

	// Files Upload
	apiRouter.POST(genaiPrefix+"/files/upload", app.RequireAccessToService(app.AttachRESTClient(app.LlamaStackUploadFileHandler)))

	//Code Exporter
	apiRouter.POST(genaiPrefix+"/code-exporter", app.RequireAccessToService(app.AttachRESTClient(app.CodeExporterHandler)))

	// Settings path namespace endpoints. This endpoint will get all the namespaces
	apiRouter.GET(genaiPrefix+"/namespaces", app.RequireAccessToService(app.GetNamespaceHandler))
	// App Router
	appMux := http.NewServeMux()

	//All other API routes require auth
	appMux.Handle(app.config.APIPathPrefix+"/", apiRouter)

	// Only register the path prefix handler if PathPrefix is not empty to avoid duplicate route registration
	if app.config.PathPrefix != "" {
		appMux.Handle(app.config.PathPrefix+app.config.APIPathPrefix+"/", http.StripPrefix(app.config.PathPrefix, apiRouter))
	}

	// Llama Stack proxy handler (unprotected)
	appMux.HandleFunc("/llama-stack/", app.HandleLlamaStackProxy)

	//file server for the frontend file and SPA routes
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)

	// Handle static files and SPA routes - only for specific paths
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helper.GetContextLoggerFromReq(r)

		// Skip API routes
		if (r.URL.Path == "/" || r.URL.Path == "/index.html") ||
			(len(r.URL.Path) > 0 && r.URL.Path[0] == '/' && !app.isAPIRoute(r.URL.Path)) {

			// Check if the requested file exists
			cleanPath := path.Clean(r.URL.Path)
			if _, err := staticDir.Open(cleanPath); err == nil {
				ctxLogger.Debug("Serving static file", slog.String("path", r.URL.Path))
				// Serve the file if it exists
				fileServer.ServeHTTP(w, r)
				return
			}

			// Fallback to index.html for SPA routes
			ctxLogger.Debug("Static asset not found, serving index.html", slog.String("path", r.URL.Path))
			http.ServeFile(w, r, path.Join(app.config.StaticAssetsDir, "index.html"))
			return
		}

		// For API routes, return 404
		http.NotFound(w, r)
	})

	healthcheckMux := http.NewServeMux()
	healthcheckRouter := httprouter.New()
	healthcheckRouter.GET(constants.HealthCheckPath, app.HealthcheckHandler)
	healthcheckMux.Handle(constants.HealthCheckPath, app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(healthcheckRouter))))

	// Combines the healthcheck endpoint with the rest of the routes
	combinedMux := http.NewServeMux()
	combinedMux.Handle(constants.HealthCheckPath, healthcheckMux)

	// OpenAPI routes (unprotected) - handle these before the main app routes
	combinedMux.HandleFunc(constants.OpenAPIPath, app.openAPI.HandleOpenAPIRedirectWrapper)
	combinedMux.HandleFunc(constants.OpenAPIJSONPath, app.openAPI.HandleOpenAPIJSONWrapper)
	combinedMux.HandleFunc(constants.OpenAPIYAMLPath, app.openAPI.HandleOpenAPIYAMLWrapper)
	combinedMux.HandleFunc(constants.SwaggerUIPath, app.openAPI.HandleSwaggerUIWrapper)

	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(app.InjectRequestIdentity(appMux)))))

	return combinedMux
}
