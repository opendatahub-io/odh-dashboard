package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type ComponentStatusResponse struct {
	Ready bool `json:"ready"`
}

func (app *App) StatusHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	resp := ComponentStatusResponse{
		Ready: true,
	}

	if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
