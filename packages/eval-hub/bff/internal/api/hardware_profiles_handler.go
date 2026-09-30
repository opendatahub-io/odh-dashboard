package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	kubernetes "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type HardwareProfilesEnvelope Envelope[models.HardwareProfilesResponse, None]

func (app *App) HardwareProfilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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
	profiles, err := client.ListHardwareProfiles(ctx, identity, namespace, app.hardwareProfilesNamespace())
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list HardwareProfiles: %w", err))
		return
	}
	if err := app.WriteJSON(w, http.StatusOK, HardwareProfilesEnvelope{Data: *profiles}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) hardwareProfilesNamespace() string {
	if app.config.HardwareProfilesNamespace != "" {
		return app.config.HardwareProfilesNamespace
	}
	return app.dashboardNamespace
}
