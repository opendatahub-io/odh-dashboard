package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

const (
	ModelServingProxyPrefix  = "/api/service/model-serving/"
	ServingRuntimesPath      = APIPathPrefix + "/servingRuntimes"
	NIMServingResourcePath   = APIPathPrefix + "/nim-serving/:nimResource"
	PrometheusQueryPath      = APIPathPrefix + "/prometheus/query"
	PrometheusQueryRangePath = APIPathPrefix + "/prometheus/queryRange"
	PrometheusPVCPath        = APIPathPrefix + "/prometheus/pvc"
	PrometheusBiasPath       = APIPathPrefix + "/prometheus/bias"
	PrometheusServingPath    = APIPathPrefix + "/prometheus/serving"
	NIMIntegrationPath       = APIPathPrefix + "/integrations/nim"
	NamespaceMutationPath    = APIPathPrefix + "/namespaces/:name/:context"
)

func (app *App) registerModelServingProxy(mux *http.ServeMux) {
	if app.modelServingProxy != nil {
		mux.Handle(ModelServingProxyPrefix, app.modelServingProxy)
		mux.Handle(PathPrefix+ModelServingProxyPrefix, http.StripPrefix(PathPrefix, app.modelServingProxy))
	}
}

func (app *App) registerModelServingRoutes(r *httprouter.Router) {
	// Admin-only
	r.POST(ServingRuntimesPath, app.secureAdminRoute(app.CreateServingRuntimeHandler))

	// Namespace serving platform mutations (SSAR-gated in handler)
	r.GET(NamespaceMutationPath, app.secureRoute(app.NamespaceMutationHandler))

	// Prometheus (handler checks auth internally)
	r.POST(PrometheusQueryPath, app.PrometheusQueryHandler)
	r.POST(PrometheusQueryRangePath, app.PrometheusQueryHandler)
	r.POST(PrometheusPVCPath, app.PrometheusQueryHandler)
	r.POST(PrometheusBiasPath, app.PrometheusQueryHandler)
	r.POST(PrometheusServingPath, app.PrometheusQueryHandler)

	// NIM admin
	r.POST(NIMIntegrationPath, app.secureAdminRoute(app.CreateNIMIntegrationHandler))
	r.DELETE(NIMIntegrationPath, app.secureAdminRoute(app.DeleteNIMIntegrationHandler))
}

func (app *App) registerPublicNIMRoutes(mux *http.ServeMux) {
	r := httprouter.New()
	r.GET(NIMServingResourcePath, app.GetNIMServingResourceHandler)
	r.GET(NIMIntegrationPath, app.GetNIMIntegrationStatusHandler)

	public := app.publicRoute(r)
	publicPrefixed := app.publicRoute(http.StripPrefix(PathPrefix, r))

	mux.Handle("GET "+NIMIntegrationPath, public)
	mux.Handle("GET "+APIPathPrefix+"/nim-serving/", public)
	mux.Handle("GET "+PathPrefix+NIMIntegrationPath, publicPrefixed)
	mux.Handle("GET "+PathPrefix+APIPathPrefix+"/nim-serving/", publicPrefixed)
}
