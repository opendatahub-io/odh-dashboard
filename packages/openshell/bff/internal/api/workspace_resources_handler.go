package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/mocks"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

const (
	WorkspaceMembersPath   = ApiPathPrefix + "/workspaces/:workspace/members"
	WorkspaceProvidersPath = ApiPathPrefix + "/workspaces/:workspace/providers"
)

func (app *App) ListMembersHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if !app.mockModeRequired(w, r) {
		return
	}

	workspace := ps.ByName("workspace")
	if _, err := app.openshellStore.GetWorkspace(workspace); err != nil {
		if mocks.IsNotFound(err) {
			app.writeOpenshellError(w, r, http.StatusNotFound, "not_found", err.Error())
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	members := make([]models.WorkspaceMember, 0)
	if err := app.WriteJSON(w, http.StatusOK, members, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) ListProvidersHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if !app.mockModeRequired(w, r) {
		return
	}

	workspace := ps.ByName("workspace")
	if _, err := app.openshellStore.GetWorkspace(workspace); err != nil {
		if mocks.IsNotFound(err) {
			app.writeOpenshellError(w, r, http.StatusNotFound, "not_found", err.Error())
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	providers := make([]models.Provider, 0)
	if err := app.WriteJSON(w, http.StatusOK, providers, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
