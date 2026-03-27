package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

// EvalHubServiceHealth is the BFF-level health response for the EvalHub service.
// It always returns HTTP 200 so the frontend can reliably reach a loaded state.
// The Available field indicates whether the EvalHub service is actually reachable.
type EvalHubServiceHealth struct {
	Status    string `json:"status"`
	Available bool   `json:"available"`
}

type EvalHubServiceHealthEnvelope Envelope[EvalHubServiceHealth, None]

func (app *App) EvalHubServiceHealthHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	var serviceHealth EvalHubServiceHealth

	health, err := client.HealthCheck(ctx)
	if err != nil {
		// EvalHub service is unreachable — return 200 with available=false so the
		// frontend always reaches a loaded state and can show the unavailable empty state.
		serviceHealth = EvalHubServiceHealth{Status: "unavailable", Available: false}
	} else {
		serviceHealth = EvalHubServiceHealth{Status: health.Status, Available: true}
	}

	envelope := EvalHubServiceHealthEnvelope{Data: serviceHealth}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
