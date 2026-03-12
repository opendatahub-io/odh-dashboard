package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
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
	if req.SecretValue == "" {
		app.badRequestResponse(w, r, fmt.Errorf("secret_value is required"))
		return
	}
	if req.ProviderType == "" {
		app.badRequestResponse(w, r, fmt.Errorf("provider_type is required"))
		return
	}
	if req.ModelType == "" {
		app.badRequestResponse(w, r, fmt.Errorf("model_type is required"))
		return
	}

	// Validate provider type
	validProviderTypes := map[models.ProviderTypeEnum]bool{
		models.ProviderTypeGemini:      true,
		models.ProviderTypeOpenAI:      true,
		models.ProviderTypeAnthropic:   true,
		models.ProviderTypeVLLM:        true,
		models.ProviderTypePassthrough: true,
	}
	if !validProviderTypes[req.ProviderType] {
		app.badRequestResponse(w, r, fmt.Errorf("invalid provider_type: %s", req.ProviderType))
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
