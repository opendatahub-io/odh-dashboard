package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"path"
	"strings"

	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"

	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp/mcpmocks"

	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
)

type App struct {
	config                  config.EnvConfig
	logger                  *slog.Logger
	repositories            *repositories.Repositories
	openAPI                 *OpenAPIHandler
	kubernetesClientFactory k8s.KubernetesClientFactory
	llamaStackClientFactory llamastack.LlamaStackClientFactory
	maasClientFactory       maas.MaaSClientFactory
	mcpClientFactory        mcp.MCPClientFactory
	dashboardNamespace      string
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	logger.Info("Initializing app with config", slog.Any("config", cfg))

	// Detect dashboard namespace
	dashboardNamespace, err := helper.GetCurrentNamespace()
	if err != nil {
		logger.Warn("Failed to detect dashboard namespace, using default", "error", err, "default", "opendatahub")
		dashboardNamespace = "opendatahub"
	}
	logger.Info("Detected dashboard namespace", "namespace", dashboardNamespace)

	// Initialize LlamaStack client factory - clients will be created per request
	var llamaStackClientFactory llamastack.LlamaStackClientFactory
	if cfg.MockLSClient {
		logger.Info("Using mock LlamaStack client factory")
		llamaStackClientFactory = lsmocks.NewMockClientFactory()
	} else {
		logger.Info("Using real LlamaStack client factory", "url", cfg.LlamaStackURL)
		llamaStackClientFactory = llamastack.NewRealClientFactory()
	}

	// Initialize MaaS client factory - clients will be created per request
	var maasClientFactory maas.MaaSClientFactory
	if cfg.MockMaaSClient {
		logger.Info("Using mock MaaS client factory")
		maasClientFactory = maasmocks.NewMockClientFactory()
	} else {
		logger.Info("Using real MaaS client factory", "url", cfg.MaaSURL)
		maasClientFactory = maas.NewRealClientFactory()
	}

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
		var ctrlClient client.Client
		ctx, cancel := context.WithCancel(context.Background())
		testEnv, ctrlClient, err = k8smocks.SetupEnvTest(k8smocks.TestEnvInput{
			Users:  k8smocks.DefaultTestUsers,
			Logger: logger,
			Ctx:    ctx,
			Cancel: cancel,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to setup envtest: %w", err)
		}
		k8sFactory, err = k8smocks.NewMockedKubernetesClientFactory(ctrlClient, testEnv, cfg, logger)
	} else {
		k8sFactory, err = k8s.NewKubernetesClientFactory(cfg, logger)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create Kubernetes client factory: %w", err)
	}

	// Initialize MCP client factory
	var mcpFactory mcp.MCPClientFactory
	if cfg.MockMCPClient {
		logger.Info("Using mocked MCP client")
		mcpFactory = mcpmocks.NewMockedMCPClientFactory(cfg, logger)
	} else {
		var err error
		mcpFactory, err = mcp.NewMCPClientFactory(cfg, logger)
		if err != nil {
			return nil, fmt.Errorf("failed to create MCP client factory: %w", err)
		}
	}

	app := &App{
		config:                  cfg,
		logger:                  logger,
		repositories:            repositories.NewRepositoriesWithMCP(mcpFactory, logger),
		openAPI:                 openAPIHandler,
		kubernetesClientFactory: k8sFactory,
		llamaStackClientFactory: llamaStackClientFactory,
		maasClientFactory:       maasClientFactory,
		mcpClientFactory:        mcpFactory,
		dashboardNamespace:      dashboardNamespace,
	}
	return app, nil
}

func (app *App) Shutdown() error {
	app.logger.Info("shutting down app...")
	// Add any cleanup logic here if needed
	return nil
}

// isAPIRoute checks if the given path is an API route
func (app *App) isAPIRoute(path string) bool {
	return path == constants.HealthCheckPath ||
		path == constants.OpenAPIPath ||
		path == constants.OpenAPIJSONPath ||
		path == constants.OpenAPIYAMLPath ||
		path == constants.SwaggerUIPath ||
		// Match exactly the API path prefix or any sub-path under it
		path == constants.ApiPathPrefix ||
		strings.HasPrefix(path, constants.ApiPathPrefix+"/") ||
		// Match the full gen-ai path prefix
		path == constants.PathPrefix+constants.ApiPathPrefix ||
		strings.HasPrefix(path, constants.PathPrefix+constants.ApiPathPrefix+"/")
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// LlamaStack API routes

	// Models (LlamaStack)
	apiRouter.GET(constants.ModelsListPath, app.RequireAccessToService(app.AttachNamespace(app.AttachLlamaStackClient(app.LlamaStackModelsHandler))))

	// Responses (LlamaStack)
	apiRouter.POST(constants.ResponsesPath, app.RequireAccessToService(app.AttachNamespace(app.AttachLlamaStackClient(app.LlamaStackCreateResponseHandler))))

	// Vector Stores (LlamaStack)
	apiRouter.GET(constants.VectorStoresListPath, app.RequireAccessToService(app.AttachNamespace(app.AttachLlamaStackClient(app.LlamaStackListVectorStoresHandler))))
	apiRouter.POST(constants.VectorStoresListPath, app.RequireAccessToService(app.AttachNamespace(app.AttachLlamaStackClient(app.LlamaStackCreateVectorStoreHandler))))
	apiRouter.DELETE(constants.VectorStoresDeletePath, app.RequireAccessToService(app.AttachNamespace(app.AttachLlamaStackClient(app.LlamaStackDeleteVectorStoreHandler))))

	// Files (LlamaStack)
	apiRouter.GET(constants.FilesListPath, app.RequireAccessToService(app.AttachNamespace(app.AttachLlamaStackClient(app.LlamaStackListFilesHandler))))
	apiRouter.POST(constants.FilesUploadPath, app.RequireAccessToService(app.AttachNamespace(app.AttachLlamaStackClient(app.LlamaStackUploadFileHandler))))
	apiRouter.DELETE(constants.FilesDeletePath, app.RequireAccessToService(app.AttachNamespace(app.AttachLlamaStackClient(app.LlamaStackDeleteFileHandler))))

	// Vector Store Files (LlamaStack)
	apiRouter.GET(constants.VectorStoreFilesListPath, app.RequireAccessToService(app.AttachNamespace(app.AttachLlamaStackClient(app.LlamaStackListVectorStoreFilesHandler))))
	apiRouter.DELETE(constants.VectorStoreFilesDeletePath, app.RequireAccessToService(app.AttachNamespace(app.AttachLlamaStackClient(app.LlamaStackDeleteVectorStoreFileHandler))))

	// Code Exporter (Template-only)
	apiRouter.POST(constants.CodeExporterPath, app.RequireAccessToService(app.AttachNamespace(app.CodeExporterHandler)))

	// Kubernetes routes

	// AI Assets Models (Kubernetes)
	apiRouter.GET(constants.ModelsAAPath, app.RequireAccessToService(app.AttachNamespace(app.ModelsAAHandler)))

	// Settings path namespace endpoints. This endpoint will get all the namespaces
	apiRouter.GET(constants.NamespacesPath, app.RequireAccessToService(app.GetNamespaceHandler))

	// Identity
	apiRouter.GET(constants.UserPath, app.RequireAccessToService(app.GetCurrentUserHandler))

	// Llama Stack Distribution status endpoint
	apiRouter.GET(constants.LlamaStackDistributionStatusPath, app.RequireAccessToService(app.AttachNamespace(app.LlamaStackDistributionStatusHandler)))

	// Llama Stack Distribution install endpoint
	apiRouter.POST(constants.LlamaStackDistributionInstallPath, app.RequireAccessToService(app.AttachNamespace(app.LlamaStackDistributionInstallHandler)))

	// Llama Stack Distribution delete endpoint
	apiRouter.DELETE(constants.LlamaStackDistributionDeletePath, app.RequireAccessToService(app.AttachNamespace(app.LlamaStackDistributionDeleteHandler)))

	// MCP Client endpoints
	apiRouter.GET(constants.MCPToolsPath, app.RequireAccessToService(app.MCPToolsHandler))
	apiRouter.GET(constants.MCPStatusPath, app.RequireAccessToService(app.MCPStatusHandler))
	apiRouter.GET(constants.MCPServersListPath, app.RequireAccessToService(app.MCPListHandler))

	// MaaS API routes

	// Models (MaaS)
	apiRouter.GET(constants.MaaSModelsPath, app.RequireAccessToService(app.AttachMaaSClient(app.MaaSModelsHandler)))

	// Tokens (MaaS)
	apiRouter.POST(constants.MaaSTokensPath, app.RequireAccessToService(app.AttachMaaSClient(app.MaaSIssueTokenHandler)))
	apiRouter.DELETE(constants.MaaSTokensPath, app.RequireAccessToService(app.AttachMaaSClient(app.MaaSRevokeAllTokensHandler)))

	// App Router
	appMux := http.NewServeMux()

	// handler for api calls
	appMux.Handle(constants.PathPrefix+constants.ApiPathPrefix+"/", http.StripPrefix(constants.PathPrefix, apiRouter))

	// file server for the frontend file and SPA routes
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	appMux.Handle(constants.ApiPathPrefix+"/", apiRouter)
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

	// Create a mux for the healthcheck endpoint
	healthcheckMux := http.NewServeMux()
	healthcheckRouter := httprouter.New()
	healthcheckRouter.GET(constants.HealthCheckPath, app.HealthcheckHandler)
	healthcheckMux.Handle(constants.HealthCheckPath, app.RecoverPanic(app.EnableTelemetry(healthcheckRouter)))

	// Create main mux for all routes
	combinedMux := http.NewServeMux()

	// Health check endpoint (isolated with its own middleware)
	combinedMux.Handle(constants.HealthCheckPath, healthcheckMux)

	// OpenAPI routes (unprotected) - handle these before the main app routes
	combinedMux.HandleFunc(constants.OpenAPIPath, app.openAPI.HandleOpenAPIRedirectWrapper)
	combinedMux.HandleFunc(constants.OpenAPIJSONPath, app.openAPI.HandleOpenAPIJSONWrapper)
	combinedMux.HandleFunc(constants.OpenAPIYAMLPath, app.openAPI.HandleOpenAPIYAMLWrapper)
	combinedMux.HandleFunc(constants.SwaggerUIPath, app.openAPI.HandleSwaggerUIWrapper)

	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(app.InjectRequestIdentity(appMux)))))

	return combinedMux
}
