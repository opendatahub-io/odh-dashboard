package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type readyzResponse struct {
	Status string `json:"status"`
}

func (app *App) ReadyzHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if err := app.WriteJSON(w, http.StatusOK, readyzResponse{Status: "ok"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
