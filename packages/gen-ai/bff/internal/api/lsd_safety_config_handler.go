package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// SafetyConfigEnvelope is the response envelope for safety config
type SafetyConfigEnvelope = Envelope[models.SafetyConfigResponse, None]

// LSDSafetyConfigHandler handles GET /gen-ai/api/v1/lsd/safety/config
// Returns the safety configuration (guardrail models and shields) from llama-stack-config ConfigMap
func (app *App) LSDSafetyConfigHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Fetch safety config through repository
	safetyConfig, err := app.repositories.LlamaStackDistribution.GetSafetyConfig(
		client,
		ctx,
		identity,
		namespace,
	)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := SafetyConfigEnvelope{
		Data: *safetyConfig,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
