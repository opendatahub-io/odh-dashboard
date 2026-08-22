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
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type ModelsResponse = llamastack.APIResponse

// LlamaStackModelsHandler handles GET /gen-ai/api/v1/models
func (app *App) LlamaStackModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// When passthrough is enabled, OGX has no models registered — the BFF is the
	// source of truth for model discovery. Aggregate directly from ISVCs, custom
	// endpoints, and MaaS instead of querying OGX's empty model registry.
	if app.config.GatewayDomain != "" {
		app.passthroughModelsHandler(w, r)
		return
	}

	ogxModels, err := app.repositories.Models.ListModels(ctx)
	if err != nil {
		app.handleLlamaStackClientError(w, r, err)
		return
	}

	includeEmbeddingModels := r.URL.Query().Get("include_embedding_models") == "true"
	ogxModels = filterModels(ogxModels, app.config.FilteredModelKeywords, includeEmbeddingModels)

	response := ModelsResponse{
		Data: ogxModels,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// passthroughModelsHandler aggregates models from ISVCs, custom endpoints, and MaaS
// and returns them in OGX-compatible format (provider-prefixed IDs).
func (app *App) passthroughModelsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	namespace := ctx.Value(constants.NamespaceQueryParameterKey)
	if namespace == nil || namespace.(string) == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace"))
		return
	}
	ns := namespace.(string)

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing authentication identity"))
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	aaModels, err := app.repositories.AAModels.GetAAModels(k8sClient, ctx, identity, ns)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to fetch models: %w", err))
		return
	}

	// Fetch MaaS models (best-effort)
	if app.bffClientFactory != nil && app.bffClientFactory.IsTargetConfigured(bffclient.BFFTargetMaaS) {
		maasHeaders := map[string]string{constants.MaaSReturnAllModelsHeader: "true"}
		maasClient := app.bffClientFactory.CreateClientWithHeaders(bffclient.BFFTargetMaaS, identity.Token, maasHeaders)
		maasCtx := context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)
		maasModels, maasErr := app.fetchMaaSModels(maasCtx, ns)
		if maasErr != nil {
			app.logger.Warn("Passthrough models: failed to fetch MaaS models", "error", maasErr)
		} else {
			aaModels = append(aaModels, maasModels...)
		}
	}

	// Convert to openai.Model format with passthrough provider prefix.
	// The prefix ensures the frontend sends model IDs in `provider/model` format
	// to OGX's Responses API, which routes them to our passthrough provider.
	// MaaS models get an additional "maas-" prefix so the proxy handler's resolution
	// logic can distinguish them from ISVCs and custom endpoints.
	providerPrefix := constants.PassthroughProviderID + "/"
	result := make([]openai.Model, 0, len(aaModels))
	for _, m := range aaModels {
		if m.Status == models.ModelStatusStop {
			continue
		}
		modelID := providerPrefix
		if m.ModelSourceType == models.ModelSourceTypeMaaS {
			modelID += constants.MaaSProviderPrefix
		}
		modelID += m.ModelID
		result = append(result, openai.Model{
			ID:      modelID,
			Object:  "model",
			Created: 0,
			OwnedBy: string(m.ModelSourceType),
		})
	}

	includeEmbeddingModels := r.URL.Query().Get("include_embedding_models") == "true"
	result = filterModels(result, app.config.FilteredModelKeywords, includeEmbeddingModels)

	response := ModelsResponse{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
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
