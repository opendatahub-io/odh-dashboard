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
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type maasRepository interface {
	GetMaaSModels(ctx context.Context, namespace, secretName string) (*models.MaaSModelsData, error)
	GetMaaSVectorStoreProviders(ctx context.Context, namespace, secretName string) (*models.MaaSVectorStoreProvidersData, error)
}

type MaaSHandler struct {
	logger *slog.Logger
	repo   maasRepository
}

type MaaSModelsEnvelope Envelope[*models.MaaSModelsData, None]
type MaaSVectorStoresEnvelope Envelope[*models.MaaSVectorStoreProvidersData, None]

// MaaSModelsHandler handles GET /api/v1/maas/models
// Returns all available models from Models as a Service Distribution.
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

	modelsData, err := h.repo.GetMaaSModels(ctx, namespace, secretName)
	if err != nil {
		h.handleMaaSOrK8sError(w, r, err)
		return
	}

	maasModelsEnvelope := MaaSModelsEnvelope{
		Data: modelsData,
	}

	err = writeJSON(w, http.StatusOK, maasModelsEnvelope, nil)
	if err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// MaaSVectorStoresHandler handles GET /api/v1/maas/vector-stores
// Returns available vector store providers from Models as a Service Distribution,
// filtered to only include providers with the vector_io API type.
func (h *MaaSHandler) MaaSVectorStoresHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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

	providersData, err := h.repo.GetMaaSVectorStoreProviders(ctx, namespace, secretName)
	if err != nil {
		h.handleMaaSOrK8sError(w, r, err)
		return
	}

	envelope := MaaSVectorStoresEnvelope{
		Data: providersData,
	}

	err = writeJSON(w, http.StatusOK, envelope, nil)
	if err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// --- MaaS Error Helpers ---

// handleMaaSOrK8sError handles errors that may originate from either the MaaS client
// (when calling MaaS APIs) or the Kubernetes secret lookup performed inside the repository.
// It checks for K8s domain errors first (NotFoundError, ForbiddenError, UnauthorizedError,
// ValidationError), then falls back to MaaS-specific error handling.
func (h *MaaSHandler) handleMaaSOrK8sError(w http.ResponseWriter, r *http.Request, err error) {
	// Handle autox-core Kubernetes errors produced by k8sService.GetSecret
	if errors.Is(err, kubernetes.ErrNotFound) {
		notFoundResponseWithMessage(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, kubernetes.ErrForbidden) {
		forbiddenResponse(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, kubernetes.ErrUnauthorized) {
		unauthorizedResponse(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, kubernetes.ErrInvalid) || errors.Is(err, kubernetes.ErrBadRequest) {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}
	if errors.Is(err, kubernetes.ErrAmbiguousSecretKey) || errors.Is(err, repositories.ErrMaaSCredentialValidation) {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}
	// Delegate to MaaS-specific error handling for MaaS client errors
	h.handleMaaSClientError(w, r, err)
}

// handleMaaSClientError maps Models as a Service client errors to appropriate HTTP status codes and sends the response.
// Uses errors.As to unwrap the error chain, since repository errors are wrapped with fmt.Errorf("...: %w", err).
func (h *MaaSHandler) handleMaaSClientError(w http.ResponseWriter, r *http.Request, err error) {
	var maasErr *maas.MaaSError
	if errors.As(err, &maasErr) {
		statusCode := maasErr.StatusCode
		if statusCode == 0 {
			statusCode = h.getDefaultStatusCodeForMaaSClientError(maasErr.Code)
		}

		if statusCode >= 500 {
			logError(h.logger, r, err)
		}

		httpError := h.mapMaaSClientErrorToHTTPError(maasErr, statusCode)
		errorResponse(h.logger, w, r, httpError)
		return
	}

	// Fall back to generic error for unknown error types
	serverErrorResponse(h.logger, w, r, err)
}

// getDefaultStatusCodeForMaaSClientError returns default HTTP status codes for MaaSError codes
func (h *MaaSHandler) getDefaultStatusCodeForMaaSClientError(errorCode string) int {
	switch errorCode {
	case maas.ErrCodeInvalidRequest:
		return http.StatusBadRequest
	case maas.ErrCodeUnauthorized:
		return http.StatusUnauthorized
	case maas.ErrCodeNotFound:
		return http.StatusNotFound
	case maas.ErrCodeConnectionFailed:
		return http.StatusBadGateway
	case maas.ErrCodeTimeout, maas.ErrCodeServerUnavailable:
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

// mapMaaSClientErrorToHTTPError converts MaaSError to HTTP error with appropriate codes
func (h *MaaSHandler) mapMaaSClientErrorToHTTPError(lsErr *maas.MaaSError, statusCode int) *integrations.HTTPError {
	var code string
	var message string

	switch statusCode {
	case http.StatusBadRequest:
		code = "bad_request"
		message = lsErr.Message
	case http.StatusUnauthorized:
		code = "unauthorized"
		message = lsErr.Message
	case http.StatusNotFound:
		code = "not_found"
		message = lsErr.Message
	case http.StatusServiceUnavailable:
		code = "service_unavailable"
		message = "The server encountered a problem and could not process your request"
	case http.StatusBadGateway:
		code = "bad_gateway"
		message = "The server encountered a problem and could not process your request"
	case http.StatusInternalServerError:
		code = "internal_server_error"
		message = "The server encountered a problem and could not process your request"
	default:
		if statusCode >= 500 {
			code = "server_error"
			message = "The server encountered a problem and could not process your request"
		} else {
			code = "maas_error"
			message = fmt.Sprintf("Models as a Service client error (HTTP %d): %s", statusCode, lsErr.Message)
		}
	}

	return &integrations.HTTPError{
		StatusCode: statusCode,
		ErrorResponse: integrations.ErrorResponse{
			Code:    code,
			Message: message,
		},
	}
}
