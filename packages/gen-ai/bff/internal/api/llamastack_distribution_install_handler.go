package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type LlamaStackDistributionInstallEnvelope Envelope[*models.LlamaStackDistributionInstallModel, None]

func (app *App) LlamaStackDistributionInstallHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Get namespace from context
	namespace, ok := r.Context().Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in the context"))
		return
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	modelName := r.URL.Query().Get("modelName")
	if modelName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: modelName"))
		return
	}

	lsdModel, err := app.repositories.LlamaStackDistribution.InstallLlamaStackDistribution(
		client,
		ctx,
		identity,
		namespace,
		modelName,
	)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	lsdEnvelope := LlamaStackDistributionInstallEnvelope{
		Data: lsdModel,
	}

	err = app.WriteJSON(w, http.StatusOK, lsdEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
