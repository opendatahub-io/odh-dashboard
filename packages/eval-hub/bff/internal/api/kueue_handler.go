package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	kubernetes "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type KueueAvailabilityEnvelope Envelope[models.KueueAvailability, None]

func (app *App) KueueAvailabilityHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}
	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	availability, err := client.GetKueueAvailability(ctx, identity, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kueue availability: %w", err))
		return
	}
	if err := app.WriteJSON(w, http.StatusOK, KueueAvailabilityEnvelope{Data: *availability}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
