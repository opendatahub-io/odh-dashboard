package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/model-registry/pkg/openapi"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	"net/http"
	"strings"
)

// maxRequestBodyBytes caps the request body size to 1 MiB for register model requests.
const maxRegisterModelRequestBodyBytes = 1 << 20

// RegisterModelResponseData is the payload returned to the frontend after a
// successful model registration.
type RegisterModelResponseData struct {
	RegisteredModelID string                 `json:"registered_model_id"`
	ModelArtifact     *openapi.ModelArtifact `json:"model_artifact"`
}

type RegisterModelEnvelope Envelope[*RegisterModelResponseData, None]

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
