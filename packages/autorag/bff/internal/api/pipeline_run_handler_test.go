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
		config: config.EnvConfig{
			AuthMethod:                config.AuthMethodInternal,
			AutoRAGPipelineNamePrefix: "documents-rag-optimization-pipeline",
		},
		logger:       slog.Default(),
		repositories: repositories.NewRepositories(slog.Default()),
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
	// Use "test-namespace" consistently — it matches the mock client created with "mock://test-namespace"
	ids := psmocks.DeriveMockIDs("test-namespace")
	ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, client)
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
	// Add discovered pipeline map to context (normally set by middleware)
	discovered := &repositories.DiscoveredPipeline{
		PipelineID:        ids.PipelineID,
		PipelineVersionID: ids.LatestVersionID,
		PipelineName:      "documents-rag-optimization-pipeline",
		Namespace:         "test-namespace",
	}
	pipelines := map[string]*repositories.DiscoveredPipeline{"autorag": discovered}
	ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, pipelines)
	return req.WithContext(ctx)
}

func TestCreatePipelineRunHandler_Success(t *testing.T) {
	app := newMinimalTestApp()
	mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")

	t.Run("should create run with all required fields", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validCreateRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data)
		assert.NotEmpty(t, response.Data.RunID)
		assert.Equal(t, "test-run", response.Data.DisplayName)
		assert.Equal(t, "PENDING", response.Data.State)
		assert.NotNil(t, response.Data.RuntimeConfig)
		assert.Equal(t, "faithfulness", response.Data.RuntimeConfig.Parameters["optimization_metric"])
	})

	t.Run("should default optimization_metric to faithfulness", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		body.OptimizationMetric = ""
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data)
		assert.NotEmpty(t, response.Data.RunID)
		assert.Equal(t, "PENDING", response.Data.State)
		assert.NotNil(t, response.Data.RuntimeConfig)
		assert.Equal(t, "faithfulness", response.Data.RuntimeConfig.Parameters["optimization_metric"])
	})

	t.Run("should accept answer_correctness metric", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		body.OptimizationMetric = "answer_correctness"
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("should accept context_correctness metric", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		body.OptimizationMetric = "context_correctness"
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("should include optional fields when provided", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		body.EmbeddingsModels = []string{"model-a", "model-b"}
		body.GenerationModels = []string{"gen-model"}
		body.LlamaStackVectorIOProviderID = "vectordb-1"
		maxPatterns := 10
		body.OptimizationMaxRagPatterns = &maxPatterns
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotEmpty(t, response.Data.RunID)
		assert.Equal(t, "test-run", response.Data.DisplayName)
		assert.Equal(t, "PENDING", response.Data.State)
		assert.NotNil(t, response.Data.PipelineVersionReference)
		assert.NotNil(t, response.Data.RuntimeConfig)
		assert.Equal(t, "vectordb-1", response.Data.RuntimeConfig.Parameters["llama_stack_vector_io_provider_id"])
		assert.Equal(t, float64(10), response.Data.RuntimeConfig.Parameters["optimization_max_rag_patterns"])
	})
}

func TestCreatePipelineRunHandler_Validation(t *testing.T) {
	app := newMinimalTestApp()
	mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")

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

	t.Run("should reject optimization_max_rag_patterns below minimum", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		value := 3
		body.OptimizationMaxRagPatterns = &value
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "optimization_max_rag_patterns")
		assert.Contains(t, rr.Body.String(), "at least 4")
	})

	t.Run("should reject optimization_max_rag_patterns above maximum", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validCreateRequest()
		value := 21
		body.OptimizationMaxRagPatterns = &value
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "optimization_max_rag_patterns")
		assert.Contains(t, rr.Body.String(), "at most 20")
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

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
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
	mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")

	t.Run("should return envelope with data field", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validCreateRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

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

	t.Run("should include runtime_config with submitted parameters", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validCreateRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data.RuntimeConfig)
		params := response.Data.RuntimeConfig.Parameters
		assert.Equal(t, "test-secret", params["test_data_secret_name"])
		assert.Equal(t, "test-bucket", params["test_data_bucket_name"])
		assert.Equal(t, "test-key", params["test_data_key"])
		assert.Equal(t, "input-secret", params["input_data_secret_name"])
		assert.Equal(t, "input-bucket", params["input_data_bucket_name"])
		assert.Equal(t, "input-key", params["input_data_key"])
		assert.Equal(t, "llama-secret", params["llama_stack_secret_name"])
		assert.Equal(t, "faithfulness", params["optimization_metric"])
	})

	t.Run("should include pipeline_version_reference from discovered pipeline", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validCreateRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data.PipelineVersionReference)
		// Pipeline ID comes from the discovered pipeline, which uses namespace-derived IDs
		assert.Equal(t, psmocks.DeriveMockIDs("test-namespace").PipelineID, response.Data.PipelineVersionReference.PipelineID)
	})
}

// failingPipelineServerClient always returns an error for CreateRun.
type failingPipelineServerClient struct {
	psmocks.MockPipelineServerClient
}

func (f *failingPipelineServerClient) CreateRun(_ context.Context, _ models.CreatePipelineRunKFRequest) (*models.KFPipelineRun, error) {
	return nil, fmt.Errorf("connection refused")
}
