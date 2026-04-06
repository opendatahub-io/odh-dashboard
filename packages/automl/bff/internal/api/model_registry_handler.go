package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"
	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
)

type ModelRegistriesEnvelope Envelope[*models.ModelRegistriesData, None]

// GetModelRegistriesHandler handles GET /api/v1/model-registries
//
// Returns all ModelRegistry instances available on the cluster. ModelRegistry CRs
// are cluster-scoped, so no namespace query parameter is required. The response
// includes the registry name, id, readiness, and server URL needed to route
// subsequent model registration calls to the correct registry service.
//
// Authorization: the dynamic list runs under the requesting user's identity
// (Bearer token for user_token auth; SA impersonation for internal auth).
// If the user lacks RBAC permission to list modelregistries.modelregistry.opendatahub.io
// in the rhoai-model-registries namespace, the repository returns ErrModelRegistryForbidden
// and this handler responds with 403. See ListModelRegistries for details.
//
// Error Responses:
//   - 400: Missing RequestIdentity in context
//   - 403: Insufficient permissions to list ModelRegistries (ErrModelRegistryForbidden)
//   - 500: Internal server error
func (app *App) GetModelRegistriesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// In mock mode the repository returns fixtures without touching the cluster,
	// so skip acquiring a real K8s client.
	var k8sClient k8s.KubernetesClientInterface
	if !app.config.MockK8Client {
		var err error
		k8sClient, err = app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
			return
		}
	}

	data, err := app.repositories.ModelRegistry.ListModelRegistries(ctx, k8sClient, identity, app.config.MockK8Client, logger)
	if err != nil {
		if errors.Is(err, repositories.ErrModelRegistryForbidden) {
			app.forbiddenResponse(w, r, "insufficient permissions to list model registries")
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := ModelRegistriesEnvelope{
		Data: data,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
