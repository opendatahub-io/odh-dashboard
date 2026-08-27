package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
)

// GenAIProxyNSChatCompletionsHandler handles POST /api/v1/genai-proxy/ns/:namespace/v1/chat/completions.
//
// Accepts an OpenAI-compatible chat completion request (non-streaming only),
// resolves the model to a concrete endpoint and credentials, and proxies the
// request directly to the upstream model. Returns the upstream response unchanged.
//
// Streaming (stream:true) is handled by a separate endpoint (RHOAIENG-79575).
//
// Auth is required: OGX forwards the user's JWT via Authorization: Bearer
// (from passthrough_api_key in X-OGX-Provider-Data). AttachNamespaceFromPath
// and RequireAccessToService middleware run before this handler.
func (app *App) GenAIProxyNSChatCompletionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	namespace, _ := ctx.Value(constants.NamespaceQueryParameterKey).(string)

	// Defense-in-depth: middleware enforces auth, but verify identity is present.
	if identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity); !ok || identity == nil || identity.Token == "" {
		app.unauthorizedResponse(w, r, errors.New("missing authentication identity"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, constants.ChatCompletionMaxBodySize)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode: http.StatusRequestEntityTooLarge,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "413",
					Message: "request body exceeds the 5MB limit",
				},
			})
			return
		}
		app.badRequestResponse(w, r, fmt.Errorf("failed to read request body: %w", err))
		return
	}

	var reqBody struct {
		Model    string          `json:"model"`
		Messages json.RawMessage `json:"messages"`
		Stream   *bool           `json:"stream"`
	}
	if err := json.Unmarshal(body, &reqBody); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid JSON in request body: %w", err))
		return
	}
	if reqBody.Model == "" {
		app.badRequestResponse(w, r, errors.New("missing required field: model"))
		return
	}
	if len(reqBody.Messages) == 0 || string(reqBody.Messages) == "null" {
		app.badRequestResponse(w, r, errors.New("missing required field: messages"))
		return
	}
	// Validate messages is a JSON array
	if reqBody.Messages[0] != '[' {
		app.badRequestResponse(w, r, errors.New("messages must be a JSON array"))
		return
	}
	isStreaming := reqBody.Stream != nil && *reqBody.Stream

	// Extract MaaS subscription from provider data (forwarded by OGX via forward_headers).
	maasSubscription := r.Header.Get(constants.MaaSSubscriptionHeader)

	// Resolve model → endpoint URL + credentials
	baseURL, apiKey, resolveErr := app.resolveProxyModelEndpoint(ctx, reqBody.Model, namespace, maasSubscription)
	if resolveErr != nil {
		app.logger.Warn("Model resolution failed", "model", reqBody.Model, "error", resolveErr)
		if isProxyInfraError(resolveErr) {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to resolve model %q: %w", reqBody.Model, resolveErr))
		} else {
			app.notFoundResponse(w, r)
		}
		return
	}

	// Strip provider prefix and MaaS prefix from model ID in the proxied body.
	// OGX may or may not strip the provider prefix before forwarding. Handle both:
	//   "genai-bff-proxy/maas-publishers/llm/models/x" → "publishers/llm/models/x"
	//   "maas-publishers/llm/models/x"                 → "publishers/llm/models/x"
	upstreamBody := body
	upstreamModel := reqBody.Model
	passthroughPrefix := constants.PassthroughProviderID + "/"
	upstreamModel = strings.TrimPrefix(upstreamModel, passthroughPrefix)
	upstreamModel = strings.TrimPrefix(upstreamModel, constants.MaaSProviderPrefix)
	if upstreamModel != reqBody.Model {
		var bodyMap map[string]json.RawMessage
		if err := json.Unmarshal(body, &bodyMap); err == nil {
			quotedModel, _ := json.Marshal(upstreamModel)
			bodyMap["model"] = quotedModel
			if rewritten, err := json.Marshal(bodyMap); err == nil {
				upstreamBody = rewritten
			}
		}
	}

	// Normalize base URL to include /v1 if missing
	baseURL = strings.TrimSuffix(baseURL, "/")
	if !strings.HasSuffix(baseURL, "/v1") {
		baseURL += "/v1"
	}

	// Proxy the request to upstream.
	// Use a dedicated client with 3-min timeout — LLM chat completions can take longer
	// than the BFF's default httpClient timeout (92s, tuned for ASR transcription).
	// Reuse the same TLS transport for connection pooling and cert trust.
	const chatCompletionTimeout = 3 * time.Minute
	proxyClient := &http.Client{
		Timeout:   chatCompletionTimeout,
		Transport: app.httpClient.Transport,
	}

	upstreamURL := baseURL + "/chat/completions"
	proxyReq, err := http.NewRequestWithContext(ctx, http.MethodPost, upstreamURL, strings.NewReader(string(upstreamBody)))
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create upstream request: %w", err))
		return
	}
	proxyReq.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		proxyReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := proxyClient.Do(proxyReq)
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

	// Copy upstream response headers, excluding hop-by-hop headers (RFC 7230 §6.1)
	// and framing headers invalidated by buffering.
	hopByHop := map[string]bool{
		"connection":          true,
		"keep-alive":          true,
		"proxy-authenticate":  true,
		"proxy-authorization": true,
		"te":                  true,
		"trailer":             true,
		"transfer-encoding":   true,
		"upgrade":             true,
		"content-length":      true,
	}
	for key, values := range resp.Header {
		if hopByHop[strings.ToLower(key)] {
			continue
		}
		for _, v := range values {
			w.Header().Add(key, v)
		}
	}
	if isStreaming {
		w.WriteHeader(resp.StatusCode)
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
		// Forward the upstream response unchanged (transparent proxy).
		// Limit read to 10MB to prevent memory exhaustion from malicious/faulty upstreams.
		// If the response exceeds the limit, return 502 instead of silently truncating.
		const maxResponseBytes int64 = 10 * 1024 * 1024
		limitedReader := io.LimitReader(resp.Body, maxResponseBytes+1)
		respBody, err := io.ReadAll(limitedReader)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to read upstream response: %w", err))
			return
		}
		if int64(len(respBody)) > maxResponseBytes {
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode: http.StatusBadGateway,
				ErrorResponse: integrations.ErrorResponse{
					Code:    "502",
					Message: "upstream response too large (exceeds 10MB limit)",
				},
			})
			return
		}
		w.WriteHeader(resp.StatusCode)
		_, _ = w.Write(respBody)
	}
}

// resolveProxyModelEndpoint resolves a model ID to its upstream endpoint URL and API key.
// maasSubscription is the optional MaaS subscription name (from X-MaaS-Subscription header,
// forwarded by OGX via forward_headers). When non-empty, getMaaSTokenForModel uses it to
// issue a properly-scoped ephemeral token.
func (app *App) resolveProxyModelEndpoint(ctx context.Context, modelID, namespace, maasSubscription string) (baseURL, apiKey string, err error) {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		return "", "", fmt.Errorf("missing RequestIdentity in context")
	}

	k8sClient, k8sErr := app.kubernetesClientFactory.GetClient(ctx)
	if k8sErr != nil {
		return "", "", &proxyInfraError{msg: fmt.Sprintf("failed to get Kubernetes client: %v", k8sErr)}
	}

	// Strip passthrough provider prefix if present. OGX may forward the full
	// provider-qualified ID (e.g., "genai-bff-proxy/maas-model") to this handler.
	modelID = strings.TrimPrefix(modelID, constants.PassthroughProviderID+"/")

	// Resolution priority:
	// 1. MaaS (maas- prefix) → MaaS BFF catalog URL + ephemeral token
	// 2. Custom endpoint → ConfigMap + Secret (tried for all IDs, not just slash-qualified)
	// 3. Namespace ISVC fallback (bare name) → InferenceService URL + user JWT
	if strings.HasPrefix(modelID, constants.MaaSProviderPrefix) {
		if app.bffClientFactory == nil || !app.bffClientFactory.IsTargetConfigured(bffclient.BFFTargetMaaS) {
			return "", "", &proxyInfraError{msg: "MaaS is not available"}
		}
		// Strip "maas-" prefix to get the raw MaaS model ID (e.g. "publishers/llm/models/gemini-proxy")
		// used by the MaaS BFF catalog.
		maasModelID := strings.TrimPrefix(modelID, constants.MaaSProviderPrefix)

		maasHeaders := map[string]string{constants.MaaSReturnAllModelsHeader: "true"}
		maasClient := app.bffClientFactory.CreateClientWithHeaders(bffclient.BFFTargetMaaS, identity.Token, maasHeaders)
		ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(bffclient.BFFTargetMaaS)), maasClient)

		inferenceURL, urlErr := app.resolveMaaSModelInferenceURL(ctx, identity, maasModelID)
		if urlErr != nil {
			return "", "", fmt.Errorf("failed to resolve MaaS inference URL: %w", urlErr)
		}

		token := app.getMaaSTokenForModel(ctx, k8sClient, identity, namespace, maasModelID, maasSubscription)
		if token == "" {
			return "", "", &proxyInfraError{msg: fmt.Sprintf("failed to obtain auth token for MaaS model %q", maasModelID)}
		}
		return inferenceURL, token, nil
	}

	// Try custom endpoint — model IDs may be simple names (e.g. "gpt-4o") or
	// provider-qualified (e.g. "openai/gpt-4o"). Check the ConfigMap for either form.
	extURL, extKey := app.getCustomEndpointBaseURLAndKey(ctx, modelID)
	if extURL != "" {
		return extURL, extKey, nil
	}

	// Fallback: namespace ISVC (bare name or failed custom endpoint lookup)
	return app.resolveProxyNamespaceModel(ctx, k8sClient, identity, namespace, modelID)
}

// resolveProxyNamespaceModel resolves a namespace model to its endpoint URL.
func (app *App) resolveProxyNamespaceModel(ctx context.Context, k8sClient k8s.KubernetesClientInterface, identity *integrations.RequestIdentity, namespace, modelID string) (string, string, error) {
	bareModelName := modelID
	if idx := strings.Index(modelID, "/"); idx != -1 {
		bareModelName = modelID[idx+1:]
	}

	isvcURL, err := k8sClient.GetInferenceServiceURL(ctx, identity, namespace, bareModelName)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return "", "", fmt.Errorf("model %q not found: %w", bareModelName, err)
		}
		return "", "", &proxyInfraError{msg: fmt.Sprintf("failed to resolve model %q: %v", bareModelName, err)}
	}
	if isvcURL == "" {
		return "", "", fmt.Errorf("empty URL for model %q", bareModelName)
	}

	return isvcURL, identity.Token, nil
}

// proxyInfraError signals an infrastructure failure (K8s client unavailable, MaaS down)
// as opposed to a "model not found" scenario. Used to distinguish 500/502 from 404.
type proxyInfraError struct {
	msg string
}

func (e *proxyInfraError) Error() string { return e.msg }

func isProxyInfraError(err error) bool {
	if err == nil {
		return false
	}
	var ie *proxyInfraError
	if errors.As(err, &ie) {
		return true
	}
	return strings.Contains(err.Error(), "failed to get Kubernetes client")
}
