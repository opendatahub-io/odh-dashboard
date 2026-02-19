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

	t.Run("should have correct OpenAI model structure", func(t *testing.T) {
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

		// Verify first model has OpenAI-compatible structure
		firstModel := models[0].(map[string]interface{})
		assert.Contains(t, firstModel, "id")
		assert.Contains(t, firstModel, "object")
		assert.Contains(t, firstModel, "created")
		assert.Contains(t, firstModel, "owned_by")

		// Verify mock model values
		assert.Equal(t, "ollama/llama3.2:3b", firstModel["id"])
		assert.Equal(t, "model", firstModel["object"])
		assert.Equal(t, "llama_stack", firstModel["owned_by"])
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

		// Verify LLM models don't contain embedding keywords
		for _, model := range llmModels {
			m := model.(map[string]interface{})
			modelID := m["id"].(string)
			assert.NotContains(t, modelID, "embed", "LLM model should not contain 'embed' keyword")
			assert.NotContains(t, modelID, "all-mini", "LLM model should not contain 'all-mini' keyword")
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

		// Verify embedding models contain expected keywords
		embeddingKeywords := []string{"embed", "all-mini", "nomic"}
		for _, model := range embeddingModels {
			m := model.(map[string]interface{})
			modelID := m["id"].(string)

			// Each embedding model should contain at least one embedding keyword
			hasKeyword := false
			for _, keyword := range embeddingKeywords {
				if containsIgnoreCase(modelID, keyword) {
					hasKeyword = true
					break
				}
			}
			assert.True(t, hasKeyword, "Embedding model %s should contain an embedding keyword", modelID)
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

// Helper functions

// containsIgnoreCase checks if s contains substr (case-insensitive)
func containsIgnoreCase(s, substr string) bool {
	return contains(toLower(s), toLower(substr))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || indexOfSubstring(s, substr) >= 0)
}

func indexOfSubstring(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

func toLower(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			result[i] = c + ('a' - 'A')
		} else {
			result[i] = c
		}
	}
	return string(result)
}

// mockErrorClient is a mock client that always returns an error
type mockErrorClient struct{}

// Ensure mockErrorClient implements LlamaStackClientInterface
var _ ls.LlamaStackClientInterface = (*mockErrorClient)(nil)

func (m *mockErrorClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return nil, assert.AnError
}
