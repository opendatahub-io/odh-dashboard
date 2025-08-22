package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"encoding/json"
	"io"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/mocks"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func TestLlamaStackModelsHandler(t *testing.T) {
	// Create test app with mock client
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		repositories: repositories.NewRepositories(mocks.NewMockLlamaStackClient()),
	}

	t.Run("should return all models successfully", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/models", nil)
		assert.NoError(t, err)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response ModelsResponse
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify mock returns 2 models
		models := response.Data.([]interface{})
		assert.Len(t, models, 2)
	})

	t.Run("should have correct response structure", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/models", nil)
		assert.NoError(t, err)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		// Parse as generic map to verify structure
		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")

		dataField := response["data"].([]interface{})
		assert.Len(t, dataField, 2)

		// Verify first model structure (OpenAI Model format)
		firstModel := dataField[0].(map[string]interface{})
		assert.Contains(t, firstModel, "id")
		assert.Contains(t, firstModel, "object")
		assert.Contains(t, firstModel, "created")
		assert.Contains(t, firstModel, "owned_by")

		// Verify mock model values
		assert.Equal(t, "ollama/llama3.2:3b", firstModel["id"])
		assert.Equal(t, "model", firstModel["object"])
		assert.Equal(t, "llama_stack", firstModel["owned_by"])
	})

	t.Run("should use unified repository pattern", func(t *testing.T) {
		// Verify we're using the unified repository approach
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.LlamaStack)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/genai/v1/models", nil)
		assert.NoError(t, err)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		// Verify response contains mock data
		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		models := response["data"].([]interface{})
		firstModel := models[0].(map[string]interface{})
		assert.Equal(t, "ollama/llama3.2:3b", firstModel["id"])
	})
}
