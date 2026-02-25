package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type HelloEnvelope Envelope[string, None]

func (app *App) HelloHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	res := HelloEnvelope{
		Data: "Hello from MLflow BFF!",
	}

	err := app.WriteJSON(w, http.StatusOK, res, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
