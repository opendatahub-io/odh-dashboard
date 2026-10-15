package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type HardwareProfilesEnvelope Envelope[models.HardwareProfilesResponse, None]

// RHOAIENG-99645: the Kueue integration is disabled. Return an empty profile list
// without querying the cluster.
func (app *App) HardwareProfilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	profiles := models.HardwareProfilesResponse{
		// Non-nil so the field marshals to [] rather than null, per the OpenAPI contract.
		Items: []models.HardwareProfile{},
	}
	if err := app.WriteJSON(w, http.StatusOK, HardwareProfilesEnvelope{Data: profiles}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
