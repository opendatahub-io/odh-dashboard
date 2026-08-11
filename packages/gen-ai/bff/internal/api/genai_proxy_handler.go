package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// openAIModelItem is a single entry in the OpenAI GET /v1/models response.
type openAIModelItem struct {
	ID             string         `json:"id"`
	Object         string         `json:"object"`
	Created        int64          `json:"created"`
	OwnedBy        string         `json:"owned_by"`
	CustomMetadata map[string]any `json:"custom_metadata,omitempty"`
}

// openAIModelList is the OpenAI GET /v1/models response envelope.
type openAIModelList struct {
	Object string            `json:"object"`
	Data   []openAIModelItem `json:"data"`
}

// GenAIProxyNSModelsHandler handles GET /api/v1/genai-proxy/ns/:namespace/v1/models.
//
// Aggregates models from namespace ISVCs, custom endpoints, and MaaS and returns them
// in OpenAI list format. Consumed by OGX's remote::passthrough provider so OGX
// discovers new models without a pod restart.
//
// Auth is required: OGX forwards the user's JWT via X-OGX-Provider-Data →
// forward_headers → x-forwarded-access-token header. The middleware extracts
// the identity before this handler runs.
func (app *App) GenAIProxyNSModelsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	namespace := ps.ByName("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, errors.New("missing namespace in path"))
		return
	}

	ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, namespace)
	r = r.WithContext(ctx)

	// Auth is required: OGX forwards the user's JWT via X-OGX-Provider-Data → forward_headers
	// → x-forwarded-access-token. The middleware extracts the identity before this handler runs.
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil || identity.Token == "" {
		app.unauthorizedResponse(w, r, errors.New("missing authentication identity"))
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	// Fetch namespace and custom endpoint models
	aaModels, err := app.repositories.AAModels.GetAAModels(k8sClient, ctx, identity, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to fetch models: %w", err))
		return
	}

	// Fetch MaaS models (best-effort — don't fail if MaaS BFF is unavailable).
	// Inject MaaS client into context inline (we don't use AttachBFFMaaSClient middleware
	// because it returns 503 when bffClientFactory is nil, blocking the whole endpoint).
	// Forward X-MaaS-Return-All-Models header to get enriched model details.
	if app.bffClientFactory != nil && app.bffClientFactory.IsTargetConfigured(bffclient.BFFTargetMaaS) {
		maasHeaders := map[string]string{
			constants.MaaSReturnAllModelsHeader: "true",
		}
		maasClient := app.bffClientFactory.CreateClientWithHeaders(bffclient.BFFTargetMaaS, identity.Token, maasHeaders)
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)
	}
	maasModels, maasErr := app.fetchMaaSModels(ctx, namespace)
	if maasErr != nil {
		app.logger.Warn("GenAI proxy: failed to fetch MaaS models, continuing with namespace models only",
			"error", maasErr, "namespace", namespace)
	} else {
		aaModels = append(aaModels, maasModels...)
	}

	// Convert to OpenAI format, filtering out stopped models
	items := make([]openAIModelItem, 0, len(aaModels))
	for _, m := range aaModels {
		if m.Status == models.ModelStatusStop {
			continue
		}

		item := openAIModelItem{
			ID:      m.ModelID,
			Object:  "model",
			Created: 0,
			OwnedBy: string(m.ModelSourceType),
		}

		// Include model_type as custom metadata for OGX to distinguish
		// inference vs embedding models.
		if m.ModelType != "" {
			metadata := map[string]any{"model_type": string(m.ModelType)}
			if m.EmbeddingDimension != nil {
				metadata["embedding_dimension"] = *m.EmbeddingDimension
			}
			item.CustomMetadata = metadata
		}

		items = append(items, item)
	}

	list := openAIModelList{Object: "list", Data: items}
	if err := app.WriteJSON(w, http.StatusOK, list, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
