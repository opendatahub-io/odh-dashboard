package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

const (
	HealthCheckPath    = "/healthcheck"
	APIHealthCheckPath = APIPathPrefix + APIVersion + "/healthcheck"
	UserPath           = APIPathPrefix + APIVersion + "/user"
	NamespacePath      = APIPathPrefix + APIVersion + "/namespaces"
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
}
