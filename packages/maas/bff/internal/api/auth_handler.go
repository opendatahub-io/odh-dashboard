package api

import (
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

func attachAuthHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.GET(constants.GroupsPath, handlerWithApp(app, ListGroupsHandler))
}

// ListGroupsHandler returns the list of OpenShift Groups the user has access to.
// Returns 200 with empty list if the Groups API doesn't exist (external OIDC).
// Returns 403 if the user doesn't have access to list groups.
// Returns 500 if there is an unexpected error.
func ListGroupsHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	groupsList, err := app.repositories.Auth.ListGroups(ctx)
	if err != nil {
		// If Groups API doesn't exist (404), return empty list - this is expected
		// when using external OIDC providers
		if errors.Is(err, repositories.ErrGroupsAPINotFound) {
			response := Envelope[*models.GroupsList, None]{
				Data: &models.GroupsList{Groups: []string{}},
			}
			if responseErr := app.WriteJSON(w, http.StatusOK, response, nil); responseErr != nil {
				app.serverErrorResponse(w, r, responseErr)
			}
			return
		}
		if errors.Is(err, repositories.ErrGroupsForbidden) {
			app.forbiddenResponse(w, r, "user does not have access to list groups")
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[*models.GroupsList, None]{
		Data: groupsList,
	}

	if responseErr := app.WriteJSON(w, http.StatusOK, response, nil); responseErr != nil {
		app.serverErrorResponse(w, r, responseErr)
	}
}
