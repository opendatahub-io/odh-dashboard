package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"path"
	"strings"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/clients"
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

// Old path generation methods removed - all functionality moved to /genai/v1/* endpoints

type App struct {
	config           config.EnvConfig
	logger           *slog.Logger
	repositories     *repositories.Repositories
	openAPI          *OpenAPIHandler
	tokenFactory     *integrations.TokenClientFactory
	llamaStackClient *clients.LlamaStackClient
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	logger.Info("Initializing app with config", slog.Any("config", cfg))

	// Initialize OpenAPI handler
	openAPIHandler, err := NewOpenAPIHandler(logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create OpenAPI handler: %w", err)
	}

	// Initialize OpenAI client for new endpoints
	llamaStackClient := clients.NewLlamaStackClient(cfg.LlamaStackURL)

	app := &App{
		config:           cfg,
		logger:           logger,
		repositories:     repositories.NewRepositories(llamaStackClient),
		openAPI:          openAPIHandler,
		tokenFactory:     integrations.NewTokenClientFactory(logger, cfg),
		llamaStackClient: llamaStackClient,
	}
	return app, nil
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// OLD ENDPOINTS REMOVED - all functionality moved to /genai/v1/* endpoints

	// NEW OPENAI SDK-BASED ENDPOINTS (use /genai/v1 prefix)
	genaiPrefix := "/genai/v1"

	// Models
	apiRouter.GET(genaiPrefix+"/models", app.RequireAccessToService(app.LlamaStackModelsHandler))

	// Responses (OpenAI Responses API)
	apiRouter.POST(genaiPrefix+"/responses", app.RequireAccessToService(app.LlamaStackCreateResponseHandler))
	apiRouter.GET(genaiPrefix+"/responses/:id", app.RequireAccessToService(app.LlamaStackGetResponseHandler))

	// Vector Stores
	apiRouter.GET(genaiPrefix+"/vectorstores", app.RequireAccessToService(app.LlamaStackListVectorStoresHandler))
	apiRouter.POST(genaiPrefix+"/vectorstores", app.RequireAccessToService(app.LlamaStackCreateVectorStoreHandler))

	// Files Upload
	apiRouter.POST(genaiPrefix+"/files/upload", app.RequireAccessToService(app.LlamaStackUploadFileHandler))

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
