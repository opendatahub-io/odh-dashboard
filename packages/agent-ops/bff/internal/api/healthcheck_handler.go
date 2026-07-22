package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

func (app *App) HealthcheckHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	healthCheck, err := app.repositories.HealthCheck.HealthCheck(Version)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	healthCheck.OpenShell = models.OpenShellStatus{
		Enabled:   app.config.OpenShellGatewayURL != "",
		Gateway:   app.config.OpenShellGatewayURL,
		Namespace: app.config.OpenShellSandboxNamespace,
	}

	err = app.WriteJSON(w, http.StatusOK, healthCheck, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
