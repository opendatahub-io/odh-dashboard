package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// GetNIMIntegrationStatusHandler handles GET /api/v1/integrations/nim.
// Returns the NIM integration status derived from the Account CR.
// Registered as a publicRoute (no auth) - uses SA client, not user token.
func (app *App) GetNIMIntegrationStatusHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	status, err := app.repositories.NIM.GetNIMStatus(r.Context(), app.config.Namespace)
	if err != nil {
		app.k8sErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, status, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// CreateNIMIntegrationHandler handles POST /api/v1/integrations/nim.
// Creates or updates the NIM secret and Account CR.
// Wrapped with secureAdminRoute - returns 401 for unauthenticated, 403 for non-admin.
func (app *App) CreateNIMIntegrationHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var secretData map[string]string
	if err := app.ReadJSON(w, r, &secretData); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if len(secretData) == 0 {
		app.badRequestResponse(w, r, fmt.Errorf("secret data must not be empty"))
		return
	}

	status, err := app.repositories.NIM.CreateNIMAccount(r.Context(), app.config.Namespace, secretData)
	if err != nil {
		app.k8sErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, status, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// DeleteNIMIntegrationHandler handles DELETE /api/v1/integrations/nim.
// Deletes the NIM Account CR.
// Wrapped with secureAdminRoute - returns 401 for unauthenticated, 403 for non-admin.
func (app *App) DeleteNIMIntegrationHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	result, err := app.repositories.NIM.DeleteNIMAccount(r.Context(), app.config.Namespace)
	if err != nil {
		app.k8sErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, result, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
