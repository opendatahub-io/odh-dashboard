package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	helper "github.com/opendatahub-io/eval-hub/bff/internal/helpers"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type EvalHubCRStatusEnvelope Envelope[*models.EvalHubCRStatus, None]

// EvalHubCRStatusHandler returns the status of the EvalHub CR.
//
// It first attempts to find the CR in the user-selected namespace (from ?namespace=).
// If not found there, it falls back to SA-based cluster-wide discovery so that tenant
// namespaces can always find the CR regardless of where it was created.
func (app *App) EvalHubCRStatusHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in the context"))
		return
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	crStatus, err := app.repositories.EvalHubStatus.GetEvalHubCRStatus(client, ctx, identity, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// If the CR is not in the user's namespace, fall back to cluster-wide SA discovery
	// so tenant namespaces can see the CR status regardless of where it was created.
	if crStatus == nil && app.crDiscoverer != nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Debug("EvalHub CR not found in user namespace, falling back to cluster-wide SA discovery",
			"namespace", namespace)

		crStatus, err = app.crDiscoverer.DiscoverCRStatus(ctx)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("cluster-wide EvalHub CR discovery failed: %w", err))
			return
		}
	}

	envelope := EvalHubCRStatusEnvelope{Data: crStatus}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
