package api

import "github.com/julienschmidt/httprouter"

const (
	ConnectionTypesPath      = APIPathPrefix + "/connection-types"
	ConnectionTypeSinglePath = APIPathPrefix + "/connection-types/:name"
)

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
