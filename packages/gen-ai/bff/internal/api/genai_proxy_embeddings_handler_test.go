package api

import (
	"context"
	"encoding/json"
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

var _ = Describe("GenAIProxyNSEmbeddingsHandler", func() {
	var app App

	BeforeEach(func() {
		app = NewK8sLSTestApp()
	})

	It("should return 401 without auth identity", func() {
		body := `{"model": "some-model", "input": "hello"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/embeddings", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, params)

		assert.Equal(GinkgoT(), http.StatusUnauthorized, rr.Code)
	})

	It("should return 400 when model field is missing", func() {
		t := GinkgoT()
		body := `{"input": "hello world"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/embeddings", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, params)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var errResp map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &errResp)
		require.NoError(t, err)
		assert.Contains(t, errResp["error"].(map[string]interface{})["message"], "model")
	})

	It("should return 400 for invalid JSON body", func() {
		t := GinkgoT()
		body := `{invalid json`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/embeddings", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, params)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	It("should return 404 when model is not found", func() {
		t := GinkgoT()
		body := `{"model": "nonexistent-model", "input": "hello"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/genai-proxy/ns/test-ns/v1/embeddings", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		identity := &integrations.RequestIdentity{Token: "test-token"}
		ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
		ctx = context.WithValue(ctx, constants.NamespaceQueryParameterKey, "test-ns")
		req = req.WithContext(ctx)

		params := httprouter.Params{{Key: "namespace", Value: "test-ns"}}
		rr := httptest.NewRecorder()
		app.GenAIProxyNSEmbeddingsHandler(rr, req, params)

		assert.Equal(t, http.StatusNotFound, rr.Code)
	})
})
