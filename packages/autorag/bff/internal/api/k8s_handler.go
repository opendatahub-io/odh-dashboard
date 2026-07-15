package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type k8sRepository interface {
	GetFilteredSecrets(k8sService kubernetes.Service, ctx context.Context, namespace string, secretType string) ([]models.SecretListItem, error)
	GetSecretCredentials(k8sService kubernetes.Service, ctx context.Context, namespace, name string) (map[string]string, error)
}

type K8sHandler struct {
	logger     *slog.Logger
	k8sService kubernetes.Service
	repo       k8sRepository
}

type UserEnvelope Envelope[*models.User, None]
type NamespacesEnvelope Envelope[[]models.NamespaceModel, None]
type SecretsEnvelope Envelope[[]models.SecretListItem, None]
type SecretDataEnvelope Envelope[map[string]string, None]

func (h *K8sHandler) UserHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	userInfo, err := h.k8sService.GetUserInfo(r.Context())
	if err != nil {
		switch {
		case errors.Is(err, kubernetes.ErrUnauthorized):
			unauthorizedResponse(h.logger, w, r, "access unauthorized")
			return
		case errors.Is(err, kubernetes.ErrForbidden):
			forbiddenResponse(h.logger, w, r, "insufficient permissions to retrieve user information")
			return
		default:
			serverErrorResponse(h.logger, w, r, err)
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

	err = writeJSON(w, http.StatusOK, userRes, nil)
	if err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

func (h *K8sHandler) GetNamespacesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespaceInfos, err := h.k8sService.GetAccessibleNamespaceInfos(ctx)
	if err != nil {
		switch {
		case errors.Is(err, kubernetes.ErrUnauthorized):
			unauthorizedResponse(h.logger, w, r, "access unauthorized")
			return
		case errors.Is(err, kubernetes.ErrForbidden):
			forbiddenResponse(h.logger, w, r, "insufficient permissions to list namespaces")
			return
		default:
			serverErrorResponse(h.logger, w, r, err)
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

	err = writeJSON(w, http.StatusOK, namespacesEnvelope, nil)
	if err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// GetSecretsHandler retrieves secrets from a namespace with optional filtering based on type.
// Query parameters:
//   - namespace (required): The namespace name to query secrets from
//   - type (optional): Filter type - "storage" for AWS secrets, "ogx" for OGX secrets, or empty for all secrets
//
// Note: namespace is provided via the AttachNamespace middleware
func (h *K8sHandler) GetSecretsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}

	secretType := r.URL.Query().Get("type")
	if secretType != "" && secretType != "storage" && secretType != "ogx" {
		badRequestResponse(h.logger, w, r, "query parameter 'type' must be 'storage', 'ogx', or omitted")
		return
	}

	secrets, err := h.repo.GetFilteredSecrets(h.k8sService, ctx, namespace, secretType)
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
			errorResponse(h.logger, w, r, httpError)
		case errors.Is(err, kubernetes.ErrForbidden):
			forbiddenResponse(h.logger, w, r, "insufficient permissions to access secrets in this namespace")
		case errors.Is(err, kubernetes.ErrUnauthorized):
			unauthorizedResponse(h.logger, w, r, "access unauthorized")
		case errors.Is(err, kubernetes.ErrInvalid):
			httpError := &integrations.HTTPError{
				StatusCode: http.StatusBadRequest,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusBadRequest),
					Message: fmt.Sprintf("invalid request for namespace '%s'", namespace),
				},
			}
			errorResponse(h.logger, w, r, httpError)
		default:
			serverErrorResponse(h.logger, w, r, err)
		}
		return
	}

	secretsEnvelope := SecretsEnvelope{
		Data: secrets,
	}

	err = writeJSON(w, http.StatusOK, secretsEnvelope, nil)
	if err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// GetSecretHandler retrieves OGX credentials from a named secret, base64-encoded.
func (h *K8sHandler) GetSecretHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}

	name := ps.ByName("name")
	if name == "" {
		badRequestResponse(h.logger, w, r, "missing secret name in path")
		return
	}

	data, err := h.repo.GetSecretCredentials(h.k8sService, ctx, namespace, name)
	if err != nil {
		switch {
		case errors.Is(err, kubernetes.ErrNotFound):
			httpError := &integrations.HTTPError{
				StatusCode: http.StatusNotFound,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: fmt.Sprintf("secret '%s' not found in namespace '%s'", name, namespace),
				},
			}
			errorResponse(h.logger, w, r, httpError)
		case errors.Is(err, kubernetes.ErrForbidden):
			forbiddenResponse(h.logger, w, r, "insufficient permissions to access this secret")
		case errors.Is(err, kubernetes.ErrUnauthorized):
			unauthorizedResponse(h.logger, w, r, "access unauthorized")
		case errors.Is(err, kubernetes.ErrInvalid):
			httpError := &integrations.HTTPError{
				StatusCode: http.StatusBadRequest,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusBadRequest),
					Message: fmt.Sprintf("invalid request for secret '%s'", name),
				},
			}
			errorResponse(h.logger, w, r, httpError)
		default:
			serverErrorResponse(h.logger, w, r, err)
		}
		return
	}

	envelope := SecretDataEnvelope{Data: data}

	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")
	err = writeJSON(w, http.StatusOK, envelope, nil)
	if err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}
