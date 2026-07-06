package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type HealthEnvelope struct {
	Status     string     `json:"status"`
	SystemInfo SystemInfo `json:"system_info"`
}

type SystemInfo struct {
	Version string `json:"version"`
}

func (app *App) HealthHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	health := HealthEnvelope{
		Status:     "available",
		SystemInfo: SystemInfo{Version: Version},
	}

	if err := app.WriteJSON(w, http.StatusOK, health, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
