package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"k8s.io/apimachinery/pkg/util/validation"
)

// The access review the gateway discovery gates on: the caller may deploy an
// LLMInferenceService in the namespace (model-serving-api's check).
const (
	gatewayDiscoveryAccessVerb     = "create"
	gatewayDiscoveryAccessGroup    = "serving.kserve.io"
	gatewayDiscoveryAccessResource = "llminferenceservices"
)

// GatewayDiscoveryHandler handles GET /api/service/model-serving/api/v1/gateways
// on xKS, natively in place of the model-serving-api proxy. The request and
// response match model-serving-api, so the frontend calls the same URL on both
// platforms.
//
// Every Kubernetes call runs as the caller (docs/model-serving-xks.md): a
// SelfSubjectAccessReview for creating LLMInferenceServices in the namespace,
// then the Gateway list and, when a listener selects namespaces by label, the
// namespace read. A caller who may not deploy in the namespace gets an empty
// list, as from model-serving-api. A caller who may deploy but not list
// Gateways gets the API server's 403.
func (app *App) GatewayDiscoveryHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, errors.New("missing required query parameter: namespace"))
		return
	}
	if errs := validation.IsDNS1123Label(namespace); len(errs) > 0 {
		app.badRequestResponse(w, r, errors.New("invalid namespace: must be an RFC 1123 label"))
		return
	}

	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, errors.New("missing request identity"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get kubernetes client: %w", err))
		return
	}
	allowed, err := client.CheckAccess(ctx, identity, gatewayDiscoveryAccessVerb, gatewayDiscoveryAccessGroup, gatewayDiscoveryAccessResource, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to check deployment permissions: %w", err))
		return
	}

	response := models.GatewaysResponse{Gateways: []models.GatewayRef{}}
	if allowed {
		gateways, err := app.repositories.GatewayDiscovery.Discover(ctx, namespace)
		if err != nil {
			app.k8sErrorResponse(w, r, err)
			return
		}
		response.Gateways = gateways
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
