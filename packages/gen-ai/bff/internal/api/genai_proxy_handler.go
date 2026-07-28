package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
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

// proxyInferenceRequest is the minimal fields the BFF peeks at before forwarding.
type proxyInferenceRequest struct {
	Model           string `json:"model"`
	ModelSourceType string `json:"model_source_type,omitempty"`
	Subscription    string `json:"subscription,omitempty"`
	Stream          bool   `json:"stream,omitempty"`
}

// GenAIProxyNSModelsHandler handles GET /api/v1/genai-proxy/ns/:namespace/v1/models.
//
// Aggregates models from namespace ISVCs, custom endpoints, and MaaS and returns them
// in OpenAI list format. Consumed by OGX's remote::passthrough provider with refresh_models: true
// so OGX discovers new models without a pod restart.
func (app *App) GenAIProxyNSModelsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	namespace := ps.ByName("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, errors.New("missing namespace in path"))
		return
	}

	ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, namespace)
	r = r.WithContext(ctx)

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, errors.New("missing RequestIdentity in context"))
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	aaModels, err := app.repositories.AAModels.GetAAModels(k8sClient, ctx, identity, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	maasModels, err := app.fetchMaaSModels(ctx, namespace)
	if err != nil {
		app.logger.Warn("GenAI proxy: failed to fetch MaaS models, returning namespace models only", "error", err)
	} else {
		aaModels = append(aaModels, maasModels...)
	}

	items := make([]openAIModelItem, 0, len(aaModels))
	for _, m := range aaModels {
		if m.Status == models.ModelStatusStop {
			continue
		}
		items = append(items, openAIModelItem{
			ID:      m.ModelID,
			Object:  "model",
			OwnedBy: string(m.ModelSourceType),
			CustomMetadata: map[string]any{
				"model_type": string(m.ModelType),
			},
		})
	}

	list := openAIModelList{Object: "list", Data: items}
	if err := app.WriteJSON(w, http.StatusOK, list, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// resolveModelEndpointDirect resolves the inference endpoint base URL and Authorization header
// value for a model ID, enabling direct proxying without routing back through OGX.
//
// Resolution order:
//  1. Custom endpoint — searches the external models ConfigMap by bare model ID
//  2. Namespace ISVC — looks up the InferenceService URL and uses the user's JWT
func (app *App) resolveModelEndpointDirect(ctx context.Context, namespace, modelID string) (endpointBaseURL, authValue string, err error) {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		return "", "", fmt.Errorf("missing RequestIdentity in context")
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return "", "", fmt.Errorf("failed to get Kubernetes client: %w", err)
	}

	// 1. Search external models ConfigMap by bare model ID.
	externalConfig, cfgErr := k8sClient.GetExternalModelsConfig(ctx, namespace)
	if cfgErr == nil && externalConfig != nil {
		providerMap := make(map[string]*models.InferenceProvider)
		for i := range externalConfig.Providers.Inference {
			p := &externalConfig.Providers.Inference[i]
			providerMap[p.ProviderID] = p
		}
		for _, m := range externalConfig.RegisteredResources.Models {
			if m.ModelID != modelID {
				continue
			}
			provider, found := providerMap[m.ProviderID]
			if !found {
				continue
			}
			// Use provider-qualified ID so fetchSecretFromProvider can resolve the K8s Secret.
			qualifiedID := m.ProviderID + "/" + m.ModelID
			apiKey := app.fetchSecretFromProvider(ctx, k8sClient, identity, namespace, provider, qualifiedID)
			app.logger.Debug("GenAI proxy: resolved custom endpoint", "model", modelID, "provider", m.ProviderID, "baseURL", provider.Config.BaseURL)
			return provider.Config.BaseURL, "Bearer " + apiKey, nil
		}
	}

	// 2. Namespace ISVC — resolve URL and forward user JWT.
	isvcURL, isvcErr := k8sClient.GetInferenceServiceURL(ctx, identity, namespace, modelID)
	if isvcErr != nil {
		return "", "", fmt.Errorf("model %q not found as custom endpoint or InferenceService: %w", modelID, isvcErr)
	}
	if isvcURL == "" {
		return "", "", fmt.Errorf("model %q not found in namespace %q", modelID, namespace)
	}

	app.logger.Debug("GenAI proxy: resolved namespace ISVC", "model", modelID, "url", isvcURL)
	return isvcURL, "Bearer " + identity.Token, nil
}

// proxyDirectly forwards a request body to a target URL with a resolved Authorization header.
// It does not go through OGX — credentials are already injected by the caller.
func (app *App) proxyDirectly(w http.ResponseWriter, r *http.Request, ctx context.Context, targetURL string, body []byte, authValue string, stream bool) {
	proxyReq, err := http.NewRequestWithContext(ctx, http.MethodPost, targetURL, bytes.NewReader(body))
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to build proxy request: %w", err))
		return
	}
	proxyReq.Header.Set("Content-Type", "application/json")
	if authValue != "" {
		proxyReq.Header.Set("Authorization", authValue)
	}

	proxyClient := &http.Client{Transport: app.httpClient.Transport}
	resp, err := proxyClient.Do(proxyReq)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("proxy request to model failed: %w", err))
		return
	}
	defer resp.Body.Close()

	for k, vv := range resp.Header {
		for _, v := range vv {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(resp.StatusCode)

	if stream {
		flusher, canFlush := w.(http.Flusher)
		buf := make([]byte, 4096)
		for {
			n, readErr := resp.Body.Read(buf)
			if n > 0 {
				if _, writeErr := w.Write(buf[:n]); writeErr != nil {
					return
				}
				if canFlush {
					flusher.Flush()
				}
			}
			if readErr != nil {
				break
			}
		}
	} else {
		_, _ = io.Copy(w, resp.Body)
	}
}

// GenAIProxyNSChatCompletionsHandler handles POST /api/v1/genai-proxy/ns/:namespace/v1/chat/completions.
//
// Resolves the model's endpoint URL and credentials, then proxies directly to the underlying
// model (custom endpoint, namespace ISVC, or MaaS) without routing back through OGX.
func (app *App) GenAIProxyNSChatCompletionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	namespace := ps.ByName("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, errors.New("missing namespace in path"))
		return
	}
	ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, namespace)
	r = r.WithContext(ctx)

	r.Body = http.MaxBytesReader(w, r.Body, constants.ResponsesMaxBodySize)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("failed to read request body: %w", err))
		return
	}

	var req proxyInferenceRequest
	if err := json.Unmarshal(body, &req); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid request body: %w", err))
		return
	}
	if req.Model == "" {
		app.badRequestResponse(w, r, errors.New("model is required"))
		return
	}

	baseURL, authValue, err := app.resolveModelEndpointDirect(ctx, namespace, req.Model)
	if err != nil {
		app.logger.Error("GenAI proxy: failed to resolve model endpoint", "model", req.Model, "error", err)
		app.serverErrorResponse(w, r, fmt.Errorf("failed to resolve model endpoint: %w", err))
		return
	}

	target := strings.TrimSuffix(baseURL, "/") + "/chat/completions"
	app.proxyDirectly(w, r, ctx, target, body, authValue, req.Stream)
}

// GenAIProxyNSEmbeddingsHandler handles POST /api/v1/genai-proxy/ns/:namespace/v1/embeddings.
//
// Resolves the model's endpoint URL and credentials, then proxies directly to the underlying model.
func (app *App) GenAIProxyNSEmbeddingsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	namespace := ps.ByName("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, errors.New("missing namespace in path"))
		return
	}
	ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, namespace)
	r = r.WithContext(ctx)

	r.Body = http.MaxBytesReader(w, r.Body, constants.ResponsesMaxBodySize)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("failed to read request body: %w", err))
		return
	}

	var req proxyInferenceRequest
	if err := json.Unmarshal(body, &req); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid request body: %w", err))
		return
	}
	if req.Model == "" {
		app.badRequestResponse(w, r, errors.New("model is required"))
		return
	}

	baseURL, authValue, err := app.resolveModelEndpointDirect(ctx, namespace, req.Model)
	if err != nil {
		app.logger.Error("GenAI proxy: failed to resolve model endpoint", "model", req.Model, "error", err)
		app.serverErrorResponse(w, r, fmt.Errorf("failed to resolve model endpoint: %w", err))
		return
	}

	base := strings.TrimSuffix(baseURL, "/")
	if !strings.HasSuffix(base, "/v1") {
		base += "/v1"
	}
	target := base + "/embeddings"
	app.proxyDirectly(w, r, ctx, target, body, authValue, false)
}

