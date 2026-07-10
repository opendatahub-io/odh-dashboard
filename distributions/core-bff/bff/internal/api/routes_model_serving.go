package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
)

const (
	// Model serving
	ModelServingProxyPrefix = APIPathPrefix + "/service/model-serving/"
	ServingRuntimesPath     = APIPathPrefix + "/servingRuntimes"
	NamespaceMutationPath   = APIPathPrefix + "/namespaces/:name/:context"

	// Prometheus
	PrometheusQueryPath      = APIPathPrefix + "/prometheus/query"
	PrometheusQueryRangePath = APIPathPrefix + "/prometheus/queryRange"
	PrometheusPVCPath        = APIPathPrefix + "/prometheus/pvc"
	PrometheusBiasPath       = APIPathPrefix + "/prometheus/bias"
	PrometheusServingPath    = APIPathPrefix + "/prometheus/serving"

	// NIM (OpenShift-only)
	NIMServingResourcePath = APIPathPrefix + "/nim-serving/:nimResource"
	NIMIntegrationPath     = APIPathPrefix + "/integrations/nim"
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

	// Prometheus (OpenShift-only)
	r.POST(PrometheusQueryPath, app.requirePlatform(config.PlatformOpenShift, app.PrometheusQueryHandler))
	r.POST(PrometheusQueryRangePath, app.requirePlatform(config.PlatformOpenShift, app.PrometheusQueryHandler))
	r.POST(PrometheusPVCPath, app.requirePlatform(config.PlatformOpenShift, app.PrometheusQueryHandler))
	r.POST(PrometheusBiasPath, app.requirePlatform(config.PlatformOpenShift, app.PrometheusQueryHandler))
	r.POST(PrometheusServingPath, app.requirePlatform(config.PlatformOpenShift, app.PrometheusQueryHandler))

	// NIM admin (OpenShift-only)
	r.POST(NIMIntegrationPath, app.requirePlatform(config.PlatformOpenShift, app.secureAdminRoute(app.CreateNIMIntegrationHandler)))
	r.DELETE(NIMIntegrationPath, app.requirePlatform(config.PlatformOpenShift, app.secureAdminRoute(app.DeleteNIMIntegrationHandler)))
}

func (app *App) registerPublicNIMRoutes(mux *http.ServeMux) {
	r := httprouter.New()
	r.GET(NIMServingResourcePath, app.GetNIMServingResourceHandler)
	r.GET(NIMIntegrationPath, app.GetNIMIntegrationStatusHandler)

	public := app.requirePlatformPublic(config.PlatformOpenShift, app.publicRoute(r))
	publicPrefixed := app.requirePlatformPublic(config.PlatformOpenShift, app.publicRoute(http.StripPrefix(PathPrefix, r)))

	mux.Handle("GET "+NIMIntegrationPath, public)
	mux.Handle("GET "+APIPathPrefix+"/nim-serving/", public)
	mux.Handle("GET "+PathPrefix+NIMIntegrationPath, publicPrefixed)
	mux.Handle("GET "+PathPrefix+APIPathPrefix+"/nim-serving/", publicPrefixed)
}
