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

func TestLlamaStackCreateResponseHandler(t *testing.T) {
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

		req, err := http.NewRequest(http.MethodPost, "/genai/v1/responses", bytes.NewBuffer(jsonData))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		return req, nil
	}

	t.Run("should create response with required parameters only", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input: "Hello, how are you?",
			Model: "llama-3.1-8b",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify simplified response structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		assert.Equal(t, "resp_mock123", data["id"])
		assert.Equal(t, "llama-3.1-8b", data["model"])
		assert.Equal(t, "completed", data["status"])
		assert.Contains(t, data, "created_at")
		assert.Contains(t, data, "content")
	})

	t.Run("should create response with all optional parameters", func(t *testing.T) {
		temperature := 0.7
		topP := 0.9

		payload := CreateResponseRequest{
			Input:          "Tell me about AI",
			Model:          "llama-3.1-70b",
			VectorStoreIDs: []string{"vs_test123", "vs_test456"},
			ChatContext: []ChatContextMessage{
				{Role: "user", Content: "What is machine learning?"},
				{Role: "assistant", Content: "Machine learning is a subset of AI."},
			},
			Temperature:  &temperature,
			TopP:         &topP,
			Instructions: "You are a helpful AI assistant.",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "resp_mock123", data["id"])
		assert.Equal(t, "llama-3.1-70b", data["model"])
		assert.Equal(t, "completed", data["status"])
	})

	t.Run("should return error when input is missing", func(t *testing.T) {
		payload := CreateResponseRequest{
			Model: "llama-3.1-8b",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "input is required")
	})

	t.Run("should return error when model is missing", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input: "Hello, world!",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "model is required")
	})

	t.Run("should handle chat context correctly", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input: "Continue the conversation",
			Model: "llama-3.1-8b",
			ChatContext: []ChatContextMessage{
				{Role: "user", Content: "Hello"},
				{Role: "assistant", Content: "Hi there! How can I help you?"},
				{Role: "user", Content: "Tell me about AI"},
			},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "resp_mock123", data["id"])
		assert.Equal(t, "llama-3.1-8b", data["model"])
	})

	t.Run("should handle RAG with vector store IDs", func(t *testing.T) {
		payload := CreateResponseRequest{
			Input:          "Search for information about AI",
			Model:          "llama-3.1-8b",
			VectorStoreIDs: []string{"vs_documents", "vs_knowledge"},
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "resp_mock123", data["id"])
		assert.Equal(t, "completed", data["status"])
	})

	t.Run("should use unified repository pattern", func(t *testing.T) {
		// Verify we're using the unified repository approach
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.LlamaStack)

		payload := CreateResponseRequest{
			Input: "Test unified repository",
			Model: "llama-3.1-8b",
		}

		req, err := createJSONRequest(payload)
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		// Verify simplified response structure
		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		data := response["data"].(map[string]interface{})

		// Verify simplified response contains only essential fields
		expectedFields := []string{"id", "model", "status", "created_at", "content"}
		for _, field := range expectedFields {
			assert.Contains(t, data, field)
		}

		// Verify no complex nested structures from original response
		assert.NotContains(t, data, "output")
		assert.NotContains(t, data, "object")
		assert.NotContains(t, data, "metadata")
	})

	t.Run("should return error for invalid JSON", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodPost, "/genai/v1/responses", bytes.NewBuffer([]byte("invalid json")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		app.LlamaStackCreateResponseHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}
