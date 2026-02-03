package api

import (
	"fmt"
	"net/http"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/constants"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"

	"github.com/julienschmidt/httprouter"
)

type NamespacesEnvelope Envelope[[]models.NamespaceModel, None]

func (app *App) GetNamespacesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {

	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	namespaces, err := app.repositories.Namespace.GetNamespaces(client, ctx, identity)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	namespacesEnvelope := NamespacesEnvelope{
		Data: namespaces,
	}

	err = app.WriteJSON(w, http.StatusOK, namespacesEnvelope, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
