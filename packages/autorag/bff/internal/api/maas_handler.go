package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	maas "github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type maasRepository interface {
	GetMaaSModels(ctx context.Context, namespace, secretName string) (*models.MaaSModelsData, error)
}

type MaaSHandler struct {
	logger *slog.Logger
	repo   maasRepository
}

type MaaSModelsEnvelope Envelope[*models.MaaSModelsData, None]

func (h *MaaSHandler) MaaSModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context - ensure AttachNamespace middleware is used first")
		return
	}

	secretName := r.URL.Query().Get("secretName")
	if secretName == "" {
		badRequestResponse(h.logger, w, r, "missing required query parameter: secretName")
		return
	}
	if err := kubernetes.ValidateResourceName("secretName", secretName); err != nil {
		badRequestResponse(h.logger, w, r, "invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)")
		return
	}

	data, err := h.repo.GetMaaSModels(ctx, namespace, secretName)
	if err != nil {
		h.handleMaaSError(w, r, err)
		return
	}
	if err := writeJSON(w, http.StatusOK, MaaSModelsEnvelope{Data: data}, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

func (h *MaaSHandler) handleMaaSError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, kubernetes.ErrNotFound):
		notFoundResponseWithMessage(h.logger, w, r, err.Error())
	case errors.Is(err, kubernetes.ErrForbidden):
		forbiddenResponse(h.logger, w, r, err.Error())
	case errors.Is(err, kubernetes.ErrUnauthorized):
		unauthorizedResponse(h.logger, w, r, err.Error())
	case errors.Is(err, kubernetes.ErrInvalid), errors.Is(err, kubernetes.ErrBadRequest), errors.Is(err, repositories.ErrMaaSCredentialValidation):
		badRequestResponse(h.logger, w, r, err.Error())
	default:
		var maaSErr *maas.MaaSError
		if !errors.As(err, &maaSErr) {
			serverErrorResponse(h.logger, w, r, err)
			return
		}
		h.handleMaaSClientError(w, r, maaSErr)
	}
}

func (h *MaaSHandler) handleMaaSClientError(w http.ResponseWriter, r *http.Request, err *maas.MaaSError) {
	statusCode := err.StatusCode
	if statusCode == 0 {
		statusCode = http.StatusInternalServerError
	}
	if statusCode >= http.StatusInternalServerError {
		logError(h.logger, r, err)
	}

	message := "The server encountered a problem and could not process your request"
	code := "internal_server_error"
	switch statusCode {
	case http.StatusBadRequest:
		code, message = "bad_request", err.Message
	case http.StatusUnauthorized:
		code, message = "unauthorized", err.Message
	case http.StatusForbidden:
		code, message = "forbidden", err.Message
	case http.StatusNotFound:
		code, message = "not_found", err.Message
	case http.StatusBadGateway:
		code = "bad_gateway"
	case http.StatusServiceUnavailable:
		code = "service_unavailable"
	default:
		if statusCode < http.StatusInternalServerError {
			code = "maas_error"
			message = fmt.Sprintf("MaaS client error (HTTP %d)", statusCode)
		}
	}

	errorResponse(h.logger, w, r, &integrations.HTTPError{
		StatusCode: statusCode,
		ErrorResponse: integrations.ErrorResponse{
			Code:    code,
			Message: message,
		},
	})
}
