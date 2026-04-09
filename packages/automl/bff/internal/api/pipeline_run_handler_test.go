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

	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func newMinimalTestApp() *App {
	return &App{
		config:       config.EnvConfig{AuthMethod: config.AuthMethodInternal},
		logger:       slog.Default(),
		repositories: repositories.NewRepositories(slog.Default()),
	}
}

func validTabularRequest() models.CreateAutoMLRunRequest {
	topN := 3
	labelColumn := "target"
	taskType := "binary"
	return models.CreateAutoMLRunRequest{
		DisplayName:         "test-run",
		Description:         "a test run",
		TrainDataSecretName: "minio-secret",
		TrainDataBucketName: "automl-bucket",
		TrainDataFileKey:    "data/train.csv",
		LabelColumn:         &labelColumn,
		TaskType:            &taskType,
		TopN:                &topN,
	}
}

func validTimeseriesRequest() models.CreateAutoMLRunRequest {
	topN := 3
	taskType := "timeseries"
	target := "temperature"
	idColumn := "series_id"
	timestampColumn := "timestamp"
	predictionLength := 24
	return models.CreateAutoMLRunRequest{
		DisplayName:         "test-run",
		Description:         "a test run",
		TrainDataSecretName: "minio-secret",
		TrainDataBucketName: "automl-bucket",
		TrainDataFileKey:    "data/train.csv",
		TaskType:            &taskType,
		Target:              &target,
		IDColumn:            &idColumn,
		TimestampColumn:     &timestampColumn,
		PredictionLength:    &predictionLength,
		TopN:                &topN,
	}
}

func newCreateRequest(t *testing.T, body interface{}) *http.Request {
	t.Helper()
	b, err := json.Marshal(body)
	assert.NoError(t, err)
	url := "/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(b))
	assert.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func withPipelineClient(req *http.Request, client ps.PipelineServerClientInterface) *http.Request {
	ids := psmocks.DeriveMockIDs("test-namespace")
	ctx := context.WithValue(req.Context(), constants.PipelineServerClientKey, client)
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
	// Inject discovered pipelines map — both types use the same mock IDs for simplicity
	discoveredPipelines := map[string]*repositories.DiscoveredPipeline{
		constants.PipelineTypeTimeSeries: {
			PipelineID:        ids.PipelineID,
			PipelineVersionID: ids.LatestVersionID,
			PipelineName:      "autogluon-timeseries-training-pipeline",
			Namespace:         "test-namespace",
		},
		constants.PipelineTypeTabular: {
			PipelineID:        ids.PipelineID,
			PipelineVersionID: ids.OldVersionID,
			PipelineName:      "autogluon-tabular-training-pipeline",
			Namespace:         "test-namespace",
		},
	}
	ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, discoveredPipelines)
	return req.WithContext(ctx)
}

func TestCreatePipelineRunHandler_Success(t *testing.T) {
	app := newMinimalTestApp()
	mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")

	t.Run("should create tabular run with all required fields", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validTabularRequest()), mockClient)

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
		assert.Equal(t, "binary", response.Data.RuntimeConfig.Parameters["task_type"])
	})

	t.Run("should create timeseries run with all required fields", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validTimeseriesRequest()), mockClient)

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
		assert.Equal(t, "temperature", response.Data.RuntimeConfig.Parameters["target"])
		assert.Equal(t, "series_id", response.Data.RuntimeConfig.Parameters["id_column"])
		assert.Equal(t, "timestamp", response.Data.RuntimeConfig.Parameters["timestamp_column"])
	})

	t.Run("should default top_n to 3 when not provided", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validTabularRequest()
		body.TopN = nil
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data)
		assert.NotNil(t, response.Data.RuntimeConfig)
		assert.Equal(t, float64(constants.DefaultTopN), response.Data.RuntimeConfig.Parameters["top_n"])
	})

	t.Run("should accept multiclass task type", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validTabularRequest()
		taskType := "multiclass"
		body.TaskType = &taskType
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("should accept regression task type", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validTabularRequest()
		taskType := "regression"
		body.TaskType = &taskType
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("should use custom top_n when provided", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validTabularRequest()
		topN := 5
		body.TopN = &topN
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusOK, rr.Code)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data.RuntimeConfig)
		assert.Equal(t, float64(5), response.Data.RuntimeConfig.Parameters["top_n"])
	})
}

func TestCreatePipelineRunHandler_Validation(t *testing.T) {
	app := newMinimalTestApp()
	mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")

	t.Run("should reject empty body", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req, err := http.NewRequest(http.MethodPost,
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa",
			bytes.NewReader([]byte("")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		req = withPipelineClient(req, mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should reject missing task_type", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := models.CreateAutoMLRunRequest{DisplayName: "only-name"}
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "task_type is required")
	})

	t.Run("should reject missing required fields", func(t *testing.T) {
		rr := httptest.NewRecorder()
		taskType := "binary"
		body := models.CreateAutoMLRunRequest{
			DisplayName: "only-name",
			TaskType:    &taskType,
		}
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "train_data_secret_name")
	})

	t.Run("should reject invalid task_type", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validTabularRequest()
		taskType := "invalid_type"
		body.TaskType = &taskType
		req := withPipelineClient(newCreateRequest(t, body), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "invalid task_type")
	})

	t.Run("should reject unknown JSON fields", func(t *testing.T) {
		rr := httptest.NewRecorder()
		raw := `{"display_name":"test","task_type":"binary","unknown_field":"bad"}`
		req, err := http.NewRequest(http.MethodPost,
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa",
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
			"/api/v1/pipeline-runs?namespace=test-namespace&pipelineServerId=dspa",
			bytes.NewReader([]byte("{invalid")))
		assert.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		req = withPipelineClient(req, mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("should reject missing display_name", func(t *testing.T) {
		rr := httptest.NewRecorder()
		body := validTabularRequest()
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
		req := newCreateRequest(t, validTabularRequest())
		ctx := context.WithValue(req.Context(), constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})

	t.Run("should return 500 when KFP client fails", func(t *testing.T) {
		rr := httptest.NewRecorder()
		failClient := &failingPipelineServerClient{}
		req := withPipelineClient(newCreateRequest(t, validTabularRequest()), failClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
	})
}

func TestCreatePipelineRunHandler_ResponseContract(t *testing.T) {
	app := newMinimalTestApp()
	mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")

	t.Run("should return envelope with data field", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validTabularRequest()), mockClient)

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
		req := withPipelineClient(newCreateRequest(t, validTabularRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotEmpty(t, response.Data.RunID)
		assert.Equal(t, "test-run", response.Data.DisplayName)
		assert.NotEmpty(t, response.Data.State)
		assert.NotEmpty(t, response.Data.CreatedAt)
	})

	t.Run("should include runtime_config with submitted tabular parameters", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validTabularRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data.RuntimeConfig)
		params := response.Data.RuntimeConfig.Parameters
		assert.Equal(t, "minio-secret", params["train_data_secret_name"])
		assert.Equal(t, "automl-bucket", params["train_data_bucket_name"])
		assert.Equal(t, "data/train.csv", params["train_data_file_key"])
		assert.Equal(t, "target", params["label_column"])
		assert.Equal(t, "binary", params["task_type"])
	})

	t.Run("should include runtime_config with submitted timeseries parameters", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validTimeseriesRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data.RuntimeConfig)
		params := response.Data.RuntimeConfig.Parameters
		assert.Equal(t, "minio-secret", params["train_data_secret_name"])
		assert.Equal(t, "automl-bucket", params["train_data_bucket_name"])
		assert.Equal(t, "data/train.csv", params["train_data_file_key"])
		assert.Equal(t, "temperature", params["target"])
		assert.Equal(t, "series_id", params["id_column"])
		assert.Equal(t, "timestamp", params["timestamp_column"])
		assert.Equal(t, float64(24), params["prediction_length"])
		// task_type should NOT be in parameters for timeseries (it's used for discrimination only)
		assert.NotContains(t, params, "task_type")
	})

	t.Run("should include pipeline_version_reference from discovered pipeline ID", func(t *testing.T) {
		rr := httptest.NewRecorder()
		req := withPipelineClient(newCreateRequest(t, validTimeseriesRequest()), mockClient)

		app.CreatePipelineRunHandler(rr, req, nil)

		var response CreatePipelineRunEnvelope
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response.Data.PipelineVersionReference)
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
