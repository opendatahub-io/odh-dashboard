package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MaaSModelsHandler handles GET /api/v1/maas/models.
// Uses inter-BFF communication to call MaaS BFF GET /api/v1/models.
// Maps MaaS BFF response (with nested modelDetails) to Gen AI response format (flat fields).
func (app *App) MaaSModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context"))
		return
	}

	// Get MaaS BFF client from context (set by AttachBFFMaaSClient middleware)
	maasClient := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
	if maasClient == nil {
		app.maasBFFUnavailableResponse(w, r)
		return
	}

	// Call MaaS BFF to get models
	// MaaS BFF returns response wrapped in envelope: {"data": {"object": "list", "data": [...]}}
	// The MaaSReturnAllModelsHeader: true header (set in middleware) ensures enriched model details
	// Path is relative to BFF base URL (/api/v1) - do not include /api/v1 prefix here
	// Note: MaaS BFF determines namespace scope via the forwarded authentication token
	// (x-forwarded-access-token header), not via query parameters
	var bffResponse models.MaaSBFFModelsResponse
	err := maasClient.Call(ctx, "GET", "/models", nil, &bffResponse)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	// Map MaaS BFF models (with modelDetails) to Gen AI model format (flat fields)
	maasModels := make([]models.MaaSModel, len(bffResponse.Data.Data))
	for i, bffModel := range bffResponse.Data.Data {
		genAIModel := models.MaaSModel{
			ID:            bffModel.ID,
			Object:        bffModel.Object,
			Created:       bffModel.Created,
			OwnedBy:       bffModel.OwnedBy,
			Ready:         bffModel.Ready,
			URL:           bffModel.URL,
			ModelType:     bffModel.ModelType,
			Subscriptions: bffModel.Subscriptions,
		}

		// Map nested modelDetails to flat fields
		if bffModel.ModelDetails != nil {
			genAIModel.DisplayName = bffModel.ModelDetails.DisplayName
			genAIModel.Description = bffModel.ModelDetails.Description
			genAIModel.Usecase = bffModel.ModelDetails.GenAIUseCase
		}

		maasModels[i] = genAIModel
	}

	// Return response in Gen AI format
	response := models.MaaSModelsResponse{
		Object: bffResponse.Data.Object,
		Data:   maasModels,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
