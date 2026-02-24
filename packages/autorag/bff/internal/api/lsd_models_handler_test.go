package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	ls "github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
)

// newTestApp creates an App wired with a mock LlamaStack client factory and a discard logger.
// A non-nil logger is required because error paths call app.logger.Error via serverErrorResponse.
func newTestApp(t *testing.T) *App {
	t.Helper()
	return &App{
		config:                  config.EnvConfig{Port: 4000},
		logger:                  slog.New(slog.NewTextHandler(io.Discard, nil)),
		llamaStackClientFactory: lsmocks.NewMockClientFactory(),
		repositories:            repositories.NewRepositories(),
	}
}

// newHandlerTestRequest creates a GET request with the LlamaStack client already injected into
// context, simulating what AttachLlamaStackClient middleware does in production.
func newHandlerTestRequest(t *testing.T, app *App) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models?namespace=test-namespace", nil)
	assert.NoError(t, err)

	llamaStackClient := app.llamaStackClientFactory.CreateClient("http://test", "token", false, nil, "/v1")
	ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
	req = req.WithContext(ctx)

	return rr, req
}

func TestLlamaStackModelsHandler_Success(t *testing.T) {
	app := newTestApp(t)

	t.Run("should return categorized models successfully", func(t *testing.T) {
		rr, req := newHandlerTestRequest(t, app)
		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

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
		rr, req := newHandlerTestRequest(t, app)
		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

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
		rr, req := newHandlerTestRequest(t, app)
		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		dataField := response["data"].(map[string]interface{})
		llmModels := dataField["llm_models"].([]interface{})

		// Verify all models in llm_models have type == "llm"
		for _, model := range llmModels {
			m := model.(map[string]interface{})
			assert.Equal(t, "llm", m["type"].(string), "All models in llm_models should have type='llm'")
		}
	})

	t.Run("should return empty arrays when LlamaStack has no models", func(t *testing.T) {
		emptyApp := newTestApp(t)
		emptyApp.llamaStackClientFactory.(*lsmocks.MockClientFactory).SetMockClient(&mockEmptyClient{})

		rr, req := newHandlerTestRequest(t, emptyApp)
		emptyApp.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		dataField := response["data"].(map[string]interface{})
		assert.Len(t, dataField["models"].([]interface{}), 0, "Should return empty models array")
		assert.Len(t, dataField["llm_models"].([]interface{}), 0, "Should return empty llm_models array")
		assert.Len(t, dataField["embedding_models"].([]interface{}), 0, "Should return empty embedding_models array")
	})

	t.Run("should correctly categorize embedding models", func(t *testing.T) {
		rr, req := newHandlerTestRequest(t, app)
		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		dataField := response["data"].(map[string]interface{})
		embeddingModels := dataField["embedding_models"].([]interface{})

		// Verify all models in embedding_models have type == "embedding"
		for _, model := range embeddingModels {
			m := model.(map[string]interface{})
			assert.Equal(t, "embedding", m["type"].(string), "All models in embedding_models should have type='embedding'")
		}
	})
}

func TestLlamaStackModelsHandler_ErrorCases(t *testing.T) {
	app := newTestApp(t)

	t.Run("should return 400 when namespace query parameter is missing", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models", nil) // no ?namespace=
		assert.NoError(t, err)

		// Run through the full middleware chain — AttachNamespace rejects the request before
		// the handler is reached, verifying the end-to-end 400 behaviour.
		app.AttachNamespace(app.LlamaStackModelsHandler)(rr, req, nil)

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
		req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models", nil)
		assert.NoError(t, err)

		// Don't add client to context - simulate middleware failure
		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
	})

	t.Run("should return 500 when LlamaStack client returns error", func(t *testing.T) {
		errApp := newTestApp(t)
		errApp.llamaStackClientFactory.(*lsmocks.MockClientFactory).SetMockClient(&mockErrorClient{})

		rr, req := newHandlerTestRequest(t, errApp)
		errApp.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))
		assert.Contains(t, response, "error")
	})

	t.Run("should return 502 when LlamaStack client returns a connection error", func(t *testing.T) {
		lsErrApp := newTestApp(t)
		lsErrApp.llamaStackClientFactory.(*lsmocks.MockClientFactory).SetMockClient(&mockLlamaStackErrClient{})

		rr, req := newHandlerTestRequest(t, lsErrApp)
		lsErrApp.LlamaStackModelsHandler(rr, req, nil)

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

// mockErrorClient is a mock client that always returns a generic error
type mockErrorClient struct{}

var _ ls.LlamaStackClientInterface = (*mockErrorClient)(nil)

func (m *mockErrorClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return nil, assert.AnError
}

// mockEmptyClient is a mock client that returns an empty models list
type mockEmptyClient struct{}

var _ ls.LlamaStackClientInterface = (*mockEmptyClient)(nil)

func (m *mockEmptyClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return []openai.Model{}, nil
}

// mockLlamaStackErrClient is a mock client that returns a typed LlamaStackError (connection failure)
type mockLlamaStackErrClient struct{}

var _ ls.LlamaStackClientInterface = (*mockLlamaStackErrClient)(nil)

func (m *mockLlamaStackErrClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return nil, ls.NewConnectionError("mock: could not reach LlamaStack server")
}
