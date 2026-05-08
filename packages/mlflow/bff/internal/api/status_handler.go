package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type MLflowStatusResponse struct {
	Configured bool `json:"configured"`
}

func (app *App) StatusHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	resp := MLflowStatusResponse{
		Configured: app.isMLflowConfigured(),
	}

	if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
