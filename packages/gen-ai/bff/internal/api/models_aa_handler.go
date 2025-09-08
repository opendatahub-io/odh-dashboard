package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
)

type ModelsAAEnvelope Envelope[[]genaiassets.AAModel, None]

func (app *App) ModelsAAHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get namespace from context
	namespace, ok := r.Context().Value(constants.NamespaceQueryParameterKey).(string)
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

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	aaModels, err := app.repositories.AAModels.GetAAModels(client, ctx, identity, namespace)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	aaModelsEnvelope := ModelsAAEnvelope{
		Data: aaModels,
	}
	err = app.WriteJSON(w, http.StatusOK, aaModelsEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
