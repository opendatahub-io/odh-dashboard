package api

import (
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
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// GenAIProxyNSEmbeddingsHandler handles POST /api/v1/genai-proxy/ns/:namespace/v1/embeddings.
//
// Accepts an OpenAI-compatible embeddings request, resolves the model to a concrete
// endpoint and credentials, and proxies the request directly to the upstream model.
// Returns the upstream response unchanged (transparent proxy).
//
// Auth is required: OGX forwards the user's JWT via X-OGX-Provider-Data →
// forward_headers → x-forwarded-access-token header.
func (app *App) GenAIProxyNSEmbeddingsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	namespace := ps.ByName("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, errors.New("missing namespace in path"))
		return
	}

	ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, namespace)
	r = r.WithContext(ctx)

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil || identity.Token == "" {
		app.unauthorizedResponse(w, r, errors.New("missing authentication identity"))
		return
	}

	// Read and parse the request body to extract model field
	body, err := io.ReadAll(r.Body)
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("failed to read request body: %w", err))
		return
	}
	defer r.Body.Close()

	var reqBody struct {
		Model string `json:"model"`
	}
	if err := json.Unmarshal(body, &reqBody); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid JSON in request body: %w", err))
		return
	}
	if reqBody.Model == "" {
		app.badRequestResponse(w, r, errors.New("missing required field: model"))
		return
	}

	// Resolve model → endpoint URL + credentials
	baseURL, apiKey, err := app.resolveModelEndpoint(ctx, reqBody.Model, namespace)
	if err != nil {
		app.logger.Warn("Model resolution failed", "model", reqBody.Model, "error", err)
		app.notFoundResponse(w, r)
		return
	}

	// Normalize base URL to include /v1 if missing (per spike findings)
	baseURL = strings.TrimSuffix(baseURL, "/")
	if !strings.HasSuffix(baseURL, "/v1") {
		baseURL += "/v1"
	}

	// Proxy the request to upstream
	upstreamURL := baseURL + "/embeddings"
	proxyReq, err := http.NewRequestWithContext(ctx, http.MethodPost, upstreamURL, strings.NewReader(string(body)))
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create upstream request: %w", err))
		return
	}
	proxyReq.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		proxyReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := app.httpClient.Do(proxyReq)
	if err != nil {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusBadGateway,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "502",
				Message: fmt.Sprintf("upstream unreachable: %v", err),
			},
		})
		return
	}
	defer resp.Body.Close()

	// Forward the upstream response unchanged (transparent proxy)
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to read upstream response: %w", err))
		return
	}

	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

// resolveModelEndpoint resolves a model ID to its upstream endpoint URL and API key.
// The model ID may be provider-qualified (e.g. "genai-bff-proxy/text-embedding-3-small")
// or bare (e.g. "my-isvc-model"). Resolution follows the same priority as getProviderData:
//  1. Custom endpoint (provider-qualified with known provider) → ConfigMap + Secret
//  2. MaaS (maas- prefix) → MaaS BFF catalog URL + ephemeral token
//  3. Namespace (bare name) → InferenceService/LLMInferenceService URL + user JWT
func (app *App) resolveModelEndpoint(ctx context.Context, modelID, namespace string) (baseURL, apiKey string, err error) {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		return "", "", fmt.Errorf("missing RequestIdentity in context")
	}

	k8sClient, k8sErr := app.kubernetesClientFactory.GetClient(ctx)
	if k8sErr != nil {
		return "", "", fmt.Errorf("failed to get Kubernetes client: %w", k8sErr)
	}

	// Determine source type from model ID format
	var effectiveSourceType models.ModelSourceTypeEnum
	switch {
	case strings.HasPrefix(modelID, constants.MaaSProviderPrefix):
		effectiveSourceType = models.ModelSourceTypeMaaS
	case strings.Contains(modelID, "/"):
		// Provider-qualified model ID → try custom endpoint first
		effectiveSourceType = models.ModelSourceTypeCustomEndpoint
	default:
		effectiveSourceType = models.ModelSourceTypeNamespace
	}

	switch effectiveSourceType {
	case models.ModelSourceTypeCustomEndpoint:
		extURL, extKey := app.getCustomEndpointBaseURLAndKey(ctx, modelID)
		if extURL == "" {
			// Fallback: might be a namespace model with a slash in the name
			return app.resolveNamespaceModel(ctx, k8sClient, identity, namespace, modelID)
		}
		return extURL, extKey, nil

	case models.ModelSourceTypeMaaS:
		if app.bffClientFactory == nil || !app.bffClientFactory.IsTargetConfigured(bffclient.BFFTargetMaaS) {
			return "", "", fmt.Errorf("MaaS is not available")
		}
		maasHeaders := map[string]string{constants.MaaSReturnAllModelsHeader: "true"}
		maasClient := app.bffClientFactory.CreateClientWithHeaders(bffclient.BFFTargetMaaS, identity.Token, maasHeaders)
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)

		inferenceURL, urlErr := app.resolveMaaSModelInferenceURL(ctx, identity, modelID)
		if urlErr != nil {
			return "", "", fmt.Errorf("failed to resolve MaaS inference URL: %w", urlErr)
		}
		token := app.getMaaSTokenForModel(ctx, k8sClient, identity, namespace, modelID, "")
		return inferenceURL, token, nil

	default:
		return app.resolveNamespaceModel(ctx, k8sClient, identity, namespace, modelID)
	}
}

// resolveNamespaceModel resolves a namespace model (InferenceService/LLMInferenceService)
// to its endpoint URL. Auth token is the user's JWT.
func (app *App) resolveNamespaceModel(ctx context.Context, k8sClient k8s.KubernetesClientInterface, identity *integrations.RequestIdentity, namespace, modelID string) (string, string, error) {
	// Strip provider prefix if present (e.g. "vllm-inference-1/model-name" → "model-name")
	bareModelName := modelID
	if idx := strings.Index(modelID, "/"); idx != -1 {
		bareModelName = modelID[idx+1:]
	}

	isvcURL, err := k8sClient.GetInferenceServiceURL(ctx, identity, namespace, bareModelName)
	if err != nil {
		return "", "", fmt.Errorf("InferenceService not found for model %q: %w", bareModelName, err)
	}
	if isvcURL == "" {
		return "", "", fmt.Errorf("empty URL for model %q", bareModelName)
	}

	return isvcURL, identity.Token, nil
}
