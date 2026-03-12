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

// newLSDHandlerTestApp creates a lightweight App wired with a mock LlamaStack client factory
// and a discard logger, for testing LSD handler logic in isolation (no envtest needed).
// A non-nil logger is required because error paths call app.logger.Error via serverErrorResponse.
func newLSDHandlerTestApp(t *testing.T) *App {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return &App{
		config:                  config.EnvConfig{Port: 4000},
		logger:                  logger,
		llamaStackClientFactory: lsmocks.NewMockClientFactory(),
		repositories:            repositories.NewRepositories(logger),
	}
}

// newHandlerTestRequest creates a GET request with the LlamaStack client already injected into
// context, simulating what AttachLlamaStackClientFromSecret middleware does in production.
func newHandlerTestRequest(t *testing.T, app *App) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	rr := httptest.NewRecorder()
	req, err := http.NewRequest(http.MethodGet, "/api/v1/lsd/models?namespace=test-namespace&secretName=test-secret", nil)
	assert.NoError(t, err)

	llamaStackClient := app.llamaStackClientFactory.CreateClient("http://test", "token", false, nil, "/v1")
	ctx := context.WithValue(req.Context(), constants.LlamaStackClientKey, llamaStackClient)
	req = req.WithContext(ctx)

	return rr, req
}

func TestLlamaStackModelsHandler_Success(t *testing.T) {
	app := newLSDHandlerTestApp(t)

	t.Run("should return all models successfully", func(t *testing.T) {
		rr, req := newHandlerTestRequest(t, app)
		app.LlamaStackModelsHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()
		assert.NoError(t, json.Unmarshal(body, &response))

		// Verify response contains data envelope with models array
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "models")

		// Verify models array contains all models (7 total from mock)
		models := data["models"].([]interface{})
		assert.Len(t, models, 7, "Should return all 7 models")
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

		data := response["data"].(map[string]interface{})
		models := data["models"].([]interface{})

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

	t.Run("should return empty array when LlamaStack has no models", func(t *testing.T) {
		emptyApp := newLSDHandlerTestApp(t)
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

		data := response["data"].(map[string]interface{})
		assert.Len(t, data["models"].([]interface{}), 0, "Should return empty models array")
	})
}

func TestLlamaStackModelsHandler_ErrorCases(t *testing.T) {
	app := newLSDHandlerTestApp(t)

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
		errApp := newLSDHandlerTestApp(t)
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
		lsErrApp := newLSDHandlerTestApp(t)
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

func (m *mockErrorClient) ListVectorStores(ctx context.Context) ([]openai.VectorStore, error) {
	return nil, assert.AnError
}

// mockEmptyClient is a mock client that returns an empty models list
type mockEmptyClient struct{}

var _ ls.LlamaStackClientInterface = (*mockEmptyClient)(nil)

func (m *mockEmptyClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return []openai.Model{}, nil
}

func (m *mockEmptyClient) ListVectorStores(ctx context.Context) ([]openai.VectorStore, error) {
	return []openai.VectorStore{}, nil
}

// mockLlamaStackErrClient is a mock client that returns a typed LlamaStackError (connection failure)
type mockLlamaStackErrClient struct{}

var _ ls.LlamaStackClientInterface = (*mockLlamaStackErrClient)(nil)

func (m *mockLlamaStackErrClient) ListModels(ctx context.Context) ([]openai.Model, error) {
	return nil, ls.NewConnectionError("mock: could not reach LlamaStack server")
}

func (m *mockLlamaStackErrClient) ListVectorStores(ctx context.Context) ([]openai.VectorStore, error) {
	return nil, ls.NewConnectionError("mock: could not reach LlamaStack server")
}
