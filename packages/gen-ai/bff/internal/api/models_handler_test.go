package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
	"github.com/stretchr/testify/assert"
)

func TestLlamaStackModelsHandler(t *testing.T) {
	// Create test app with mock client
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	t.Run("should return all models successfully", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

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
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

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
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.Models)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/gen-ai/api/v1/models?namespace="+testutil.TestNamespace, nil)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient(testutil.TestLlamaStackURL)
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

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
