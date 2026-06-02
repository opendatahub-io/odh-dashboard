package api

import (
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type NamespacesEnvelope Envelope[[]models.NamespaceModel, None]

func (app *App) GetNamespacesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Call autox-core service - single method handles permission filtering and display names
	namespaceInfos, err := app.k8sService.GetAccessibleNamespaceInfos(ctx)
	if err != nil {
		// Check for specific domain errors from autox-core
		switch {
		case errors.Is(err, kubernetes.ErrUnauthorized):
			app.unauthorizedResponse(w, r, "access unauthorized")
			return
		case errors.Is(err, kubernetes.ErrForbidden):
			app.forbiddenResponse(w, r, "insufficient permissions to list namespaces")
			return
		default:
			app.serverErrorResponse(w, r, err)
			return
		}
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
