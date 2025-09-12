package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type LlamaStackDistributionInstallEnvelope Envelope[*models.LlamaStackDistributionInstallModel, None]

func (app *App) LlamaStackDistributionInstallHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := r.Context().Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in the context"))
		return
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var installRequest models.LlamaStackDistributionInstallRequest
	if r.Body == nil {
		app.badRequestResponse(w, r, fmt.Errorf("request body is required"))
		return
	}
	if err := json.NewDecoder(r.Body).Decode(&installRequest); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid JSON in request body: %w", err))
		return
	}

	// Validate that models list is not empty
	if len(installRequest.Models) == 0 {
		app.badRequestResponse(w, r, fmt.Errorf("models list cannot be empty"))
		return
	}

	// Extract the list of models from the request
	modelsToInstall := installRequest.Models

	response, err := app.repositories.LlamaStackDistribution.InstallLlamaStackDistribution(client, ctx, identity, namespace, modelsToInstall)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	lsdEnvelope := LlamaStackDistributionInstallEnvelope{
		Data: response,
	}

	if err := app.WriteJSON(w, http.StatusOK, lsdEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
