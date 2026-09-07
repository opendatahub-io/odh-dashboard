package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

const (
	WorkspacesPath         = ApiPathPrefix + "/workspaces"
	WorkspacePath          = ApiPathPrefix + "/workspaces/:workspace"
	WorkspaceSandboxesPath = ApiPathPrefix + "/workspaces/:workspace/sandboxes"
	WorkspaceSandboxPath   = ApiPathPrefix + "/workspaces/:workspace/sandboxes/:name"
	HealthReadyPath        = "/api/health/readyz"
)

type openshellErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (app *App) writeOpenshellError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	err := app.WriteJSON(w, status, openshellErrorBody{Code: code, Message: message}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) mockModeRequired(w http.ResponseWriter, r *http.Request) bool {
	if app.config.MockHTTPClient && app.openshellStore != nil {
		return true
	}
	app.writeOpenshellError(w, r, http.StatusServiceUnavailable, "not_configured", "OpenShell mock API is not enabled")
	return false
}

func (app *App) ListWorkspacesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if !app.mockModeRequired(w, r) {
		return
	}

	workspaces := app.openshellStore.ListWorkspaces(r.URL.Query().Get("labelSelector"))
	if err := app.WriteJSON(w, http.StatusOK, workspaces, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetWorkspaceHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if !app.mockModeRequired(w, r) {
		return
	}

	workspace, err := app.openshellStore.GetWorkspace(ps.ByName("workspace"))
	if err != nil {
		app.writeOpenshellError(w, r, http.StatusNotFound, "not_found", err.Error())
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, workspace, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
