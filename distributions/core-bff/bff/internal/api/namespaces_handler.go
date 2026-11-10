package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
	"k8s.io/apimachinery/pkg/util/validation"
)

type NamespacesEnvelope Envelope[[]models.NamespaceModel, None]
type NamespaceEnvelope Envelope[models.NamespaceModel, None]

func (app *App) namespaceErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, repositories.ErrNamespaceAccessDenied) {
		app.forbiddenResponse(w, r, err)
		return
	}
	app.serverErrorResponse(w, r, err)
}

func (app *App) GetNamespacesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	namespaces, err := app.repositories.Namespace.GetNamespaces(ctx, client, identity)
	if err != nil {
		app.namespaceErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, NamespacesEnvelope{Data: namespaces}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetNamespaceHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	name := ps.ByName("name")
	if len(validation.IsDNS1123Label(name)) != 0 {
		app.badRequestResponse(w, r, fmt.Errorf("invalid namespace name"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	ns, err := app.repositories.Namespace.GetNamespace(ctx, client, identity, name)
	if err != nil {
		app.namespaceErrorResponse(w, r, err)
		return
	}
	if err := app.WriteJSON(w, http.StatusOK, NamespaceEnvelope{Data: ns}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
