package api

import (
	"log/slog"
	"net/http"
	"path"

	"github.com/opendatahub-io/odh-dashboard/packages/agent-ops/bff/internal/config"

	"github.com/julienschmidt/httprouter"
)

const (
	Version         = "1.0.0"
	PathPrefix      = "/agent-ops"
	APIPathPrefix   = "/api/v1"
	HealthCheckPath = "/healthcheck"
	StatusPath      = APIPathPrefix + "/status"
)

type App struct {
	config config.EnvConfig
	logger *slog.Logger
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) *App {
	logger.Debug("Initializing app with config", slog.Any("config", cfg))

	return &App{
		config: cfg,
		logger: logger,
	}
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// API routes
	apiRouter.GET(StatusPath, app.StatusHandler)

	// App Router
	appMux := http.NewServeMux()

	// handler for api calls
	appMux.Handle(APIPathPrefix+"/", apiRouter)
	appMux.Handle(PathPrefix+APIPathPrefix+"/", http.StripPrefix(PathPrefix, apiRouter))

	// file server for the frontend file and SPA routes
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Check if the requested file exists
		if _, err := staticDir.Open(r.URL.Path); err == nil {
			app.logger.Debug("Serving static file", slog.String("path", r.URL.Path))
			// Serve the file if it exists
			fileServer.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for SPA routes
		app.logger.Debug("Static asset not found, serving index.html", slog.String("path", r.URL.Path))
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
	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(appMux))))

	return combinedMux
}
