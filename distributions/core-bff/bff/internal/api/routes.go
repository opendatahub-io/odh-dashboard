package api

import (
	"bytes"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
)

const (
	// PathPrefix is the URL prefix for BFF-scoped paths.
	PathPrefix = constants.BFFPathPrefix
	// APIPathPrefix is the base API path prefix.
	APIPathPrefix = constants.APIPathPrefix
	// APIVersion is the API version path segment.
	APIVersion = constants.APIVersion
)

// Routes builds the full HTTP handler tree: API router, proxies, static files, and middleware.
func (app *App) Routes() http.Handler {
	serviceMux := app.newServiceMux()
	staticHandler := withDocumentCSP(app.newStaticHandler())
	return httpcontract.Middleware(app.EnableTelemetry(app.SetSecurityHeaders(app.RecoverPanic(app.EnableCORS(app.newCombinedMux(serviceMux, staticHandler))))), app.logger)
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
	app.registerModuleProxies(mux)

	return mux
}

// newStaticHandler creates the SPA static file server with index.html fallback.
// Cache-Control mirrors Node: SPA shell (`/` and missing-path fallback) is no-store;
// real static files use getCacheControlForStaticFile (hashed / short / no-cache).
func (app *App) newStaticHandler() http.Handler {
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helpers.GetContextLoggerFromReq(r)
		if isShellDocumentPath(r.URL.Path) {
			app.serveIndexHTML(w, r)
			return
		}
		if f, err := staticDir.Open(r.URL.Path); err == nil {
			f.Close()
			w.Header().Set(constants.HeaderCacheControl, getCacheControlForStaticFile(r.URL.Path))
			ctxLogger.Debug("Serving static file", slog.String("path", r.URL.Path))
			fileServer.ServeHTTP(w, r)
			return
		}
		ctxLogger.Debug("Static asset not found, serving index.html", slog.String("path", r.URL.Path))
		app.serveIndexHTML(w, r)
	})
}

// isShellDocumentPath reports the two paths that are the SPA shell rather than an asset.
// Deep links reach serveIndexHTML through the missing-file fallback instead.
func isShellDocumentPath(urlPath string) bool {
	return urlPath == "/" || urlPath == constants.IndexHTMLFileName
}

// serveIndexHTML renders the shell with the per-request nonce substituted for
// CSPNoncePlaceholder. Reading the file instead of handing it to http.ServeFile is what
// allows the body and the CSP header (set by withDocumentCSP) to carry the same nonce.
func (app *App) serveIndexHTML(w http.ResponseWriter, r *http.Request) {
	shell, err := os.ReadFile(filepath.Join(app.config.StaticAssetsDir, constants.IndexHTMLFileName))
	if err != nil {
		http.Error(w, "document unavailable", http.StatusInternalServerError)
		return
	}

	nonce := cspNonceFromRequest(r)
	body := bytes.ReplaceAll(shell, []byte(constants.CSPNoncePlaceholder), []byte(nonce))

	w.Header().Set(constants.HeaderCacheControl, constants.CacheControlNoStore)
	w.Header().Set(constants.HeaderContentType, "text/html; charset=utf-8")
	w.Header().Set(constants.HeaderContentLength, strconv.Itoa(len(body)))
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = w.Write(body) // #nosec G705 -- static shell + crypto/rand nonce only
	}
}

// newCombinedMux wires public and authenticated routes into the top-level mux.
// New service prefixes are secure by default - only publicRoute paths skip auth.
func (app *App) newCombinedMux(serviceMux *http.ServeMux, staticHandler http.Handler) *http.ServeMux {
	authedHandler := app.InjectRequestIdentity(serviceMux)

	mux := http.NewServeMux()

	app.registerPublicHealthcheckRoute(mux)
	app.registerPublicNIMRoutes(mux)
	app.registerPublicOpenAPIRoutes(mux)
	mux.Handle("/", app.publicRoute(staticHandler))

	// Authenticated routes (token required)
	mux.Handle(APIPathPrefix+"/", authedHandler)
	mux.Handle(PathPrefix+"/", authedHandler)
	mux.Handle(proxy.WssProxyPrefix, authedHandler)

	// Bare module paths (e.g. /gen-ai/api/) need explicit auth routing to avoid the SPA catch-all.
	// Register both the subtree and exact root to prevent ServeMux 307 redirects.
	for _, mp := range app.moduleProxies {
		mux.Handle(mp.path+"/", authedHandler)
		mux.HandleFunc(mp.path, app.notFoundResponse)
	}

	// Exact-path handlers prevent ServeMux from 307-redirecting bare roots to subtree patterns.
	mux.HandleFunc(APIPathPrefix, app.notFoundResponse)
	mux.HandleFunc(PathPrefix, app.notFoundResponse)

	return mux
}
