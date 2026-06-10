package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// GetComponentsHandler lists OdhApplication CRDs. Returns empty array when CRD is absent.
func (app *App) GetComponentsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if err := app.validateCallerToken(r.Context()); err != nil {
		app.unauthorizedResponse(w, r, err)
		return
	}

	installedOnly := r.URL.Query().Get("installed") != ""

	components, err := app.repositories.Components.ListComponents(r.Context(), app.config.Namespace, installedOnly)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, components, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// RemoveComponentHandler removes an app entry from the enabled-apps ConfigMap.
func (app *App) RemoveComponentHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	appName := r.URL.Query().Get("appName")
	if appName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: appName"))
		return
	}

	result, err := app.repositories.Components.RemoveComponent(
		r.Context(), app.config.Namespace, appName, app.config.EnabledAppsCM,
	)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, result, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
