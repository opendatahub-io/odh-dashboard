package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
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
// Query parameters:
//   - namespace (required): The namespace name to query secrets from
//   - type (optional): Filter type - "storage" for AWS secrets, "ogx" for OGX secrets, or empty for all secrets
//
// Note: namespace is provided via the AttachNamespace middleware
func (app *App) GetSecretsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
		return
	}

	secretType := r.URL.Query().Get("type")
	if secretType != "" && secretType != "storage" && secretType != "ogx" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'type' must be 'storage', 'ogx', or omitted"))
		return
	}

	secrets, err := app.repositories.K8s.GetFilteredSecrets(app.k8sService, ctx, namespace, secretType)
	if err != nil {
		switch {
		case errors.Is(err, kubernetes.ErrNotFound):
			httpError := &integrations.HTTPError{
				StatusCode: http.StatusNotFound,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: fmt.Sprintf("namespace '%s' does not exist or is not accessible", namespace),
				},
			}
			app.errorResponse(w, r, httpError)
		case errors.Is(err, kubernetes.ErrForbidden):
			app.forbiddenResponse(w, r, "insufficient permissions to access secrets in this namespace")
		case errors.Is(err, kubernetes.ErrUnauthorized):
			app.unauthorizedResponse(w, r, "access unauthorized")
		case errors.Is(err, kubernetes.ErrInvalid):
			httpError := &integrations.HTTPError{
				StatusCode: http.StatusBadRequest,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusBadRequest),
					Message: fmt.Sprintf("invalid request for namespace '%s'", namespace),
				},
			}
			app.errorResponse(w, r, httpError)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	secretsEnvelope := SecretsEnvelope{
		Data: secrets,
	}

	err = app.WriteJSON(w, http.StatusOK, secretsEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
