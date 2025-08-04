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
)

const (
	Version = "1.0.0"

	ApiPathPrefix   = "/api/v1"
	HealthCheckPath = "/healthcheck"

	OauthCallbackPath = ApiPathPrefix + "/auth/callback"
	OauthStatePath    = ApiPathPrefix + "/auth/state"

	ConfigPath = ApiPathPrefix + "/config"

	ModelListPath    = ApiPathPrefix + "/models"
	VectorDBListPath = ApiPathPrefix + "/vector-dbs"

	// making it simpler than /tool-runtime/rag-tool/insert
	UploadPath = ApiPathPrefix + "/upload"
	QueryPath  = ApiPathPrefix + "/query"
)

// isAPIRoute checks if the given path is an API route
func isAPIRoute(path string) bool {
	return path == HealthCheckPath ||
		path == OpenAPIPath ||
		path == OpenAPIJSONPath ||
		path == OpenAPIYAMLPath ||
		path == SwaggerUIPath ||
		// Match exactly “/api/v1” or any sub-path under it
		path == ApiPathPrefix ||
		strings.HasPrefix(path, ApiPathPrefix+"/") ||
		// Similarly for the llama-stack prefix
		path == "/llama-stack" ||
		strings.HasPrefix(path, "/llama-stack/")
}

type App struct {
	config       config.EnvConfig
	logger       *slog.Logger
	repositories *repositories.Repositories
	openAPI      *OpenAPIHandler
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	var lsClient repositories.LlamaStackClientInterface
	var err error

	logger.Info("Initializing app with config", slog.Any("config", cfg))

	// Validate OAuth configuration
	if cfg.OAuthEnabled {
		if cfg.OAuthServerURL == "" {
			return nil, fmt.Errorf("OAUTH_SERVER_URL is required when OAuth is enabled")
		}
		if cfg.OAuthClientID == "" {
			return nil, fmt.Errorf("OAUTH_CLIENT_ID is required when OAuth is enabled")
		}
		if cfg.OAuthClientSecret == "" {
			return nil, fmt.Errorf("OAUTH_CLIENT_SECRET is required when OAuth is enabled")
		}
		if cfg.OAuthRedirectURI == "" {
			return nil, fmt.Errorf("OAUTH_REDIRECT_URI is required when OAuth is enabled")
		}
		logger.Info("OAuth configuration validated",
			slog.String("oauth_server_url", cfg.OAuthServerURL),
			slog.String("openshift_api_server_url", cfg.OpenShiftApiServerUrl))
	}

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
	}
	return app, nil
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// OAuth routes
	if app.config.OAuthEnabled {
		apiRouter.POST(OauthCallbackPath, app.HandleOAuthCallback)
		apiRouter.GET(OauthStatePath, app.HandleOAuthState)
	}

	// Config endpoint (not authenticated)
	apiRouter.GET(ConfigPath, app.HandleConfig)

	apiRouter.GET(ModelListPath, app.RequireAuthRoute(app.AttachRESTClient(app.GetAllModelsHandler)))
	apiRouter.GET(VectorDBListPath, app.RequireAuthRoute(app.AttachRESTClient(app.GetAllVectorDBsHandler)))

	// POST to register the vectorDB (/v1/vector-dbs)
	apiRouter.POST(VectorDBListPath, app.RequireAuthRoute(app.AttachRESTClient(app.RegisterVectorDBHandler)))
	apiRouter.POST(UploadPath, app.RequireAuthRoute(app.AttachRESTClient(app.UploadHandler)))
	apiRouter.POST(QueryPath, app.RequireAuthRoute(app.AttachRESTClient(app.QueryHandler)))

	// App Router
	appMux := http.NewServeMux()

	//// Register /api/v1/config as a public endpoint
	//appMux.HandleFunc(ApiPathPrefix+"/config", func(w http.ResponseWriter, r *http.Request) {
	//	app.HandleConfig(w, r, nil)
	//})
	//
	//// Register /api/v1/auth/callback as a public endpoint
	//appMux.HandleFunc(ApiPathPrefix+"/auth/callback", func(w http.ResponseWriter, r *http.Request) {
	//	app.HandleOAuthCallback(w, r, nil)
	//})
	//
	//// Register /api/v1/auth/state as a public endpoint
	//appMux.HandleFunc(ApiPathPrefix+"/auth/state", func(w http.ResponseWriter, r *http.Request) {
	//	app.HandleOAuthState(w, r, nil)
	//})

	//All other /api/v1/* routes require auth
	appMux.Handle(ApiPathPrefix+"/", apiRouter)

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
			(len(r.URL.Path) > 0 && r.URL.Path[0] == '/' && !isAPIRoute(r.URL.Path)) {

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

	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(appMux))))

	return combinedMux
}
