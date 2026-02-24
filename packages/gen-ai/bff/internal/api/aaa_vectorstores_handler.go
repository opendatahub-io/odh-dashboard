package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type VectorStoresAAEnvelope = Envelope[[]models.ExternalVectorStoreSummary, None]

func (app *App) VectorStoresAAHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("namespace parameter is required"))
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	result, err := app.repositories.ExternalVectorStores.ListExternalVectorStores(ctx, k8sClient, identity, namespace)
	if err != nil {
		app.handleConfigMapError(w, r, err, constants.VectorStoresConfigMapName, namespace)
		return
	}

	stores := make([]models.ExternalVectorStoreSummary, 0, len(result.VectorStores))
	for _, entry := range result.VectorStores {
		stores = append(stores, entry.ToSummary())
	}

	response := VectorStoresAAEnvelope{
		Data: stores,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
