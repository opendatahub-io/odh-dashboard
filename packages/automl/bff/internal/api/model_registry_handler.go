package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/model-registry/pkg/openapi"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
)

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
func (app *App) GetModelRegistriesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	data, err := app.repositories.ModelRegistry.ListModelRegistries(ctx)
	if err != nil {
		if errors.Is(err, repositories.ErrModelRegistryForbidden) {
			app.forbiddenResponse(w, r, "insufficient permissions to list model registries")
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := ModelRegistriesEnvelope{
		Data: data,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// RegisterModelHandler handles POST /api/v1/model-registries/:registryId/models
func (app *App) RegisterModelHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	registryId := strings.TrimSpace(ps.ByName("registryId"))
	if registryId == "" {
		app.badRequestResponse(w, r, fmt.Errorf("registryId path parameter is required"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRegisterModelRequestBodyBytes)
	var req models.RegisterModelRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			app.payloadTooLargeResponse(w, r, "request body exceeds maximum size")
			return
		}
		app.badRequestResponse(w, r, fmt.Errorf("invalid request body: %w", err))
		return
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		app.badRequestResponse(w, r, fmt.Errorf("request body must contain only a single JSON object"))
		return
	}

	if err := repositories.ValidateRegisterModelRequest(req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	registeredModelID, modelArtifact, err := app.repositories.ModelRegistry.RegisterModel(ctx, registryId, req, namespace)
	if err != nil {
		if errors.Is(err, repositories.ErrModelRegistryForbidden) {
			app.forbiddenResponse(w, r, "insufficient permissions to list model registries")
			return
		}
		if errors.Is(err, repositories.ErrModelRegistryNotFound) {
			app.notFoundResponseWithMessage(w, r, "no model registry found for the given registryId")
			return
		}
		if errors.Is(err, repositories.ErrModelRegistryNotReady) {
			app.serviceUnavailableResponseWithMessage(w, r, err, "model registry is not ready")
			return
		}
		var httpErr *modelregistry.HTTPError
		if errors.As(err, &httpErr) {
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode:    httpErr.StatusCode,
				ErrorResponse: integrations.ErrorResponse{Code: httpErr.Code, Message: httpErr.Message},
			})
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	if modelArtifact == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("model artifact created but response is nil"))
		return
	}

	response := RegisterModelEnvelope{
		Data: &RegisterModelResponseData{
			RegisteredModelID: registeredModelID,
			ModelArtifact:     modelArtifact,
		},
	}
	if err := app.WriteJSON(w, http.StatusCreated, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
