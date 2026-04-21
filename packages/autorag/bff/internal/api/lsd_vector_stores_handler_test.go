package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack/lsmocks"
	"github.com/stretchr/testify/assert"
)

func TestLlamaStackVectorStoresHandler_Success(t *testing.T) {
	app := newLSDHandlerTestApp(t)

	t.Run("should return vector_io providers only", func(t *testing.T) {
		rr, req := newHandlerTestRequest(t, app)
		app.LlamaStackVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "vector_store_providers")

		providers := data["vector_store_providers"].([]interface{})
		// Mock returns 3 providers total: 2 vector_io + 1 inference. Only vector_io should be returned.
		assert.Len(t, providers, 2, "Should return only the 2 vector_io providers from mock")
	})

	t.Run("should have correct stable API provider structure", func(t *testing.T) {
		rr, req := newHandlerTestRequest(t, app)
		app.LlamaStackVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data := response["data"].(map[string]interface{})
		providers := data["vector_store_providers"].([]interface{})

		first := providers[0].(map[string]interface{})
		assert.Contains(t, first, "provider_id")
		assert.Contains(t, first, "provider_type")

		assert.Equal(t, "milvus", first["provider_id"])
		assert.Equal(t, "remote::milvus", first["provider_type"])
	})

	t.Run("should return empty array when LlamaStack has no providers", func(t *testing.T) {
		emptyApp := newLSDHandlerTestApp(t)
		emptyApp.llamaStackClientFactory.(*lsmocks.MockClientFactory).SetMockClient(&mockEmptyClient{})

		rr, req := newHandlerTestRequest(t, emptyApp)
		emptyApp.LlamaStackVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		data := response["data"].(map[string]interface{})
		assert.Len(t, data["vector_store_providers"].([]interface{}), 0, "Should return empty providers array")
	})
}

func TestLlamaStackVectorStoresHandler_ErrorCases(t *testing.T) {
	app := newLSDHandlerTestApp(t)

	t.Run("should return 400 when namespace query parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/vector-stores", nil)
		assert.NoError(t, err)

		app.AttachNamespace(app.LlamaStackVectorStoresHandler)(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
	})

	t.Run("should return 400 when secretName query parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/vector-stores?namespace=test-namespace", nil)
		assert.NoError(t, err)

		app.AttachNamespace(app.AttachLlamaStackClientFromSecret(app.LlamaStackVectorStoresHandler))(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
	})

	t.Run("should return 500 when LlamaStack client is missing from context", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/vector-stores", nil)
		assert.NoError(t, err)

		app.LlamaStackVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
	})

	t.Run("should return 500 when LlamaStack client returns error", func(t *testing.T) {
		errApp := newLSDHandlerTestApp(t)
		errApp.llamaStackClientFactory.(*lsmocks.MockClientFactory).SetMockClient(&mockErrorClient{})

		rr, req := newHandlerTestRequest(t, errApp)
		errApp.LlamaStackVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
	})

	t.Run("should return 502 when LlamaStack client returns a connection error", func(t *testing.T) {
		lsErrApp := newLSDHandlerTestApp(t)
		lsErrApp.llamaStackClientFactory.(*lsmocks.MockClientFactory).SetMockClient(&mockLlamaStackErrClient{})

		rr, req := newHandlerTestRequest(t, lsErrApp)
		lsErrApp.LlamaStackVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadGateway, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
		errField := response["error"].(map[string]interface{})
		assert.Equal(t, "bad_gateway", errField["code"])
	})
}
