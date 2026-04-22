package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type NemoGuardrailsInitEnvelope Envelope[*models.NemoGuardrailsInitModel, None]

// NemoGuardrailsInitHandler handles POST /api/v1/nemo-guardrails/init.
// It creates per-model ConfigMaps and a NemoGuardrails CR for the given models,
// using the same model list format as the LSD install endpoint.
func (app *App) NemoGuardrailsInitHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in the context"))
		return
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// MaaS client can be nil if MaaS is disabled — validated below if MaaS models are requested
	maasClient, _ := ctx.Value(constants.MaaSClientKey).(maas.MaaSClientInterface)

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if r.Body == nil {
		app.badRequestResponse(w, r, fmt.Errorf("request body is required"))
		return
	}

	var initRequest models.NemoGuardrailsInitRequest
	if err := json.NewDecoder(r.Body).Decode(&initRequest); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid JSON in request body: %w", err))
		return
	}

	if len(initRequest.Models) == 0 {
		app.badRequestResponse(w, r, fmt.Errorf("models list cannot be empty"))
		return
	}

	// Validate MaaS client is available if any MaaS models are requested
	for _, model := range initRequest.Models {
		if model.ModelSourceType == models.ModelSourceTypeMaaS {
			if maasClient == nil {
				app.badRequestResponse(w, r, fmt.Errorf("MaaS client not available but MaaS models were requested. Ensure MaaS is enabled and configured"))
				return
			}
			break
		}
	}

	result, err := app.repositories.NemoGuardrails.InitNemoGuardrails(client, ctx, identity, namespace, initRequest.Models, maasClient)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	envelope := NemoGuardrailsInitEnvelope{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
