package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"

	"github.com/julienschmidt/httprouter"
	. "github.com/onsi/ginkgo/v2"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var _ = Describe("GenAIProxyNSChatCompletionsHandler", func() {
	var app App

	BeforeEach(func() {
		app = NewK8sLSTestApp()
	})

	It("should return 401 without auth identity", func() {
		body := `{"model":"some-model","messages":[{"role":"user","content":"hi"}]}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/chat/completions", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSChatCompletionsHandler(rr, req, params)

		assert.Equal(GinkgoT(), http.StatusUnauthorized, rr.Code)
	})

	It("should return 400 when model field is missing", func() {
		t := GinkgoT()
		body := `{"messages":[{"role":"user","content":"hi"}]}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/chat/completions", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSChatCompletionsHandler(rr, req, params)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		var errResp map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &errResp)
		require.NoError(t, err)
		assert.Contains(t, errResp["error"].(map[string]interface{})["message"], "model")
	})

	It("should return 400 when messages field is missing", func() {
		t := GinkgoT()
		body := `{"model":"some-model"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/chat/completions", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSChatCompletionsHandler(rr, req, params)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		var errResp map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &errResp)
		require.NoError(t, err)
		assert.Contains(t, errResp["error"].(map[string]interface{})["message"], "messages")
	})

	It("should return 400 when stream is true", func() {
		t := GinkgoT()
		body := `{"model":"some-model","messages":[{"role":"user","content":"hi"}],"stream":true}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/chat/completions", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSChatCompletionsHandler(rr, req, params)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		var errResp map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &errResp)
		require.NoError(t, err)
		assert.Contains(t, errResp["error"].(map[string]interface{})["message"], "streaming")
	})

	It("should return 400 when messages is not a JSON array", func() {
		t := GinkgoT()
		body := `{"model":"some-model","messages":{"role":"user","content":"hi"}}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/chat/completions", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSChatCompletionsHandler(rr, req, params)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		var errResp map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &errResp)
		require.NoError(t, err)
		assert.Contains(t, errResp["error"].(map[string]interface{})["message"], "array")
	})

	It("should return 413 when request body exceeds size limit", func() {
		t := GinkgoT()
		oversized := `{"model":"m","messages":[{"role":"user","content":"` + strings.Repeat("x", 6*1024*1024) + `"}]}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/chat/completions", strings.NewReader(oversized))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSChatCompletionsHandler(rr, req, params)

		assert.Equal(t, http.StatusRequestEntityTooLarge, rr.Code)
	})

	It("should strip provider prefix from model ID when proxying", func() {
		t := GinkgoT()

		var receivedModel string
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqBody, _ := io.ReadAll(r.Body)
			var parsed map[string]interface{}
			_ = json.Unmarshal(reqBody, &parsed)
			receivedModel, _ = parsed["model"].(string)
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, `{"id":"chatcmpl-1","object":"chat.completion","choices":[]}`)
		}))
		defer upstream.Close()

		app.httpClient = &http.Client{
			Transport: &redirectTransport{target: upstream.URL},
		}

		body := `{"model":"vllm-1/llama-32-3b-instruct","messages":[{"role":"user","content":"hi"}]}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/mock-test-namespace-1/v1/chat/completions", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "mock-test-namespace-1"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSChatCompletionsHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "llama-32-3b-instruct", receivedModel)
	})

	It("should return 404 when model is not found", func() {
		t := GinkgoT()
		body := `{"model":"nonexistent-model","messages":[{"role":"user","content":"hi"}]}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/chat/completions", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-ns")
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSChatCompletionsHandler(rr, req, params)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})

	It("should proxy request to upstream and return response (happy path)", func() {
		t := GinkgoT()

		upstreamResponse := `{"id":"chatcmpl-123","object":"chat.completion","choices":[{"message":{"role":"assistant","content":"Hello!"}}]}`
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, http.MethodPost, r.Method)
			assert.Contains(t, r.URL.Path, "/chat/completions")
			assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

			reqBody, err := io.ReadAll(r.Body)
			require.NoError(t, err)
			var parsed map[string]interface{}
			require.NoError(t, json.Unmarshal(reqBody, &parsed))
			assert.Equal(t, "llama-32-3b-instruct", parsed["model"])

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, upstreamResponse)
		}))
		defer upstream.Close()

		// Redirect all outgoing HTTP to our test server regardless of target URL.
		app.httpClient = &http.Client{
			Transport: &redirectTransport{target: upstream.URL},
		}

		body := `{"model":"llama-32-3b-instruct","messages":[{"role":"user","content":"hi"}]}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/mock-test-namespace-1/v1/chat/completions", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "mock-test-namespace-1")
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "mock-test-namespace-1"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSChatCompletionsHandler(rr, req, params)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Header().Get("Content-Type"), "application/json")
		assert.Contains(t, rr.Body.String(), "chatcmpl-123")
	})
})

// redirectTransport intercepts all HTTP requests and rewrites their URL to point
// at a local test server, preserving the original path and query.
type redirectTransport struct {
	target string
}

func (t *redirectTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	clone := req.Clone(req.Context())
	clone.URL.Scheme = "http"
	clone.URL.Host = strings.TrimPrefix(t.target, "http://")
	return http.DefaultTransport.RoundTrip(clone)
}
