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
		app.serverErrorResponse(w, r, err)
		return
	}

	models = filterModels(models, app.config.FilteredModelKeywords)

	response := ModelsResponse{
		Data: models,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// filterModels filters out models based on hardcoded rules and configurable keywords
func filterModels(models []openai.Model, filteredKeywords []string) []openai.Model {
	filtered := []openai.Model{}
	// Default keywords to filter out (hardcoded rules)
	defaultFilterKeywords := []string{"embedding", "all-mini"}

	// Combine default keywords with configured keywords
	allFilterKeywords := append(defaultFilterKeywords, filteredKeywords...)

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
