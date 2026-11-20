package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
)

const (
	HealthCheckPath    = "/healthcheck"
	APIHealthCheckPath = APIPathPrefix + APIVersion + "/healthcheck"
	UserPath           = APIPathPrefix + APIVersion + "/user"
	NamespacePath      = APIPathPrefix + APIVersion + "/namespaces"
	// NamespaceAccessPath is a sibling of NamespacePath rather than a child:
	// httprouter cannot register a static segment beside /namespaces/:name.
	NamespaceAccessPath = APIPathPrefix + APIVersion + "/namespace-access"
)

func (app *App) registerPublicHealthcheckRoute(mux *http.ServeMux) {
	r := httprouter.New()
	r.GET(HealthCheckPath, app.HealthcheckHandler)
	mux.Handle(HealthCheckPath, app.publicRoute(r))
}

func (app *App) registerBaseRoutes(r *httprouter.Router) {
	r.GET(APIHealthCheckPath, app.HealthcheckHandler)

	// Authenticated
	r.GET(UserPath, app.secureRoute(app.UserHandler))
	r.GET(NamespacePath, app.secureRoute(app.GetNamespacesHandler))
	r.GET(NamespacePath+"/:name", app.secureRoute(app.GetNamespaceHandler))

	// xKS authorized namespace discovery. OpenShift keeps its existing
	// project-based selection, so the routes are absent there.
	r.GET(NamespaceAccessPath, app.requirePlatform(config.PlatformXKS, app.secureRoute(app.GetNamespaceAccessHandler)))
	r.GET(NamespaceAccessPath+"/:name", app.requirePlatform(config.PlatformXKS, app.secureRoute(app.GetNamespaceAccessByNameHandler)))
}
