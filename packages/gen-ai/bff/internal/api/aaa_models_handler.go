package api

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type ModelsAAEnvelope Envelope[[]models.AAModel, None]

func (app *App) ModelsAAHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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

	// Parse sources query parameter (comma-separated list: namespace,custom_endpoint,maas)
	// Default to namespace and custom_endpoint if not specified
	// Reject requests with multiple "sources" parameters
	sourcesParams := r.URL.Query()["sources"]
	if len(sourcesParams) > 1 {
		app.badRequestResponse(w, r, fmt.Errorf("multiple 'sources' parameters not allowed"))
		return
	}

	sourcesParam := ""
	if len(sourcesParams) == 1 {
		sourcesParam = sourcesParams[0]
	}
	requestedSources, invalidSources := parseModelSources(sourcesParam)

	// Validate that no invalid sources were provided
	if len(invalidSources) > 0 {
		app.badRequestResponse(w, r, fmt.Errorf("invalid source(s): %s", strings.Join(invalidSources, ", ")))
		return
	}

	// Initialize as empty slice to ensure JSON marshals to [] instead of null
	aaModels := make([]models.AAModel, 0)

	// Fetch namespace and custom endpoint models if requested
	if requestedSources[models.ModelSourceTypeNamespace] || requestedSources[models.ModelSourceTypeCustomEndpoint] {
		client, err := app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		k8sModels, err := app.repositories.AAModels.GetAAModels(client, ctx, identity, namespace)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		// Filter models based on requested sources
		for _, model := range k8sModels {
			if requestedSources[model.ModelSourceType] {
				aaModels = append(aaModels, model)
			}
		}
	}

	// Fetch MaaS models if requested
	if requestedSources[models.ModelSourceTypeMaaS] {
		maasModels, err := app.fetchMaaSModels(ctx, namespace)
		if err != nil {
			// If only MaaS was requested, return the BFF error (preserves original status code)
			isMaasOnly := len(requestedSources) == 1
			if isMaasOnly {
				app.handleBFFClientError(w, r, err)
				return
			}
			// For mixed-source requests, log error but don't fail the entire request
			app.logger.Error("failed to fetch MaaS models", "error", err)
		} else {
			aaModels = append(aaModels, maasModels...)
		}
	}

	aaModelsEnvelope := ModelsAAEnvelope{
		Data: aaModels,
	}
	err := app.WriteJSON(w, http.StatusOK, aaModelsEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// parseModelSources parses the sources query parameter into a map of requested source types.
// If sourcesParam is empty, defaults to namespace and custom_endpoint.
// Returns valid sources map and a slice of invalid source tokens.
// Validation rules:
//   - Empty tokens (e.g., "namespace,,maas" or trailing comma) are invalid
//   - Duplicate tokens are invalid
//   - Maximum 3 tokens allowed
//
// Example: "namespace,maas" -> {namespace: true, maas: true}, []
// Example: "namespace,invalid" -> {namespace: true}, ["invalid"]
// Example: "namespace,namespace" -> {namespace: true}, ["namespace (duplicate)"]
func parseModelSources(sourcesParam string) (map[models.ModelSourceTypeEnum]bool, []string) {
	sources := make(map[models.ModelSourceTypeEnum]bool)
	var invalidSources []string

	// Default sources if not specified
	if sourcesParam == "" {
		sources[models.ModelSourceTypeNamespace] = true
		sources[models.ModelSourceTypeCustomEndpoint] = true
		return sources, invalidSources
	}

	// Parse comma-separated list
	tokens := strings.Split(sourcesParam, ",")
	const maxTokens = 3
	if len(tokens) > maxTokens {
		invalidSources = append(invalidSources, "too many sources (max 3)")
		return sources, invalidSources
	}

	seenTokens := make(map[string]bool)

	for _, token := range tokens {
		token = strings.TrimSpace(token)

		// Reject empty tokens
		if token == "" {
			invalidSources = append(invalidSources, "(empty token)")
			continue
		}

		// Reject duplicates
		if seenTokens[token] {
			invalidSources = append(invalidSources, token+" (duplicate)")
			continue
		}
		seenTokens[token] = true

		// Map valid tokens to enum
		switch models.ModelSourceTypeEnum(token) {
		case models.ModelSourceTypeNamespace:
			sources[models.ModelSourceTypeNamespace] = true
		case models.ModelSourceTypeCustomEndpoint:
			sources[models.ModelSourceTypeCustomEndpoint] = true
		case models.ModelSourceTypeMaaS:
			sources[models.ModelSourceTypeMaaS] = true
		default:
			// Track unknown/invalid source tokens
			invalidSources = append(invalidSources, token)
		}
	}

	return sources, invalidSources
}

// fetchMaaSModels fetches models from MaaS BFF and converts them to AAModel format
func (app *App) fetchMaaSModels(ctx context.Context, namespace string) ([]models.AAModel, error) {
	// Get MaaS BFF client from context (set by AttachBFFMaaSClient middleware)
	maasClient := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
	if maasClient == nil {
		return nil, fmt.Errorf("MaaS BFF client not available")
	}

	// Call MaaS BFF to get models
	var bffResponse models.MaaSBFFModelsResponse
	err := maasClient.Call(ctx, "GET", "/api/v1/models?namespace="+url.QueryEscape(namespace), nil, &bffResponse)
	if err != nil {
		return nil, fmt.Errorf("failed to call MaaS BFF: %w", err)
	}

	// Convert MaaS models to AAModel format
	aaModels := make([]models.AAModel, 0, len(bffResponse.Data.Data))
	for _, maasModel := range bffResponse.Data.Data {
		aaModel := models.AAModel{
			ModelName:       maasModel.ID,
			ModelID:         maasModel.ID,
			Endpoints:       []string{maasModel.URL},
			Status:          getMaaSModelStatus(maasModel.Ready),
			ModelSourceType: models.ModelSourceTypeMaaS,
			ModelType:       models.ModelTypeEnum(maasModel.ModelType),
		}

		// Extract fields from nested ModelDetails if present
		if maasModel.ModelDetails != nil {
			aaModel.DisplayName = maasModel.ModelDetails.DisplayName
			aaModel.Description = maasModel.ModelDetails.Description
			aaModel.Usecase = maasModel.ModelDetails.GenAIUseCase
		}

		// Set serving runtime based on owned_by
		if maasModel.OwnedBy != "" {
			aaModel.ServingRuntime = maasModel.OwnedBy
		}

		aaModels = append(aaModels, aaModel)
	}

	return aaModels, nil
}

// getMaaSModelStatus converts MaaS model ready status to AAModel status
func getMaaSModelStatus(ready bool) string {
	if ready {
		return models.ModelStatusRunning
	}
	return models.ModelStatusStop
}
