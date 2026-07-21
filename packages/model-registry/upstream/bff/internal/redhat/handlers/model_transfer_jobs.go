package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/constants"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
)

const (
	// modelTransferJobListHandlerID must match the HandlerID string used in upstream's
	// route registration (api.HandlerIDModelTransferJobList = "modelTransferJobs:list").
	modelTransferJobListHandlerID = api.HandlerID("modelTransferJobs:list")
)

// modelTransferJobsRepository defines the interface for the downstream
// project-scoped job listing logic. The handler delegates all K8s
// operations to this repository.
type modelTransferJobsRepository interface {
	CreateScopedClient(
		ctx context.Context,
		client k8s.KubernetesClientInterface,
		bearerToken string,
	) (k8s.KubernetesClientInterface, error)
}

var newModelTransferJobsRepository = func(app *api.App) modelTransferJobsRepository {
	if app == nil {
		return redhatrepos.NewProjectScopedJobsRepository(nil)
	}
	return redhatrepos.NewProjectScopedJobsRepository(app.Logger())
}

func init() {
	api.RegisterHandlerOverride(modelTransferJobListHandlerID, overrideModelTransferJobsList)
}

// overrideModelTransferJobsList provides the downstream implementation for listing model transfer jobs.
// Instead of requiring cluster-wide job list permission (metav1.NamespaceAll), it uses the OpenShift
// Projects API to discover namespaces accessible to the user, then fetches jobs from each namespace
// in parallel. This ensures non-admin users can see their transfer jobs without cluster-wide RBAC.
func overrideModelTransferJobsList(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	repo := newModelTransferJobsRepository(app)

	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.BadRequest(w, r, fmt.Errorf("missing namespace in the context"))
			return
		}

		client, ok := getKubernetesClient(app, w, r)
		if !ok {
			return
		}

		modelRegistryID := ps.ByName(api.ModelRegistryId)
		if modelRegistryID == "" {
			app.BadRequest(w, r, fmt.Errorf("model registry name is required"))
			return
		}

		bearerToken, err := client.BearerToken()
		if err != nil {
			app.ServerError(w, r, fmt.Errorf("failed to get bearer token: %w", err))
			return
		}

		scopedClient, err := repo.CreateScopedClient(ctx, client, bearerToken)
		if err != nil {
			if errors.Is(err, redhatrepos.ErrProjectsAPIUnavailable) {
				app.Logger().Warn("OpenShift Projects API unavailable, falling back to default handler",
					"error", err)
				buildDefault()(w, r, ps)
				return
			}
			app.ServerError(w, r, fmt.Errorf("failed to create project-scoped client: %w", err))
			return
		}

		// Use the upstream repository for the full job conversion/enrichment logic.
		// Pass a non-empty jobNamespace to skip the repository's cluster-wide permission check.
		// The projectScopedClient already scopes job listing to the user's accessible namespaces,
		// so the upstream permission gate is unnecessary. The value is ignored by the scoped client.
		transferJobs, err := app.Repositories().ModelRegistry.GetAllModelTransferJobs(ctx, scopedClient, namespace, modelRegistryID, "project-scoped")
		if err != nil {
			app.ServerError(w, r, err)
			return
		}

		response := api.ModelTransferJobListEnvelope{Data: transferJobs}
		if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
			app.ServerError(w, r, err)
		}
	}
}
