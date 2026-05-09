package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

type NamespacesEnvelope Envelope[[]models.NamespaceModel, None]

func (app *App) GetNamespacesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*corek8s.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Call autox-core service - single method handles everything
	namespaceInfos, err := app.k8sService.GetNamespaceInfos(ctx, identity)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Convert []NamespaceInfo to []models.NamespaceModel
	namespaces := make([]models.NamespaceModel, len(namespaceInfos))
	for i, info := range namespaceInfos {
		displayName := info.DisplayName
		namespaces[i] = models.NamespaceModel{
			Name:        info.Name,
			DisplayName: &displayName,
		}
	}

	namespacesEnvelope := NamespacesEnvelope{
		Data: namespaces,
	}

	err = app.WriteJSON(w, http.StatusOK, namespacesEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
