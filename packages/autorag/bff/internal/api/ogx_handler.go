package api

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type OGXHandler struct {
	logger *slog.Logger
	repo   *repositories.OGXRepository
}

type OGXModelsEnvelope Envelope[*models.OGXModelsData, None]
type OGXVectorStoresEnvelope Envelope[*models.OGXVectorStoreProvidersData, None]

// OGXModelsHandler handles GET /api/v1/ogx/models
// Returns all available models from Open GenAI Stack Distribution.
func (h *OGXHandler) OGXModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	secretName := r.URL.Query().Get("secretName")
	if secretName == "" {
		badRequestResponse(h.logger, w, r, "missing required query parameter: secretName")
		return
	}
	if err := kubernetes.ValidateResourceName("secretName", secretName); err != nil {
		badRequestResponse(h.logger, w, r, "invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)")
		return
	}

	modelsData, err := h.repo.GetOGXModels(ctx, namespace, secretName)
	if err != nil {
		h.handleOGXOrK8sError(w, r, err)
		return
	}

	ogxModelsEnvelope := OGXModelsEnvelope{
		Data: modelsData,
	}

	err = writeJSON(w, http.StatusOK, ogxModelsEnvelope, nil)
	if err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// OGXVectorStoresHandler handles GET /api/v1/ogx/vector-stores
// Returns available vector store providers from Open GenAI Stack Distribution,
// filtered to only include providers with the vector_io API type.
func (h *OGXHandler) OGXVectorStoresHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	secretName := r.URL.Query().Get("secretName")
	if secretName == "" {
		badRequestResponse(h.logger, w, r, "missing required query parameter: secretName")
		return
	}
	if err := kubernetes.ValidateResourceName("secretName", secretName); err != nil {
		badRequestResponse(h.logger, w, r, "invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)")
		return
	}

	providersData, err := h.repo.GetOGXVectorStoreProviders(ctx, namespace, secretName)
	if err != nil {
		h.handleOGXOrK8sError(w, r, err)
		return
	}

	envelope := OGXVectorStoresEnvelope{
		Data: providersData,
	}

	err = writeJSON(w, http.StatusOK, envelope, nil)
	if err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// --- OGX Error Helpers ---

// handleOGXOrK8sError handles errors that may originate from either the OGX client
// (when calling OGX APIs) or the Kubernetes secret lookup performed inside the repository.
// It checks for K8s domain errors first (NotFoundError, ForbiddenError, UnauthorizedError,
// ValidationError), then falls back to OGX-specific error handling.
func (h *OGXHandler) handleOGXOrK8sError(w http.ResponseWriter, r *http.Request, err error) {
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
	if errors.Is(err, kubernetes.ErrAmbiguousSecretKey) || errors.Is(err, repositories.ErrOGXCredentialValidation) {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}
	// Delegate to OGX-specific error handling for OGX client errors
	h.handleOGXClientError(w, r, err)
}

// handleOGXClientError maps Open GenAI Stack client errors to appropriate HTTP status codes and sends the response.
// Uses errors.As to unwrap the error chain, since repository errors are wrapped with fmt.Errorf("...: %w", err).
func (h *OGXHandler) handleOGXClientError(w http.ResponseWriter, r *http.Request, err error) {
	var ogxErr *ogx.OGXError
	if errors.As(err, &ogxErr) {
		statusCode := ogxErr.StatusCode
		if statusCode == 0 {
			statusCode = h.getDefaultStatusCodeForOGXClientError(ogxErr.Code)
		}

		if statusCode >= 500 {
			logError(h.logger, r, err)
		}

		httpError := h.mapOGXClientErrorToHTTPError(ogxErr, statusCode)
		errorResponse(h.logger, w, r, httpError)
		return
	}

	// Fall back to generic error for unknown error types
	serverErrorResponse(h.logger, w, r, err)
}

// getDefaultStatusCodeForOGXClientError returns default HTTP status codes for OGXError codes
func (h *OGXHandler) getDefaultStatusCodeForOGXClientError(errorCode string) int {
	switch errorCode {
	case ogx.ErrCodeInvalidRequest:
		return http.StatusBadRequest
	case ogx.ErrCodeUnauthorized:
		return http.StatusUnauthorized
	case ogx.ErrCodeNotFound:
		return http.StatusNotFound
	case ogx.ErrCodeConnectionFailed:
		return http.StatusBadGateway
	case ogx.ErrCodeTimeout, ogx.ErrCodeServerUnavailable:
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

// mapOGXClientErrorToHTTPError converts OGXError to HTTP error with appropriate codes
func (h *OGXHandler) mapOGXClientErrorToHTTPError(lsErr *ogx.OGXError, statusCode int) *integrations.HTTPError {
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
			code = "ogx_error"
			message = fmt.Sprintf("Open GenAI Stack client error (HTTP %d): %s", statusCode, lsErr.Message)
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
