package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/model-registry/pkg/openapi"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

type modelRegistryRepository interface {
	ListModelRegistries(ctx context.Context) (*models.ModelRegistriesData, error)
	RegisterModel(ctx context.Context, registryUID string, req models.RegisterModelRequest, namespace string) (string, *openapi.ModelArtifact, error)
}

type ModelRegistryHandler struct {
	logger *slog.Logger
	repo   modelRegistryRepository
}

// maxRegisterModelRequestBodyBytes caps the request body size to 1 MiB for register model requests.
const maxRegisterModelRequestBodyBytes = 1 << 20

type ModelRegistriesEnvelope Envelope[*models.ModelRegistriesData, None]

// RegisterModelResponseData is the payload returned to the frontend after a
// successful model registration.
type RegisterModelResponseData struct {
	RegisteredModelID string                 `json:"registered_model_id"`
	ModelArtifact     *openapi.ModelArtifact `json:"model_artifact"`
}

type RegisterModelEnvelope Envelope[*RegisterModelResponseData, None]

// GetModelRegistriesHandler handles GET /api/v1/model-registries
//
// Returns all ModelRegistry instances available on the cluster. ModelRegistry CRs
// are cluster-scoped, so no namespace query parameter is required. The response
// includes the registry name, id, readiness, and server URL needed to route
// subsequent model registration calls to the correct registry service.
//
// Authorization: the dynamic list runs under the requesting user's identity
// (Bearer token for user_token auth; SA impersonation for internal auth).
// If the user lacks RBAC permission to list modelregistries.modelregistry.opendatahub.io
// in the rhoai-model-registries namespace, the repository returns ErrModelRegistryForbidden
// and this handler responds with 403. See ListModelRegistries for details.
//
// Error Responses:
//   - 400: Missing RequestIdentity in context
//   - 403: Insufficient permissions to list ModelRegistries (ErrModelRegistryForbidden)
//   - 500: Internal server error
func (h *ModelRegistryHandler) GetModelRegistriesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	data, err := h.repo.ListModelRegistries(ctx)
	if err != nil {
		if errors.Is(err, repositories.ErrModelRegistryForbidden) {
			forbiddenResponse(h.logger, w, r, "insufficient permissions to list model registries")
			return
		}
		serverErrorResponse(h.logger, w, r, err)
		return
	}

	envelope := ModelRegistriesEnvelope{
		Data: data,
	}

	if err := writeJSON(w, http.StatusOK, envelope, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}

// RegisterModelHandler handles POST /api/v1/model-registries/:registryId/models
func (h *ModelRegistryHandler) RegisterModelHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	registryId := strings.TrimSpace(ps.ByName("registryId"))
	if registryId == "" {
		badRequestResponse(h.logger, w, r, "registryId path parameter is required")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRegisterModelRequestBodyBytes)
	var req models.RegisterModelRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			payloadTooLargeResponse(h.logger, w, r, "request body exceeds maximum size")
			return
		}
		badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid request body: %s", err))
		return
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		badRequestResponse(h.logger, w, r, "request body must contain only a single JSON object")
		return
	}

	if err := repositories.ValidateRegisterModelRequest(req); err != nil {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	registeredModelID, modelArtifact, err := h.repo.RegisterModel(ctx, registryId, req, namespace)
	if err != nil {
		if errors.Is(err, repositories.ErrModelRegistryForbidden) {
			forbiddenResponse(h.logger, w, r, "insufficient permissions to list model registries")
			return
		}
		if errors.Is(err, repositories.ErrModelRegistryNotFound) {
			notFoundResponseWithMessage(h.logger, w, r, "no model registry found for the given registryId")
			return
		}
		if errors.Is(err, repositories.ErrModelRegistryNotReady) {
			serviceUnavailableResponseWithMessage(h.logger, w, r, err, "model registry is not ready")
			return
		}
		if errors.Is(err, pipelines.ErrNoDSPAFound) || errors.Is(err, pipelines.ErrDSPANotReady) {
			serviceUnavailableResponseWithMessage(h.logger, w, r, err,
				"DSPA object storage discovery unavailable; cannot construct artifact URI - ensure a DSPipelineApplication with external storage is configured in this namespace")
			return
		}
		var httpErr *modelregistry.HTTPError
		if errors.As(err, &httpErr) {
			errorResponse(h.logger, w, r, &integrations.HTTPError{
				StatusCode:    httpErr.StatusCode,
				ErrorResponse: integrations.ErrorResponse{Code: httpErr.Code, Message: httpErr.Message},
			})
			return
		}
		serverErrorResponse(h.logger, w, r, err)
		return
	}

	if modelArtifact == nil {
		serverErrorResponse(h.logger, w, r, fmt.Errorf("model artifact created but response is nil"))
		return
	}

	response := RegisterModelEnvelope{
		Data: &RegisterModelResponseData{
			RegisteredModelID: registeredModelID,
			ModelArtifact:     modelArtifact,
		},
	}
	if err := writeJSON(w, http.StatusCreated, response, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
	}
}
