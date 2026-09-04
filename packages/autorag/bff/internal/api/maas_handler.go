package api

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type MaaSHandler struct {
	logger     *slog.Logger
	service    repositories.MaaSModelService
	authMethod string
}

func (h *MaaSHandler) ModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	namespace, namespaceOK := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !namespaceOK || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}
	identity, _ := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	secretNameValues, secretNameSupplied := r.URL.Query()["secretName"]
	secretName := ""
	if secretNameSupplied {
		if len(secretNameValues) != 1 || secretNameValues[0] == "" {
			badRequestResponse(h.logger, w, r, "invalid secretName")
			return
		}
		secretName = secretNameValues[0]
		if err := kubernetes.ValidateResourceName("secretName", secretName); err != nil {
			badRequestResponse(h.logger, w, r, "invalid secretName")
			return
		}
	}
	var token string
	if identity != nil {
		token = identity.Token
	}
	headers := map[string]string{maas.ReturnAllModelsHeader: "true"}
	if identity != nil && h.authMethod == "internal" {
		if userID := r.Header.Get(constants.KubeflowUserIDHeader); userID != "" {
			headers[constants.KubeflowUserIDHeader] = userID
		}
		if groups := r.Header.Get(constants.KubeflowUserGroupsIdHeader); groups != "" {
			headers[constants.KubeflowUserGroupsIdHeader] = groups
		}
	}
	result, err := h.service.ListModels(ctx, namespace, token, headers, secretName)
	if err != nil {
		switch {
		case errors.Is(err, repositories.ErrMaaSUnauthorized):
			unauthorizedResponse(h.logger, w, r, "access unauthorized")
		case errors.Is(err, repositories.ErrMaaSForbidden):
			forbiddenResponse(h.logger, w, r, "access forbidden")
		case errors.Is(err, repositories.ErrMaaSBadRequest):
			badRequestResponse(h.logger, w, r, "MaaS request was invalid")
		case errors.Is(err, repositories.ErrMaaSBadResponse):
			badGatewayResponseWithMessage(h.logger, w, r, err, "invalid response from MaaS BFF")
		case errors.Is(err, repositories.ErrMaaSSecretNotFound):
			notFoundResponse(h.logger, w, r)
		case errors.Is(err, repositories.ErrMaaSSecretForbidden):
			forbiddenResponse(h.logger, w, r, "access forbidden")
		case errors.Is(err, repositories.ErrMaaSCredentialsInvalid):
			badRequestResponse(h.logger, w, r, "invalid MaaS credentials secret")
		case errors.Is(err, repositories.ErrMaaSUnavailable):
			serviceUnavailableResponse(h.logger, w, r, err)
		default:
			serverErrorResponse(h.logger, w, r, err)
		}
		return
	}
	if err := writeJSON(w, http.StatusOK, result, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}
