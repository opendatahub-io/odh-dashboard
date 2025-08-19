package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"path"
	"strings"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/mocks"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	helper "github.com/opendatahub-io/llama-stack-modular-ui/internal/helpers"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
)

const (
	Version         = "1.0.0"
	HealthCheckPath = "/healthcheck"
)

// isAPIRoute checks if the given path is an API route
func (app *App) isAPIRoute(path string) bool {
	return path == HealthCheckPath ||
		path == OpenAPIPath ||
		path == OpenAPIJSONPath ||
		path == OpenAPIYAMLPath ||
		path == SwaggerUIPath ||
		// Match exactly the configured API path prefix or any sub-path under it
		path == app.config.APIPathPrefix ||
		strings.HasPrefix(path, app.config.APIPathPrefix+"/") ||
		// Similarly for the llama-stack prefix
		path == "/llama-stack" ||
		strings.HasPrefix(path, "/llama-stack/")
}

// Path generation methods for configurable API paths
func (app *App) getModelListPath() string {
	return app.config.APIPathPrefix + "/models"
}

func (app *App) getVectorDBListPath() string {
	return app.config.APIPathPrefix + "/vector-dbs"
}

func (app *App) getUploadPath() string {
	return app.config.APIPathPrefix + "/upload"
}

func (app *App) getQueryPath() string {
	return app.config.APIPathPrefix + "/query"
}

type App struct {
	config       config.EnvConfig
	logger       *slog.Logger
	repositories *repositories.Repositories
	openAPI      *OpenAPIHandler
	tokenFactory *integrations.TokenClientFactory
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	var lsClient repositories.LlamaStackClientInterface
	var err error

	logger.Info("Initializing app with config", slog.Any("config", cfg))

	if cfg.MockLSClient {
		lsClient, err = mocks.NewLlamastackClientMock()
	} else {
		lsClient, err = repositories.NewLlamaStackClient()
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create llama stack client: %w", err)
	}

	// Initialize OpenAPI handler
	openAPIHandler, err := NewOpenAPIHandler(logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create OpenAPI handler: %w", err)
	}

	app := &App{
		config:       cfg,
		logger:       logger,
		repositories: repositories.NewRepositories(lsClient),
		openAPI:      openAPIHandler,
		tokenFactory: integrations.NewTokenClientFactory(logger, cfg),
	}
	return app, nil
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	apiRouter.GET(app.getModelListPath(), app.RequireAccessToService(app.AttachRESTClient(app.GetAllModelsHandler)))
	apiRouter.GET(app.getVectorDBListPath(), app.RequireAccessToService(app.AttachRESTClient(app.GetAllVectorDBsHandler)))

	// POST to register the vectorDB (/v1/vector-dbs)
	apiRouter.POST(app.getVectorDBListPath(), app.RequireAccessToService(app.AttachRESTClient(app.RegisterVectorDBHandler)))
	apiRouter.POST(app.getUploadPath(), app.RequireAccessToService(app.AttachRESTClient(app.UploadHandler)))
	apiRouter.POST(app.getQueryPath(), app.RequireAccessToService(app.AttachRESTClient(app.QueryHandler)))

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
	healthcheckRouter.GET(HealthCheckPath, app.HealthcheckHandler)
	healthcheckMux.Handle(HealthCheckPath, app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(healthcheckRouter))))

	// Combines the healthcheck endpoint with the rest of the routes
	combinedMux := http.NewServeMux()
	combinedMux.Handle(HealthCheckPath, healthcheckMux)

	// OpenAPI routes (unprotected) - handle these before the main app routes
	combinedMux.HandleFunc(OpenAPIPath, app.openAPI.HandleOpenAPIRedirectWrapper)
	combinedMux.HandleFunc(OpenAPIJSONPath, app.openAPI.HandleOpenAPIJSONWrapper)
	combinedMux.HandleFunc(OpenAPIYAMLPath, app.openAPI.HandleOpenAPIYAMLWrapper)
	combinedMux.HandleFunc(SwaggerUIPath, app.openAPI.HandleSwaggerUIWrapper)

	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(app.InjectRequestIdentity(appMux)))))

	return combinedMux
}
