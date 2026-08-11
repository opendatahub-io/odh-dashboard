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

	// Read the full request body — needed both for model extraction and transparent
	// proxying to upstream (body forwarded unchanged).
	body, err := io.ReadAll(r.Body)
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("failed to read request body: %w", err))
		return
	}

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
	baseURL, apiKey, resolveErr := app.resolveModelEndpoint(ctx, reqBody.Model, namespace)
	if resolveErr != nil {
		app.logger.Warn("Model resolution failed", "model", reqBody.Model, "error", resolveErr)
		if isInfraError(resolveErr) {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to resolve model %q: %w", reqBody.Model, resolveErr))
		} else {
			app.notFoundResponse(w, r)
		}
		return
	}

	// Strip provider prefix from model ID in the proxied body.
	// OGX sends "provider/model-name" but the upstream expects just "model-name".
	upstreamBody := body
	if strings.Contains(reqBody.Model, "/") {
		bareModel := reqBody.Model[strings.Index(reqBody.Model, "/")+1:]
		var bodyMap map[string]interface{}
		if err := json.Unmarshal(body, &bodyMap); err == nil {
			bodyMap["model"] = bareModel
			if rewritten, err := json.Marshal(bodyMap); err == nil {
				upstreamBody = rewritten
			}
		}
	}

	// Normalize base URL to include /v1 if missing (per spike findings)
	baseURL = strings.TrimSuffix(baseURL, "/")
	if !strings.HasSuffix(baseURL, "/v1") {
		baseURL += "/v1"
	}

	// Proxy the request to upstream
	upstreamURL := baseURL + "/embeddings"
	proxyReq, err := http.NewRequestWithContext(ctx, http.MethodPost, upstreamURL, strings.NewReader(string(upstreamBody)))
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
		return "", "", &infraError{msg: fmt.Sprintf("failed to get Kubernetes client: %v", k8sErr)}
	}

	// Resolution priority:
	// 1. MaaS (maas- prefix) → MaaS BFF catalog URL + ephemeral token
	// 2. Custom endpoint (provider-qualified with "/") → ConfigMap + Secret
	// 3. Namespace ISVC fallback (bare name) → InferenceService URL + user JWT
	if strings.HasPrefix(modelID, constants.MaaSProviderPrefix) {
		if app.bffClientFactory == nil || !app.bffClientFactory.IsTargetConfigured(bffclient.BFFTargetMaaS) {
			return "", "", &infraError{msg: "MaaS is not available"}
		}
		maasHeaders := map[string]string{constants.MaaSReturnAllModelsHeader: "true"}
		maasClient := app.bffClientFactory.CreateClientWithHeaders(bffclient.BFFTargetMaaS, identity.Token, maasHeaders)
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)

		inferenceURL, urlErr := app.resolveMaaSModelInferenceURL(ctx, identity, modelID)
		if urlErr != nil {
			return "", "", fmt.Errorf("failed to resolve MaaS inference URL: %w", urlErr)
		}
		token := app.getMaaSTokenForModel(ctx, k8sClient, identity, namespace, modelID, "")
		if token == "" {
			return "", "", &infraError{msg: fmt.Sprintf("failed to obtain auth token for MaaS model %q", modelID)}
		}
		return inferenceURL, token, nil
	}

	// Try custom endpoint for provider-qualified IDs (contains "/")
	if strings.Contains(modelID, "/") {
		extURL, extKey := app.getCustomEndpointBaseURLAndKey(ctx, modelID)
		if extURL != "" {
			return extURL, extKey, nil
		}
	}

	// Fallback: namespace ISVC (bare name or failed custom endpoint lookup)
	return app.resolveNamespaceModel(ctx, k8sClient, identity, namespace, modelID)
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

// infraError signals an infrastructure failure (K8s client unavailable, MaaS down)
// as opposed to a "model not found" scenario. Used to distinguish 500/502 from 404.
type infraError struct {
	msg string
}

func (e *infraError) Error() string { return e.msg }

func isInfraError(err error) bool {
	if err == nil {
		return false
	}
	var ie *infraError
	if errors.As(err, &ie) {
		return true
	}
	// K8s client errors are infra errors
	return strings.Contains(err.Error(), "failed to get Kubernetes client")
}
