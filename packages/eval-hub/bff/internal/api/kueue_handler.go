package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type KueueAvailabilityEnvelope Envelope[models.KueueAvailability, None]

// RHOAIENG-99645: the Kueue integration is disabled. Return the documented disabled
// availability without querying the cluster.
func (app *App) KueueAvailabilityHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	availability := models.KueueAvailability{
		Enabled:              false,
		SchedulingReady:      false,
		ClusterEnabled:       false,
		NamespaceManaged:     false,
		LocalQueuesAvailable: false,
		// Non-nil so the field marshals to [] rather than null, per the OpenAPI contract.
		LocalQueueNames: []string{},
	}
	if err := app.WriteJSON(w, http.StatusOK, KueueAvailabilityEnvelope{Data: availability}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
