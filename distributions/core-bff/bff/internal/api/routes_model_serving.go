package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
)

const (
	// Model serving
	ModelServingProxyPrefix = APIPathPrefix + "/service/model-serving/"
	// GatewayDiscoveryPath is model-serving-api's gateway discovery route under
	// the proxy prefix. On xKS Core BFF serves it natively; on OpenShift the
	// proxy forwards it (docs/model-serving-xks.md).
	GatewayDiscoveryPath  = ModelServingProxyPrefix + "api/v1/gateways"
	ServingRuntimesPath   = APIPathPrefix + "/servingRuntimes"
	NamespaceMutationPath = APIPathPrefix + "/namespaces/:name/:context"

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
	// The proxy prefix is a more specific ServeMux pattern than the API router,
	// so a proxy mounted here would shadow the native gateway route.
	if app.modelServingProxy != nil && !app.servesModelServingNatively() {
		mux.Handle(ModelServingProxyPrefix, app.modelServingProxy)
		mux.Handle(PathPrefix+ModelServingProxyPrefix, http.StripPrefix(PathPrefix, app.modelServingProxy))
	}
}

func (app *App) registerModelServingRoutes(r *httprouter.Router) {
	// xKS has no model-serving-api: the one route its journey needs is native,
	// and every other path under the prefix falls through to the API 404.
	if app.servesModelServingNatively() {
		r.GET(GatewayDiscoveryPath, app.secureRoute(app.GatewayDiscoveryHandler))
	}

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
