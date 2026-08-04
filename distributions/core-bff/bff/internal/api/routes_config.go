package api

import (
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
)

const (
	ConfigPath           = APIPathPrefix + "/config"
	ComponentsPath       = APIPathPrefix + "/components"
	StatusPath           = APIPathPrefix + "/status"
	DashboardConfigPath  = APIPathPrefix + "/dashboardConfig/:namespace/:name"
	ClusterSettingsPath  = APIPathPrefix + "/cluster-settings"
	ComponentsRemovePath = APIPathPrefix + "/components/remove"
	AllowedUsersPath     = APIPathPrefix + "/status/:namespace/allowedUsers"
)

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

	// Platform-specific (OpenShift only)
	r.GET(AllowedUsersPath, app.requirePlatform(config.PlatformOpenShift, app.secureAdminRoute(app.GetAllowedUsersHandler)))
}
