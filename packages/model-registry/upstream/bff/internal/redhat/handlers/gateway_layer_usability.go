package handlers

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/constants"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
)

type GatewayLayerUsabilityEnvelope api.Envelope[models.GatewayLayerUsability, api.None]

const gatewayLayerUsabilityPostHandlerID = api.HandlerID("gatewayLayer:usability:post")

func init() {
	api.RegisterHandlerOverride(gatewayLayerUsabilityPostHandlerID, overrideGatewayLayerUsabilityPost)
}

// overrideGatewayLayerUsabilityPost runs the authenticated MCP protocol probe
// as the signed-in user, then persists only the result using the dashboard's
// narrowly scoped service account. This keeps the end-user experience simple
// while preserving authorization and auditability at the BFF boundary.
func overrideGatewayLayerUsabilityPost(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}
		if !requireMcpDeploymentAccess(app, w, r, namespace, "get") {
			return
		}

		identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
		if !ok || identity == nil {
			app.BadRequest(w, r, fmt.Errorf("missing RequestIdentity in context"))
			return
		}

		client, ok := getMcpMutationClient(app, w, r)
		if !ok {
			return
		}

		result, err := redhatrepos.RunGatewayLayerUsabilityProbe(
			r.Context(),
			client,
			namespace,
			identity.Token,
			app.Config().InsecureSkipVerify,
			app.RootCAs(),
		)
		if err != nil {
			app.ServerError(w, r, err)
			return
		}

		if err := app.WriteJSON(w, http.StatusOK, GatewayLayerUsabilityEnvelope{Data: result}, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
}
