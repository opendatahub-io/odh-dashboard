package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type BFFConfigEnvelope Envelope[*models.BFFConfigModel, None]

// BFFConfigHandler handles requests for BFF configuration
func (app *App) BFFConfigHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	config := &models.BFFConfigModel{
		IsCustomLSD: app.config.LlamaStackURL != "",
	}

	configEnvelope := BFFConfigEnvelope{
		Data: config,
	}

	err := app.WriteJSON(w, http.StatusOK, configEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
