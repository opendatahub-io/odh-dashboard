package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"

	"github.com/opendatahub-io/gen-ai/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

type OGXServerStatusEnvelope Envelope[*models.OGXServerModel, None]

// LlamaStackDistributionStatusHandler handles requests for OGX server (LSD) status.
func (app *App) LlamaStackDistributionStatusHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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

	// Get OGX server status
	ogxModel, err := app.repositories.OGXServer.GetOGXServerStatus(
		client,
		ctx,
		identity,
		namespace,
	)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			app.notFoundResponse(w, r)
			return
		}
		app.badRequestResponse(w, r, err)
		return
	}

	ogxEnvelope := OGXServerStatusEnvelope{
		Data: ogxModel,
	}

	err = app.WriteJSON(w, http.StatusOK, ogxEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
