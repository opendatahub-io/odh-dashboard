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
	serviceMux := app.newServiceMux()
	staticHandler := app.newStaticHandler()
	return app.newCombinedMux(serviceMux, staticHandler)
}

// newServiceMux creates the mux for API routes and proxies (all require authentication).
func (app *App) newServiceMux() *http.ServeMux {
	apiRouter := httprouter.New()
	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	app.registerStarterRoutes(apiRouter)
	app.registerConfigRoutes(apiRouter)
	app.registerConnectionTypeRoutes(apiRouter)
	app.registerOpenShiftRoutes(apiRouter)

	mux := http.NewServeMux()
	mux.Handle(APIPathPrefix+"/", apiRouter)
	mux.Handle(PathPrefix+APIPathPrefix+"/", http.StripPrefix(PathPrefix, apiRouter))
	mux.HandleFunc(APIPathPrefix, func(w http.ResponseWriter, r *http.Request) {
		app.notFoundResponse(w, r)
	})
	mux.HandleFunc(PathPrefix+APIPathPrefix, func(w http.ResponseWriter, r *http.Request) {
		app.notFoundResponse(w, r)
	})

	if app.k8sProxy != nil {
		mux.Handle(proxy.K8sProxyPrefix, app.k8sProxy)
		mux.Handle(PathPrefix+proxy.K8sProxyPrefix, http.StripPrefix(PathPrefix, app.k8sProxy))
	}
	if app.wsProxy != nil {
		mux.Handle(proxy.WssProxyPrefix, app.wsProxy)
		mux.Handle(PathPrefix+proxy.WssProxyPrefix, http.StripPrefix(PathPrefix, app.wsProxy))
	}

	return mux
}

// newStaticHandler creates the SPA static file server with index.html fallback.
func (app *App) newStaticHandler() http.Handler {
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
}

// newCombinedMux wires public and authenticated routes into the top-level mux.
// New service prefixes are secure by default - only publicRoute paths skip auth.
func (app *App) newCombinedMux(serviceMux *http.ServeMux, staticHandler http.Handler) *http.ServeMux {
	authedHandler := app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(app.InjectRequestIdentity(serviceMux))))

	healthcheckRouter := httprouter.New()
	healthcheckRouter.GET(HealthCheckPath, app.HealthcheckHandler)

	mux := http.NewServeMux()

	// Public routes (no authentication required)
	mux.Handle(HealthCheckPath, app.publicRoute(healthcheckRouter))
	mux.Handle(OpenAPIJSONPath, app.publicRouteFunc(app.openAPI.HandleOpenAPIJSONWrapper))
	mux.Handle(OpenAPIYAMLPath, app.publicRouteFunc(app.openAPI.HandleOpenAPIYAMLWrapper))
	if app.config.DevMode {
		mux.Handle(SwaggerUIPath, app.publicRouteFunc(app.openAPI.HandleSwaggerUIWrapper))
		mux.Handle(OpenAPIPath, app.publicRouteFunc(app.openAPI.HandleOpenAPIRedirectWrapper))
	}
	mux.Handle("/", app.publicRoute(staticHandler))

	// Authenticated routes (token required)
	mux.Handle(APIPathPrefix+"/", authedHandler)
	mux.Handle(PathPrefix+"/", authedHandler)
	mux.Handle(proxy.WssProxyPrefix, authedHandler)

	// Exact-path handlers prevent ServeMux from 307-redirecting bare roots to subtree patterns.
	mux.HandleFunc(APIPathPrefix, app.notFoundResponse)
	mux.HandleFunc(PathPrefix, app.notFoundResponse)

	return mux
}

// Auth contract: every route in the register* functions below must be wrapped
// with secureRoute (authenticated) or secureAdminRoute (admin-only).
// The only exception is APIHealthCheckPath which is unauthenticated by convention
// (K8s probes use /healthcheck which bypasses auth entirely).
// When adding a new route, choose the appropriate wrapper explicitly.

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
