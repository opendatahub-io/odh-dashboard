package api

import (
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

type ModelsResponse = llamastack.APIResponse

// LlamaStackModelsHandler handles GET /gen-ai/api/v1/models
func (app *App) LlamaStackModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	models, err := app.repositories.Models.ListModels(ctx)
	if err != nil {
		app.handleLlamaStackClientError(w, r, err)
		return
	}

	includeEmbeddingModels := r.URL.Query().Get("include_embedding_models") == "true"
	models = filterModels(models, app.config.FilteredModelKeywords, includeEmbeddingModels)

	response := ModelsResponse{
		Data: models,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// filterModels filters out models based on hardcoded rules and configurable keywords.
// When includeEmbeddingModels is true, the default embedding-related keywords are skipped
// but configurable keywords are still applied.
func filterModels(models []openai.Model, filteredKeywords []string, includeEmbeddingModels bool) []openai.Model {
	filtered := []openai.Model{}

	var allFilterKeywords []string
	if !includeEmbeddingModels {
		// Default keywords to filter out embedding models
		allFilterKeywords = append(allFilterKeywords, "embedding", "all-mini", "embed")
	}
	allFilterKeywords = append(allFilterKeywords, filteredKeywords...)

	for _, model := range models {
		modelNameLower := strings.ToLower(model.ID)
		shouldFilter := false

		// Check if model name contains any of the filter keywords
		for _, keyword := range allFilterKeywords {
			if keyword != "" && strings.Contains(modelNameLower, strings.ToLower(keyword)) {
				shouldFilter = true
				break
			}
		}

		// Include model if it doesn't match any filter keywords
		if !shouldFilter {
			filtered = append(filtered, model)
		}
	}

	return filtered
}
