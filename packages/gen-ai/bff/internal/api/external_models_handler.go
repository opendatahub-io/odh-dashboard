package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/externalmodels"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type CreateExternalModelEnvelope Envelope[models.AAModel, None]

// CreateExternalModelHandler handles the creation of external model endpoints
func (app *App) CreateExternalModelHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get namespace from context
	namespace, ok := r.Context().Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in the context"))
		return
	}

	// Get the request identity from context
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Parse request body
	var req models.ExternalModelRequest
	err := app.ReadJSON(w, r, &req)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate required fields
	if req.ModelID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("model_id is required"))
		return
	}
	if req.ModelDisplayName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("model_display_name is required"))
		return
	}
	if req.BaseURL == "" {
		app.badRequestResponse(w, r, fmt.Errorf("base_url is required"))
		return
	}
	if req.ModelType == "" {
		app.badRequestResponse(w, r, fmt.Errorf("model_type is required"))
		return
	}

	// Validate model type
	validModelTypes := map[models.ModelTypeEnum]bool{
		models.ModelTypeEmbedding: true,
		models.ModelTypeLLM:       true,
	}
	if !validModelTypes[req.ModelType] {
		app.badRequestResponse(w, r, fmt.Errorf("invalid model_type: %s", req.ModelType))
		return
	}

	// Validate embedding_dimension for embedding models
	if req.ModelType == models.ModelTypeEmbedding {
		if req.EmbeddingDimension == nil {
			app.badRequestResponse(w, r, fmt.Errorf("embedding_dimension is required for embedding models"))
			return
		}
		if *req.EmbeddingDimension <= 0 {
			app.badRequestResponse(w, r, fmt.Errorf("embedding_dimension must be a positive number"))
			return
		}
	}

	// Get Kubernetes client
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Create external model
	response, err := app.repositories.ExternalModels.CreateExternalModel(client, ctx, identity, namespace, req)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return success response
	envelope := CreateExternalModelEnvelope{
		Data: *response,
	}
	err = app.WriteJSON(w, http.StatusCreated, envelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// DeleteExternalModelHandler handles the deletion of external model endpoints
func (app *App) DeleteExternalModelHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Get namespace from context
	namespace, ok := r.Context().Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in the context"))
		return
	}

	// Get the request identity from context
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Get model_id from query parameter
	modelID := r.URL.Query().Get("model_id")
	if modelID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("model_id query parameter is required"))
		return
	}

	// Get Kubernetes client
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Delete external model
	err = app.repositories.ExternalModels.DeleteExternalModel(client, ctx, identity, namespace, modelID)
	if err != nil {
		// Check if the error is a "not found" error
		if errors.Is(err, kubernetes.ErrExternalModelNotFound) {
			// Return 404 when the model is not found
			app.notFoundResponse(w, r)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return 204 No Content on successful deletion
	w.WriteHeader(http.StatusNoContent)
}

type VerifyExternalModelEnvelope = Envelope[models.VerifyExternalModelResponse, None]

// VerifyExternalModelHandler handles POST /api/v1/models/external/verify
func (app *App) VerifyExternalModelHandler(
	w http.ResponseWriter,
	r *http.Request,
	_ httprouter.Params,
) {
	ctx := r.Context()

	// 1. Parse request
	var req models.VerifyExternalModelRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// 2. Validate required fields
	if req.ModelID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("model_id is required"))
		return
	}
	if req.BaseURL == "" {
		app.badRequestResponse(w, r, fmt.Errorf("base_url is required"))
		return
	}
	if req.ModelType == "" {
		app.badRequestResponse(w, r, fmt.Errorf("model_type is required"))
		return
	}

	// Validate model type
	validModelTypes := map[models.ModelTypeEnum]bool{
		models.ModelTypeEmbedding: true,
		models.ModelTypeLLM:       true,
	}
	if !validModelTypes[req.ModelType] {
		app.badRequestResponse(w, r, fmt.Errorf("invalid model_type: %s", req.ModelType))
		return
	}

	// Validate embedding_dimension for embedding models
	if req.ModelType == models.ModelTypeEmbedding {
		if req.EmbeddingDimension == nil {
			app.badRequestResponse(w, r, fmt.Errorf("embedding_dimension is required for embedding models"))
			return
		}
		if *req.EmbeddingDimension <= 0 {
			app.badRequestResponse(w, r, fmt.Errorf("embedding_dimension must be a positive number"))
			return
		}
	}

	// 3. Call repository
	response, err := app.repositories.ExternalModels.VerifyExternalModel(app.logger, ctx, req, app.rootCAs, app.config.InsecureSkipVerify)
	if err != nil {
		// Handle custom error types
		if extErr, ok := err.(*externalmodels.ExternalModelError); ok {
			httpError := &integrations.HTTPError{
				StatusCode: extErr.StatusCode,
				ErrorResponse: integrations.ErrorResponse{
					Code:    extErr.Code,
					Message: extErr.Message,
				},
			}
			app.errorResponse(w, r, httpError)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// 4. Return success
	envelope := VerifyExternalModelEnvelope{
		Data: *response,
	}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
