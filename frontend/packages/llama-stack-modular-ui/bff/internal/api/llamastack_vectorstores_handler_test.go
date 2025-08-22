package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/mocks"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func TestLlamaStackListVectorStoresHandler(t *testing.T) {
	// Create test app with mock client
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		repositories: repositories.NewRepositories(mocks.NewMockLlamaStackClient()),
	}

	t.Run("should list vector stores without parameters", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/vectorstores", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoresResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify mock returns 1 vector store
		vectorStores := response.Data.([]interface{})
		assert.Len(t, vectorStores, 1)

		// Verify first vector store structure
		firstStore := vectorStores[0].(map[string]interface{})
		assert.Equal(t, "vs_mock123", firstStore["id"])
		assert.Equal(t, "Mock Vector Store", firstStore["name"])
		assert.Equal(t, "completed", firstStore["status"])
	})

	t.Run("should list vector stores with limit parameter", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/vectorstores?limit=5", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoresResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStores := response.Data.([]interface{})
		assert.Len(t, vectorStores, 1) // Mock always returns 1
	})

	t.Run("should list vector stores with order parameter", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/vectorstores?order=desc", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoresResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStores := response.Data.([]interface{})
		assert.Len(t, vectorStores, 1)
	})

	t.Run("should list vector stores with both limit and order parameters", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/vectorstores?limit=10&order=asc", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoresResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStores := response.Data.([]interface{})
		assert.Len(t, vectorStores, 1)
	})

	t.Run("should ignore invalid limit parameter", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/vectorstores?limit=invalid", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code) // Should still work, ignore invalid param
	})

	t.Run("should ignore invalid order parameter", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/vectorstores?order=invalid", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code) // Should still work, ignore invalid param
	})

	t.Run("should use unified repository pattern", func(t *testing.T) {
		// Verify we're using the unified repository approach
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.LlamaStack)

		req, err := http.NewRequest(http.MethodGet, "/genai/v1/vectorstores", nil)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackListVectorStoresHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})
}

func TestLlamaStackCreateVectorStoreHandler(t *testing.T) {
	// Create test app with mock client
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		repositories: repositories.NewRepositories(mocks.NewMockLlamaStackClient()),
	}

	// Helper function to create JSON request
	createJSONRequest := func(payload interface{}) (*http.Request, error) {
		jsonData, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}

		req, err := http.NewRequest(http.MethodPost, "/genai/v1/vectorstores", bytes.NewBuffer(jsonData))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		return req, nil
	}

	t.Run("should create vector store with name only", func(t *testing.T) {
		payload := CreateVectorStoreRequest{
			Name: "Test Vector Store",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoreResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify mock response structure
		vectorStore := response.Data.(map[string]interface{})
		assert.Equal(t, "vs_mock_new123", vectorStore["id"])
		assert.Equal(t, "Test Vector Store", vectorStore["name"])
		assert.Equal(t, "completed", vectorStore["status"])
	})

	t.Run("should create vector store with name and metadata", func(t *testing.T) {
		payload := CreateVectorStoreRequest{
			Name: "Test Vector Store with Metadata",
			Metadata: map[string]string{
				"purpose":     "testing",
				"environment": "development",
				"team":        "engineering",
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoreResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStore := response.Data.(map[string]interface{})
		assert.Equal(t, "vs_mock_new123", vectorStore["id"])
		assert.Equal(t, "Test Vector Store with Metadata", vectorStore["name"])
	})

	t.Run("should handle empty name", func(t *testing.T) {
		payload := CreateVectorStoreRequest{
			Name: "",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		// Should still work - name validation happens in client layer
		assert.Equal(t, http.StatusCreated, rr.Code)
	})

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, "/genai/v1/vectorstores", bytes.NewBuffer([]byte("invalid json")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "error")
	})

	t.Run("should use unified repository pattern", func(t *testing.T) {
		// Verify we're using the unified repository approach
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.LlamaStack)

		payload := CreateVectorStoreRequest{
			Name: "Repository Pattern Test",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		// Verify response structure
		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		// Verify vector store fields
		expectedFields := []string{"id", "object", "created_at", "name", "status"}
		for _, field := range expectedFields {
			assert.Contains(t, data, field)
		}
	})

	t.Run("should handle metadata correctly", func(t *testing.T) {
		metadata := map[string]string{
			"key1": "value1",
			"key2": "value2",
		}

		payload := CreateVectorStoreRequest{
			Name:     "Metadata Test Store",
			Metadata: metadata,
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateVectorStoreHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response VectorStoreResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		vectorStore := response.Data.(map[string]interface{})
		assert.Equal(t, "Metadata Test Store", vectorStore["name"])
		assert.Contains(t, vectorStore, "metadata")
	})
}
