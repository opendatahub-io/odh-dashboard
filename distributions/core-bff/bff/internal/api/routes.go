package api

import (
	"log/slog"
	"net/http"
	"path"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
)

const (
	// PathPrefix is the URL prefix for BFF-scoped paths.
	PathPrefix = "/core-bff"
	// APIPathPrefix is the base API path prefix.
	APIPathPrefix = "/api"
	// APIVersion is the API version path segment.
	APIVersion = "/v1"

	// Infrastructure paths
	HealthCheckPath    = "/healthcheck"
	APIHealthCheckPath = APIPathPrefix + APIVersion + "/healthcheck"
	OpenAPIPath        = PathPrefix + "/openapi"
	OpenAPIJSONPath    = PathPrefix + "/openapi.json"
	OpenAPIYAMLPath    = PathPrefix + "/openapi.yaml"
	SwaggerUIPath      = PathPrefix + "/swagger-ui"

	// Starter endpoints (mod-arch-starter convention, /api/v1/ prefix)
	UserPath      = APIPathPrefix + APIVersion + "/user"
	NamespacePath = APIPathPrefix + APIVersion + "/namespaces"

	// Config endpoints, /api/ prefix
	ConfigPath           = APIPathPrefix + "/config"
	ComponentsPath       = APIPathPrefix + "/components"
	StatusPath           = APIPathPrefix + "/status"
	DashboardConfigPath  = APIPathPrefix + "/dashboardConfig/:namespace/:name"
	ClusterSettingsPath  = APIPathPrefix + "/cluster-settings"
	ComponentsRemovePath = APIPathPrefix + "/components/remove"

	// OpenShift-only endpoints
	AllowedUsersPath = APIPathPrefix + "/status/:namespace/allowedUsers"

	// Connection type endpoints
	ConnectionTypesPath      = APIPathPrefix + "/connection-types"
	ConnectionTypeSinglePath = APIPathPrefix + "/connection-types/:name"
)

// Routes builds the full HTTP handler tree: API router, proxies, static files, and middleware.
func (app *App) Routes() http.Handler {
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	app.registerStarterRoutes(apiRouter)
	app.registerConfigRoutes(apiRouter)
	app.registerConnectionTypeRoutes(apiRouter)
	app.registerOpenShiftRoutes(apiRouter)

	appMux := http.NewServeMux()

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

	// SPA static file server with index.html fallback
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helpers.GetContextLoggerFromReq(r)
		if f, err := staticDir.Open(r.URL.Path); err == nil {
			f.Close()
			ctxLogger.Debug("Serving static file", slog.String("path", r.URL.Path))
			fileServer.ServeHTTP(w, r)
			return
		}
		ctxLogger.Debug("Static asset not found, serving index.html", slog.String("path", r.URL.Path))
		http.ServeFile(w, r, path.Join(app.config.StaticAssetsDir, "index.html"))
	})

	// Healthcheck bypasses auth for k8s liveness/readiness probes (matches Fastify)
	healthcheckMux := http.NewServeMux()
	healthcheckRouter := httprouter.New()
	healthcheckRouter.GET(HealthCheckPath, app.HealthcheckHandler)
	healthcheckMux.Handle(HealthCheckPath, app.RecoverPanic(app.EnableTelemetry(healthcheckRouter)))

	// Top-level mux: healthcheck + OpenAPI (no auth), everything else through middleware
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

func (app *App) registerStarterRoutes(r *httprouter.Router) {
	r.GET(APIHealthCheckPath, app.HealthcheckHandler)
	r.GET(UserPath, app.secureRoute(app.UserHandler))
	r.GET(NamespacePath, app.secureRoute(app.GetNamespacesHandler))
}

func (app *App) registerConfigRoutes(r *httprouter.Router) {
	// Authenticated
	r.GET(ConfigPath, app.secureRoute(app.GetConfigHandler))
	r.GET(ComponentsPath, app.secureRoute(app.GetComponentsHandler))
	r.GET(StatusPath, app.secureRoute(app.GetStatusHandler))

	// Admin-only
	r.PATCH(ConfigPath, app.secureAdminRoute(app.PatchConfigHandler))
	r.GET(ComponentsRemovePath, app.secureAdminRoute(app.RemoveComponentHandler))
	r.GET(DashboardConfigPath, app.secureAdminRoute(app.GetDashboardConfigByNameHandler))
	r.PATCH(DashboardConfigPath, app.secureAdminRoute(app.PatchDashboardConfigByNameHandler))
	r.GET(ClusterSettingsPath, app.secureAdminRoute(app.GetClusterSettingsHandler))
	r.PUT(ClusterSettingsPath, app.secureAdminRoute(app.UpdateClusterSettingsHandler))
}

func (app *App) registerOpenShiftRoutes(r *httprouter.Router) {
	r.GET(AllowedUsersPath, app.requirePlatform(config.PlatformOpenShift, app.secureAdminRoute(app.GetAllowedUsersHandler)))
}

func (app *App) registerConnectionTypeRoutes(r *httprouter.Router) {
	// Authenticated
	r.GET(ConnectionTypesPath, app.secureRoute(app.ListConnectionTypesHandler))
	r.GET(ConnectionTypeSinglePath, app.secureRoute(app.GetConnectionTypeHandler))

	// Admin-only
	r.POST(ConnectionTypesPath, app.secureAdminRoute(app.CreateConnectionTypeHandler))
	r.PUT(ConnectionTypeSinglePath, app.secureAdminRoute(app.UpdateConnectionTypeHandler))
	r.PATCH(ConnectionTypeSinglePath, app.secureAdminRoute(app.PatchConnectionTypeHandler))
	r.DELETE(ConnectionTypeSinglePath, app.secureAdminRoute(app.DeleteConnectionTypeHandler))
}
