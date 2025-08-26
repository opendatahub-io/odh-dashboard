package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
)

func (app *App) HealthcheckHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	healthCheck, err := app.repositories.HealthCheck.HealthCheck(constants.Version)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.WriteJSON(w, http.StatusOK, healthCheck, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
