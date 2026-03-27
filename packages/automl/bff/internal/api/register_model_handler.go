package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/model-registry/pkg/openapi"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
)

// maxRequestBodyBytes caps the request body size to 1 MiB for register model requests.
const maxRegisterModelRequestBodyBytes = 1 << 20

type RegisterModelEnvelope Envelope[*openapi.ModelArtifact, None]

// RegisterModelHandler handles POST /api/v1/models/register
//
// Registers a model binary in the Model Registry by creating a RegisteredModel,
// ModelVersion, and ModelArtifact in sequence. The ModelArtifact points to the
// provided S3 URI.
//
// The handler validates the S3 path and model metadata, then uses the model-registry
// client to create the resources. Follows the error handling and response wrapping
// used in the model-registry BFF.
//
// Error Responses:
//   - 400: Invalid request body, missing required fields, or invalid S3 path
//   - 503: Model Registry not configured (MODEL_REGISTRY_BASE_URL unset)
//   - 500: Model Registry API error or internal server error
func (app *App) RegisterModelHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Validate request body before checking Model Registry availability.
	// This ensures clients get 400 for invalid input even when MR is not configured.
	var req models.RegisterModelRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, maxRegisterModelRequestBodyBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid request body: %w", err))
		return
	}
	var extra interface{}
	if err := decoder.Decode(&extra); err != io.EOF {
		app.badRequestResponse(w, r, fmt.Errorf("request body must contain only a single JSON object"))
		return
	}

	if err := repositories.ValidateRegisterModelRequest(req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	client, ok := r.Context().Value(constants.ModelRegistryHttpClientKey).(modelregistry.HTTPClientInterface)
	if !ok || client == nil {
		app.serviceUnavailableResponseWithMessage(w, r,
			fmt.Errorf("model registry client not found in context"),
			"model registry is not configured - set MODEL_REGISTRY_BASE_URL to enable model registration")
		return
	}

	modelArtifact, err := app.repositories.ModelRegistry.RegisterModel(client, req)
	if err != nil {
		var httpErr *modelregistry.HTTPError
		if errors.As(err, &httpErr) {
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode:    httpErr.StatusCode,
				ErrorResponse: integrations.ErrorResponse{Code: httpErr.Code, Message: httpErr.Message},
			})
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if modelArtifact == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("model artifact created but response is nil"))
		return
	}

	response := RegisterModelEnvelope{
		Data: modelArtifact,
	}

	if err := app.WriteJSON(w, http.StatusCreated, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
