package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type HealthCheckResponse struct {
	Status  string `json:"status"`
	Version string `json:"version"`
}

func (app *App) HealthcheckHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	healthCheck := HealthCheckResponse{
		Status:  "OK",
		Version: Version,
	}

	err := app.WriteJSON(w, http.StatusOK, healthCheck, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
