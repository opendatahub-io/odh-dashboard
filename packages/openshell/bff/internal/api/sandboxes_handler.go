package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/mocks"
)

func (app *App) ListSandboxesHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if !app.mockModeRequired(w, r) {
		return
	}

	workspace := ps.ByName("workspace")
	sandboxes, err := app.openshellStore.ListSandboxes(workspace, r.URL.Query().Get("labelSelector"))
	if err != nil {
		if mocks.IsNotFound(err) {
			app.writeOpenshellError(w, r, http.StatusNotFound, "not_found", err.Error())
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, sandboxes, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetSandboxHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if !app.mockModeRequired(w, r) {
		return
	}

	sandbox, err := app.openshellStore.GetSandbox(ps.ByName("workspace"), ps.ByName("name"))
	if err != nil {
		if mocks.IsNotFound(err) {
			app.writeOpenshellError(w, r, http.StatusNotFound, "not_found", err.Error())
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, sandbox, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
