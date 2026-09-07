package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

const (
	AuthConfigPath = ApiPathPrefix + "/auth/config"
	AuthWhoamiPath = ApiPathPrefix + "/auth/whoami"
)

func (app *App) AuthConfigHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if !app.mockModeRequired(w, r) {
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, models.DefaultMockAuthConfig(), nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) AuthWhoamiHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if !app.mockModeRequired(w, r) {
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, models.DefaultMockCurrentUser(), nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
