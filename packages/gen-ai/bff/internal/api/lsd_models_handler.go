package api

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type ModelsResponse = llamastack.APIResponse

// LlamaStackModelsHandler handles GET /gen-ai/api/v1/models
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

	passthroughModels, err := app.playgroundPassthroughModels(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	includeEmbeddingModels := r.URL.Query().Get("include_embedding_models") == "true"
	availableModels := mergeModels(passthroughModels, ogxModels)
	availableModels = filterModels(availableModels, app.config.FilteredModelKeywords, includeEmbeddingModels)

	response := ModelsResponse{
		Data: availableModels,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// playgroundPassthroughModels converts dynamically discovered passthrough models
// to the OpenAI model format consumed by the Playground. The response handler adds
// the passthrough provider prefix only when sending an inference request to OGX.
func (app *App) playgroundPassthroughModels(ctx context.Context) ([]openai.Model, error) {
	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	identity, hasIdentity := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || namespace == "" || !hasIdentity || identity == nil || identity.Token == "" {
		return nil, nil
	}

	aaModels, err := app.discoverPassthroughModels(ctx, identity, namespace)
	if err != nil {
		return nil, err
	}

	passthroughModels := make([]openai.Model, 0, len(aaModels))
	for _, model := range aaModels {
		if model.Status == models.ModelStatusStop {
			continue
		}
		passthroughModels = append(passthroughModels, openai.Model{
			ID:      model.ModelID,
			Object:  "model",
			Created: 0,
			OwnedBy: string(model.ModelSourceType),
		})
	}

	return passthroughModels, nil
}

// mergeModels keeps passthrough models first so the Playground defaults to a
// selectable inference model, while preserving OGX-only models as a fallback.
func mergeModels(passthroughModels, ogxModels []openai.Model) []openai.Model {
	mergedModels := make([]openai.Model, 0, len(passthroughModels)+len(ogxModels))
	seenModelIDs := make(map[string]struct{}, len(passthroughModels)+len(ogxModels))

	for _, models := range [][]openai.Model{passthroughModels, ogxModels} {
		for _, model := range models {
			if _, seen := seenModelIDs[model.ID]; seen {
				continue
			}
			seenModelIDs[model.ID] = struct{}{}
			mergedModels = append(mergedModels, model)
		}
	}

	return mergedModels
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
