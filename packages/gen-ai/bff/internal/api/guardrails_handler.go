package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// GuardrailsStatusEnvelope is the response envelope for guardrails status
type GuardrailsStatusEnvelope = Envelope[models.GuardrailsStatus, None]

// GuardrailsStatusHandler handles GET /gen-ai/api/v1/guardrails/status?namespace=<namespace>
// Returns status of the "custom-guardrails" CR from the specified namespace
func (app *App) GuardrailsStatusHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Get namespace from context
	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in the context"))
		return
	}

	// Get the request identity from context
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Get Kubernetes client
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.handleK8sClientError(w, r, err)
		return
	}

	// Fetch guardrails status from the specified namespace
	status, err := app.repositories.Guardrails.GetGuardrailsStatus(k8sClient, ctx, identity, namespace)
	if err != nil {
		app.handleK8sClientError(w, r, err)
		return
	}

	response := GuardrailsStatusEnvelope{
		Data: *status,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
