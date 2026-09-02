package api

import (
	"fmt"
	"net/http"

	"github.com/opendatahub-io/data-registry/bff/internal/constants"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/data-registry/bff/internal/models"

	"github.com/julienschmidt/httprouter"
)

type ConnectionsEnvelope Envelope[[]models.ConnectionModel, None]

func (app *App) GetConnectionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace parameter"))
		return
	}

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

	connections, err := app.repositories.Connection.GetConnections(client, ctx, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := ConnectionsEnvelope{
		Data: connections,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
