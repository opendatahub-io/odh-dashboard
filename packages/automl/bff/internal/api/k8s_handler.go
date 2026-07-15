package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type UserEnvelope Envelope[*models.User, None]
type NamespacesEnvelope Envelope[[]models.NamespaceModel, None]
type SecretsEnvelope Envelope[[]models.SecretListItem, None]

func (app *App) UserHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	userInfo, err := app.k8sService.GetUserInfo(r.Context())
	if err != nil {
		switch {
		case errors.Is(err, kubernetes.ErrUnauthorized):
			app.unauthorizedResponse(w, r, "access unauthorized")
			return
		case errors.Is(err, kubernetes.ErrForbidden):
			app.forbiddenResponse(w, r, "insufficient permissions to retrieve user information")
			return
		default:
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	user := &models.User{
		UserID:       userInfo.UserID,
		ClusterAdmin: userInfo.ClusterAdmin,
	}

	userRes := UserEnvelope{
		Data: user,
	}

	err = app.WriteJSON(w, http.StatusOK, userRes, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetNamespacesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespaceInfos, err := app.k8sService.GetAccessibleNamespaceInfos(ctx)
	if err != nil {
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

// GetSecretsHandler retrieves secrets from a namespace with optional filtering based on type.
func (app *App) GetSecretsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}

	secretType := r.URL.Query().Get("type")
	if secretType != "" && secretType != "storage" {
		app.badRequestResponse(w, r, "query parameter 'type' must be 'storage' or omitted")
		return
	}

	secrets, err := app.repositories.K8s.GetFilteredSecrets(app.k8sService, ctx, namespace, secretType)
	if err != nil {
		switch {
		case errors.Is(err, kubernetes.ErrNotFound):
			app.notFoundResponseWithMessage(w, r, fmt.Sprintf("namespace '%s' does not exist or is not accessible", namespace))
		case errors.Is(err, kubernetes.ErrForbidden):
			app.forbiddenResponse(w, r, "insufficient permissions to access secrets in this namespace")
		case errors.Is(err, kubernetes.ErrUnauthorized):
			app.unauthorizedResponse(w, r, "access unauthorized")
		case errors.Is(err, kubernetes.ErrInvalid), errors.Is(err, kubernetes.ErrBadRequest):
			app.badRequestResponse(w, r, fmt.Sprintf("invalid request for namespace '%s'", namespace))
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	items := make([]models.SecretListItem, 0, len(secrets))
	for _, s := range secrets {
		items = append(items, models.NewSecretListItem(
			s.UUID, s.Name, s.Type, s.Data, s.DisplayName, s.Description,
		))
	}

	err = app.WriteJSON(w, http.StatusOK, SecretsEnvelope{Data: items}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
