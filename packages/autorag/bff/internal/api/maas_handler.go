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
	if namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string); !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}
	identity, _ := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
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
	result, err := h.service.ListModels(ctx, token, headers)
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
