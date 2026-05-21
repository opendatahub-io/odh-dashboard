package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type NemoGuardrailsStatusEnvelope = Envelope[models.NemoGuardrailsStatus, None]

// NemoGuardrailsStatusHandler handles GET /api/v1/nemo-guardrails/status.
// Returns the phase and readiness of the NemoGuardrails CR in the given namespace.
func (app *App) NemoGuardrailsStatusHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in the context"))
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.handleK8sClientError(w, r, err)
		return
	}

	status, err := app.repositories.NemoGuardrails.GetNemoGuardrailsStatus(k8sClient, ctx, namespace)
	if err != nil {
		app.handleK8sClientError(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, NemoGuardrailsStatusEnvelope{Data: *status}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
