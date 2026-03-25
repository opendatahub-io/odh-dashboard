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
// Note: all authenticated users can list ModelRegistries regardless of namespace
// permissions, consistent with the RHOAI dashboard behaviour for this resource type.
//
// Error Responses:
//   - 400: Missing RequestIdentity in context
//   - 403: Insufficient permissions to list ModelRegistries
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

	data, err := app.repositories.ModelRegistry.ListModelRegistries(ctx, k8sClient, app.config.MockK8Client, logger)
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
