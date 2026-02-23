package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	ls "github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func TestLlamaStackModelsHandler_Success(t *testing.T) {
	// Create test app with mock LlamaStack client factory
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	t.Run("should return categorized models successfully", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models?namespace=test-namespace", nil)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create client and add to context
		llamaStackClient := app.llamaStackClientFactory.CreateClient("http://test", "token", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")

		// Verify data structure contains all three arrays
		dataField := response["data"].(map[string]interface{})
		assert.Contains(t, dataField, "models")
		assert.Contains(t, dataField, "llm_models")
		assert.Contains(t, dataField, "embedding_models")

		// Verify models array contains all models (7 total from mock)
		models := dataField["models"].([]interface{})
		assert.Len(t, models, 7, "Should return all 7 models")

		// Verify LLM models array (4 LLM models from mock)
		llmModels := dataField["llm_models"].([]interface{})
		assert.Len(t, llmModels, 4, "Should return 4 LLM models")

		// Verify embedding models array (3 embedding models from mock)
		embeddingModels := dataField["embedding_models"].([]interface{})
		assert.Len(t, embeddingModels, 3, "Should return 3 embedding models")
	})

	t.Run("should have correct stable API model structure", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models?namespace=test-namespace", nil)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient("http://test", "token", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		dataField := response["data"].(map[string]interface{})
		models := dataField["models"].([]interface{})

		// Verify first model has stable public API structure
		firstModel := models[0].(map[string]interface{})
		assert.Contains(t, firstModel, "id")
		assert.Contains(t, firstModel, "type")
		assert.Contains(t, firstModel, "provider")
		assert.Contains(t, firstModel, "resource_path")

		// Verify mock model values
		assert.Equal(t, "llama3.2:3b", firstModel["id"])
		assert.Equal(t, "llm", firstModel["type"])
		assert.Equal(t, "ollama", firstModel["provider"])
		assert.Equal(t, "ollama://models/llama3.2:3b", firstModel["resource_path"])
	})

	t.Run("should correctly categorize LLM models", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models?namespace=test-namespace", nil)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient("http://test", "token", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		dataField := response["data"].(map[string]interface{})
		llmModels := dataField["llm_models"].([]interface{})

		// Verify all models in llm_models have type == "llm"
		for _, model := range llmModels {
			m := model.(map[string]interface{})
			modelType := m["type"].(string)
			assert.Equal(t, "llm", modelType, "All models in llm_models should have type='llm'")
		}
	})

	t.Run("should correctly categorize embedding models", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models?namespace=test-namespace", nil)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient("http://test", "token", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		dataField := response["data"].(map[string]interface{})
		embeddingModels := dataField["embedding_models"].([]interface{})

		// Verify all models in embedding_models have type == "embedding"
		for _, model := range embeddingModels {
			m := model.(map[string]interface{})
			modelType := m["type"].(string)
			assert.Equal(t, "embedding", modelType, "All models in embedding_models should have type='embedding'")
		}
	})
}

func TestLlamaStackModelsHandler_ErrorCases(t *testing.T) {
	llamaStackClientFactory := lsmocks.NewMockClientFactory()
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))

	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		logger:                  logger,
		llamaStackClientFactory: llamaStackClientFactory,
		repositories:            repositories.NewRepositories(),
	}

	t.Run("should return 500 when LlamaStack client is missing from context", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models", nil)
		assert.NoError(t, err)

		// Don't add client to context - simulate middleware failure
		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify error response structure
		assert.Contains(t, response, "error")
	})

	t.Run("should return 500 when LlamaStack client returns error", func(t *testing.T) {
		// Create a custom mock client that returns an error
		mockClientWithError := &mockErrorClient{}
		mockFactory := lsmocks.NewMockClientFactory().(*lsmocks.MockClientFactory)
		mockFactory.SetMockClient(mockClientWithError)

		// Create a logger for the test
		logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))

		appWithError := App{
			config: config.EnvConfig{
				Port: 4000,
			},
			logger:                  logger,
			llamaStackClientFactory: mockFactory,
			repositories:            repositories.NewRepositories(),
		}

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models?namespace=test-namespace", nil)
		assert.NoError(t, err)

		// Simulate AttachLlamaStackClient middleware: create error client and add to context
		llamaStackClient := mockFactory.CreateClient("http://test", "token", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		appWithError.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify error response structure
		assert.Contains(t, response, "error")
	})

	t.Run("should use repository pattern", func(t *testing.T) {
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.LSDModels)

		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models?namespace=test-namespace", nil)
		assert.NoError(t, err)

		llamaStackClient := app.llamaStackClientFactory.CreateClient("http://test", "token", false, nil, "/v1")
		ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
		req = req.WithContext(ctx)

		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})
}

// mockErrorClient is a mock client that always returns an error
type mockErrorClient struct{}

// Ensure mockErrorClient implements LlamaStackClientInterface
var _ ls.LlamaStackClientInterface = (*mockErrorClient)(nil)

func (m *mockErrorClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return nil, assert.AnError
}
