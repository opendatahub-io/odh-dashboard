package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type NamespaceEnvelope Envelope[[]models.NamespaceModel, None]

func (app *App) GetNamespaceHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {

	ctx := r.Context()
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

	namespaces, err := app.repositories.Namespace.GetNamespaces(client, ctx, identity)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	namespaceEnvelope := NamespaceEnvelope{
		Data: namespaces,
	}
	err = app.WriteJSON(w, http.StatusOK, namespaceEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
