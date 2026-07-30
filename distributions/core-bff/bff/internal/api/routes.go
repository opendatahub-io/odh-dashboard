package api

import (
	"log/slog"
	"net/http"
	"path"

	"github.com/julienschmidt/httprouter"
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
)

// Routes builds the full HTTP handler tree: API router, proxies, static files, and middleware.
func (app *App) Routes() http.Handler {
	serviceMux := app.newServiceMux()
	staticHandler := app.newStaticHandler()
	return app.newCombinedMux(serviceMux, staticHandler)
}

// Auth contract: apiRouter routes require a token (InjectRequestIdentity).
// Route-level auth is via secureRoute (user) or secureAdminRoute (admin).
// Unauthenticated routes use publicRoute on the outer mux.
//
// newServiceMux creates the mux for API routes and proxies (all require authentication).
func (app *App) newServiceMux() *http.ServeMux {
	apiRouter := httprouter.New()
	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	app.registerBaseRoutes(apiRouter)
	app.registerConfigRoutes(apiRouter)
	app.registerConnectionTypeRoutes(apiRouter)
	app.registerModelServingRoutes(apiRouter)

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
	app.registerModelServingProxy(mux)

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

	mux := http.NewServeMux()

	app.registerPublicHealthcheckRoute(mux)
	app.registerPublicNIMRoutes(mux)
	app.registerPublicOpenAPIRoutes(mux)
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
