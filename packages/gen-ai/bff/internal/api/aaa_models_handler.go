package api

import (
	"context"
	"fmt"
	"net/http"
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

	// Parse sources query parameter
	// Supports both formats:
	//   - Comma-separated: ?sources=namespace,maas (OpenAPI explode: false)
	//   - Repeated parameters: ?sources=namespace&sources=maas (standard HTTP arrays)
	// Default to namespace and custom_endpoint if not specified
	sourcesParams := r.URL.Query()["sources"]

	// Flatten comma-separated values into individual tokens
	// Reject empty tokens to prevent malformed queries like ?sources= or ?sources=a,,b
	var sourceTokens []string
	for _, param := range sourcesParams {
		// Split by comma to support both ?sources=a,b and ?sources=a&sources=b
		tokens := strings.Split(param, ",")
		for _, token := range tokens {
			token = strings.TrimSpace(token)
			if token == "" {
				app.badRequestResponse(w, r, fmt.Errorf("empty source value provided"))
				return
			}
			sourceTokens = append(sourceTokens, token)
		}
	}

	requestedSources, invalidSources := parseModelSourcesFromTokens(sourceTokens)

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

	// Track partial failures for mixed-source requests
	var partialFailure bool

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
			partialFailure = true
		} else {
			aaModels = append(aaModels, maasModels...)
		}
	}

	aaModelsEnvelope := ModelsAAEnvelope{
		Data: aaModels,
	}

	// Add header to signal partial response when a source failed
	var headers http.Header
	if partialFailure {
		headers = http.Header{}
		headers.Set("X-Partial-Response", "true")
		headers.Set("X-Partial-Reason", "MaaS source unavailable")
	}

	err := app.WriteJSON(w, http.StatusOK, aaModelsEnvelope, headers)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

// parseModelSourcesFromTokens parses source tokens into a map of requested source types.
// If tokens slice is empty, defaults to namespace and custom_endpoint.
// Returns valid sources map and a slice of invalid source tokens.
// Validation rules:
//   - Duplicate tokens are invalid
//   - Maximum 3 unique tokens allowed
//
// Example: ["namespace", "maas"] -> {namespace: true, maas: true}, []
// Example: ["namespace", "invalid"] -> {namespace: true}, ["invalid"]
// Example: ["namespace", "namespace"] -> {namespace: true}, ["namespace (duplicate)"]
func parseModelSourcesFromTokens(tokens []string) (map[models.ModelSourceTypeEnum]bool, []string) {
	sources := make(map[models.ModelSourceTypeEnum]bool)
	var invalidSources []string

	// Default sources if not specified
	if len(tokens) == 0 {
		sources[models.ModelSourceTypeNamespace] = true
		sources[models.ModelSourceTypeCustomEndpoint] = true
		return sources, invalidSources
	}

	const maxTokens = 3
	seenTokens := make(map[string]bool)

	for _, token := range tokens {
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

	// Check max tokens after deduplication
	// NOTE: With only 3 valid enum values currently, this check is unreachable in practice
	// (any 4th token is already caught as unknown above). Retained as defensive programming
	// in case new source types are added in the future without updating this validation.
	if len(seenTokens) > maxTokens {
		invalidSources = append(invalidSources, "too many sources (max 3)")
	}

	return sources, invalidSources
}

// fetchMaaSModels fetches models from MaaS BFF and converts them to AAModel format
func (app *App) fetchMaaSModels(ctx context.Context, namespace string) ([]models.AAModel, error) {
	// Get MaaS BFF client from context (set by AttachBFFMaaSClient middleware)
	maasClient := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
	if maasClient == nil {
		return nil, bffclient.NewServerUnavailableError(bffclient.BFFTargetMaaS)
	}

	// Call MaaS BFF to get models
	// Note: MaaS BFF determines namespace scope via the forwarded authentication token
	// (x-forwarded-access-token header), not via query parameters
	var bffResponse models.MaaSBFFModelsResponse
	err := maasClient.Call(ctx, "GET", "/models", nil, &bffResponse)
	if err != nil {
		// Return unwrapped error - handleBFFClientError uses errors.As and preserves error details
		return nil, err
	}

	// Convert MaaS models to AAModel format
	aaModels := make([]models.AAModel, 0, len(bffResponse.Data.Data))
	for _, maasModel := range bffResponse.Data.Data {
		// Build endpoints array, skipping empty URLs
		var endpoints []string
		if maasModel.URL != "" {
			endpoints = []string{maasModel.URL}
		}

		aaModel := models.AAModel{
			ModelName:       maasModel.ID,
			ModelID:         maasModel.ID,
			Endpoints:       endpoints,
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
