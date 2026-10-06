package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

type ModelsResponse = llamastack.APIResponse

// LlamaStackModelsHandler handles GET /gen-ai/api/v1/lsd/models
func (app *App) LlamaStackModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	providerData, err := app.getProviderData(ctx, "", "")
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to build provider data: %w", err))
		return
	}

	ogxModels, err := app.repositories.Models.ListModels(ctx, providerData)
	if err != nil {
		app.handleLlamaStackClientError(w, r, err)
		return
	}

	includeEmbeddingModels := false
	if values, ok := r.URL.Query()["include_embedding_models"]; ok {
		if len(values) != 1 || (values[0] != "true" && values[0] != "false") {
			app.badRequestResponse(w, r, fmt.Errorf("include_embedding_models must be true or false"))
			return
		}
		includeEmbeddingModels = values[0] == "true"
	}
	ogxModels = filterModels(ogxModels, app.config.FilteredModelKeywords, includeEmbeddingModels)

	response := ModelsResponse{
		Data: ogxModels,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// filterModels uses OGX model types when available to keep non-chat models out of
// the playground's default list. Callers requesting the full list retain all model
// types. Older responses without a type retain the name-based embedding filter.
// Configurable keywords are applied in either case.
func filterModels(models []openai.Model, filteredKeywords []string, includeEmbeddingModels bool) []openai.Model {
	filtered := []openai.Model{}

	for _, model := range models {
		var modelType string
		if field, ok := model.JSON.ExtraFields["custom_metadata"]; ok {
			var metadata struct {
				ModelType string `json:"model_type"`
			}
			if err := json.Unmarshal([]byte(field.Raw()), &metadata); err == nil {
				modelType = metadata.ModelType
			}
		}
		if field, ok := model.JSON.ExtraFields["model_type"]; ok && modelType == "" {
			_ = json.Unmarshal([]byte(field.Raw()), &modelType)
		}
		if !includeEmbeddingModels && modelType != "" && modelType != llamastack.LLMModelType {
			continue
		}

		modelNameLower := strings.ToLower(model.ID)
		if modelType == "" && !includeEmbeddingModels &&
			(strings.Contains(modelNameLower, "embedding") ||
				strings.Contains(modelNameLower, "all-mini") ||
				strings.Contains(modelNameLower, "embed")) {
			continue
		}

		shouldFilter := false

		for _, keyword := range filteredKeywords {
			if keyword != "" && strings.Contains(modelNameLower, strings.ToLower(keyword)) {
				shouldFilter = true
				break
			}
		}

		if !shouldFilter {
			filtered = append(filtered, model)
		}
	}

	return filtered
}
