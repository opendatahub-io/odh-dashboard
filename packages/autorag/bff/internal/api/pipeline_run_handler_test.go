package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func newMinimalTestApp() *App {
	return &App{
		config:       config.EnvConfig{AuthMethod: config.AuthMethodInternal},
		logger:       slog.Default(),
		repositories: repositories.NewRepositories(),
	}
}

func validCreateRequest() models.CreateAutoRAGRunRequest {
	return models.CreateAutoRAGRunRequest{
		DisplayName:          "test-run",
		Description:          "a test run",
		TestDataSecretName:   "test-secret",
		TestDataBucketName:   "test-bucket",
		TestDataKey:          "test-key",
		InputDataSecretName:  "input-secret",
		InputDataBucketName:  "input-bucket",
		InputDataKey:         "input-key",
		LlamaStackSecretName: "llama-secret",
		OptimizationMetric:   "faithfulness",
	}
}

func newCreateRequest(t *testing.T, body interface{}) *http.Request {
	t.Helper()
	b, err := json.Marshal(body)
	assert.NoError(t, err)
	req, err := http.NewRequest(http.MethodPost,
		"/api/v1/pipeline-runs?namespace=test-ns&pipelineServerId=dspa",
		bytes.NewReader(b))
	assert.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func withPipelineClient(req *http.Request, client ps.PipelineServerClientInterface) *http.Request {
	ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, client)
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-ns")
	return req.WithContext(ctx)
}

func TestCreatePipelineRunHandler_Success(t *testing.T) {
	app := newMinimalTestApp()
	mockClient := psmocks.NewMockPipelineServerClient()

	t.Run("should create run with all required fields", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validCreateRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data)
		assert.NotEmpty(t, response.Data.RunID)
		assert.Equal(t, "test-run", response.Data.DisplayName)
		assert.Equal(t, "PENDING", response.Data.State)
	})

	t.Run("should default optimization_metric to faithfulness", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		body.OptimizationMetric = ""
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data)
		assert.NotNil(t, response.Data.RuntimeConfig)
		metric, ok := response.Data.RuntimeConfig.Parameters["optimization_metric"]
		assert.True(t, ok)
		assert.Equal(t, "faithfulness", metric)
	})

	t.Run("should accept answer_correctness metric", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		body.OptimizationMetric = "answer_correctness"
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)
	})

	t.Run("should accept context_correctness metric", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		body.OptimizationMetric = "context_correctness"
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)
	})

	t.Run("should include optional fields when provided", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		body.EmbeddingsModels = []string{"model-a", "model-b"}
		body.GenerationModels = []string{"gen-model"}
		body.VectorDatabaseID = "vectordb-1"
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data.RuntimeConfig)
		params := response.Data.RuntimeConfig.Parameters
		assert.NotNil(t, params["embeddings_models"])
		assert.NotNil(t, params["generation_models"])
		assert.Equal(t, "vectordb-1", params["vector_database_id"])
	})
}

func TestCreatePipelineRunHandler_Validation(t *testing.T) {
	app := newMinimalTestApp()
	mockClient := psmocks.NewMockPipelineServerClient()

	t.Run("should reject empty body", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost,
			"/api/v1/pipeline-runs?namespace=test-ns&pipelineServerId=dspa",
			bytes.NewReader([]byte("")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		req = withPipelineClient(req, mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should reject missing required fields", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := models.CreateAutoRAGRunRequest{DisplayName: "only-name"}
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "test_data_secret_name")
	})

	t.Run("should reject invalid optimization_metric", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		body.OptimizationMetric = "invalid_metric"
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "invalid optimization_metric")
	})

	t.Run("should reject unknown JSON fields", func(t *testing.T) {
		rr := httptest.NewRecorder()
		raw := `{"display_name":"test","unknown_field":"bad"}`
		req, err := http.NewRequest(http.MethodPost,
			"/api/v1/pipeline-runs?namespace=test-ns&pipelineServerId=dspa",
			bytes.NewReader([]byte(raw)))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		req = withPipelineClient(req, mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "unknown_field")
	})

	t.Run("should reject malformed JSON", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost,
			"/api/v1/pipeline-runs?namespace=test-ns&pipelineServerId=dspa",
			bytes.NewReader([]byte("{invalid")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		req = withPipelineClient(req, mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should reject missing display_name", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		body.DisplayName = ""
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "display_name")
	})
}

func TestCreatePipelineRunHandler_ErrorCases(t *testing.T) {
	app := newMinimalTestApp()

	t.Run("should fail without pipeline server client in context", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := newCreateRequest(t, validCreateRequest())
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-ns")
		req = req.WithContext(ctx)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should return 500 when KFP client fails", func(t *testing.T) {
		rr := httptest.NewRecorder()
		failClient := &failingPipelineServerClient{}
		req := withPipelineClient(newCreateRequest(t, validCreateRequest()), failClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

func TestCreatePipelineRunHandler_ResponseContract(t *testing.T) {
	app := newMinimalTestApp()
	mockClient := psmocks.NewMockPipelineServerClient()

	t.Run("should return envelope with data field", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validCreateRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		var raw map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &raw)
		assert.NoError(t, err)

		_, hasData := raw["data"]
		assert.True(t, hasData, "response must have 'data' field")
	})

	t.Run("should include run_id, display_name, state, created_at in response", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validCreateRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotEmpty(t, response.Data.RunID)
		assert.Equal(t, "test-run", response.Data.DisplayName)
		assert.NotEmpty(t, response.Data.State)
		assert.NotEmpty(t, response.Data.CreatedAt)
	})

	t.Run("should include pipeline_version_reference from hardcoded pipeline ID", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validCreateRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data.PipelineVersionReference)
		assert.Equal(t, constants.AutoRAGPipelineID, response.Data.PipelineVersionReference.PipelineID)
	})
}

// failingPipelineServerClient always returns an error for CreateRun.
type failingPipelineServerClient struct {
	psmocks.MockPipelineServerClient
}

func (f *failingPipelineServerClient) CreateRun(_ context.Context, _ models.CreatePipelineRunKFRequest) (*models.KFPipelineRun, error) {
	return nil, fmt.Errorf("connection refused")
}
