package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// GetAllowedUsersHandler returns users with notebook access in a namespace.
func (app *App) GetAllowedUsersHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("namespace")

	if !app.isAllowedNamespace(namespace) {
		app.forbiddenResponse(w, r, fmt.Errorf("request invalid against a resource from a non-dashboard namespace"))
		return
	}

	users, err := app.repositories.AllowedUsers.GetAllowedUsers(r.Context(), namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, users, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
