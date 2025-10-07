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

type LlamaStackDistributionDeleteEnvelope Envelope[*models.LlamaStackDistributionDeleteResponse, None]

func (app *App) LlamaStackDistributionDeleteHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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

	var deleteRequest models.LlamaStackDistributionDeleteRequest
	if r.Body == nil {
		app.badRequestResponse(w, r, fmt.Errorf("request body is required"))
		return
	}
	if err := json.NewDecoder(r.Body).Decode(&deleteRequest); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid JSON in request body: %w", err))
		return
	}

	// Validate that the lsd name which is to be deleted is not empty
	if len(deleteRequest.Name) == 0 {
		app.badRequestResponse(w, r, fmt.Errorf("lsd name cannot be empty"))
		return
	}

	response, err := app.repositories.LlamaStackDistribution.DeleteLlamaStackDistribution(client, ctx, identity, namespace, deleteRequest.Name)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Send success response
	envelope := LlamaStackDistributionDeleteEnvelope{
		Data: response,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(envelope); err != nil {
		app.logger.Error("error encoding response", "error", err)
	}
}
