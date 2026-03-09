package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestPipelineRunsRepository_GetPipelineRuns(t *testing.T) {
	repo := NewPipelineRunsRepository()
	mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
	ctx := context.Background()

	t.Run("should retrieve pipeline runs successfully", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, "", 20, "")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		assert.Len(t, runsData.Runs, 3)
		assert.Equal(t, int32(3), runsData.TotalSize)
	})

	t.Run("should handle pipeline version ID filtering", func(t *testing.T) {
		pipelineVersionID := "22e57c06-030f-4c63-900d-0a808d577899"

		runsData, err := repo.GetPipelineRuns(mockClient, ctx, pipelineVersionID, 20, "")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		// Mock now filters by pipeline version ID - 2 runs have this version ID
		assert.Len(t, runsData.Runs, 2)
	})

	t.Run("should handle pagination parameters", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, "", 10, "page-token-123")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
	})

	t.Run("should transform Kubeflow format to stable API format", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, "", 20, "")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)

		if len(runsData.Runs) > 0 {
			run := runsData.Runs[0]
			// Verify required fields are present
			assert.NotEmpty(t, run.RunID)
			assert.NotEmpty(t, run.DisplayName)
			assert.NotEmpty(t, run.State)
			assert.NotEmpty(t, run.CreatedAt)

			// Verify enhanced fields are transformed
			assert.NotEmpty(t, run.ExperimentID)
			assert.NotNil(t, run.PipelineVersionReference)
			if run.PipelineVersionReference != nil {
				assert.NotEmpty(t, run.PipelineVersionReference.PipelineID)
				assert.NotEmpty(t, run.PipelineVersionReference.PipelineVersionID)
			}
			assert.NotEmpty(t, run.StorageState)
			assert.NotEmpty(t, run.ServiceAccount)

			// Verify state history is present
			assert.NotNil(t, run.StateHistory)
			if len(run.StateHistory) > 0 {
				assert.NotEmpty(t, run.StateHistory[0].UpdateTime)
				assert.NotEmpty(t, run.StateHistory[0].State)
			}
		}
	})
}

func TestBuildFilter(t *testing.T) {
	t.Run("should build filter with pipeline version ID", func(t *testing.T) {
		pipelineVersionID := "v1-version-id-12345"

		filter := buildFilter(pipelineVersionID)
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, pipelineVersionID)
		assert.Contains(t, filter, "pipeline_version_id")
		assert.Contains(t, filter, "predicates")
		assert.Contains(t, filter, "storage_state")
		assert.Contains(t, filter, "AVAILABLE")
	})

	t.Run("should always include storage_state filter", func(t *testing.T) {
		filter := buildFilter("")
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, "storage_state")
		assert.Contains(t, filter, "AVAILABLE")
		assert.Contains(t, filter, "predicates")
	})

	t.Run("should format filter as valid JSON", func(t *testing.T) {
		pipelineVersionID := "test-version-id"

		filter := buildFilter(pipelineVersionID)
		// Should be valid JSON
		assert.True(t, filter[0] == '{')
		assert.Contains(t, filter, "\"predicates\"")
	})
}

func newValidCreateRequest() models.CreateAutoRAGRunRequest {
	return models.CreateAutoRAGRunRequest{
		DisplayName:          "test-run",
		TestDataSecretName:   "minio-secret",
		TestDataBucketName:   "autorag",
		TestDataKey:          "test_data.json",
		InputDataSecretName:  "minio-secret",
		InputDataBucketName:  "autorag",
		InputDataKey:         "documents/",
		LlamaStackSecretName: "llama-secret",
	}
}

func TestBuildKFPRunRequest(t *testing.T) {
	t.Run("should map all required parameters correctly", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req)

		assert.Equal(t, "test-run", result.DisplayName)
		assert.Equal(t, constants.AutoRAGPipelineID, result.PipelineVersionReference.PipelineID)
		assert.Equal(t, constants.AutoRAGPipelineVersionID, result.PipelineVersionReference.PipelineVersionID)

		params := result.RuntimeConfig.Parameters
		assert.Equal(t, "minio-secret", params["test_data_secret_name"])
		assert.Equal(t, "autorag", params["test_data_bucket_name"])
		assert.Equal(t, "test_data.json", params["test_data_key"])
		assert.Equal(t, "minio-secret", params["input_data_secret_name"])
		assert.Equal(t, "autorag", params["input_data_bucket_name"])
		assert.Equal(t, "documents/", params["input_data_key"])
		assert.Equal(t, "llama-secret", params["llama_stack_secret_name"])
	})

	t.Run("should default optimization_metric to faithfulness", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req)

		assert.Equal(t, constants.DefaultOptimizationMetric, result.RuntimeConfig.Parameters["optimization_metric"])
	})

	t.Run("should use provided optimization_metric", func(t *testing.T) {
		req := newValidCreateRequest()
		req.OptimizationMetric = "answer_correctness"
		result := BuildKFPRunRequest(req)

		assert.Equal(t, "answer_correctness", result.RuntimeConfig.Parameters["optimization_metric"])
	})

	t.Run("should include embeddings_models when provided", func(t *testing.T) {
		req := newValidCreateRequest()
		req.EmbeddingsModels = []string{"model-a", "model-b"}
		result := BuildKFPRunRequest(req)

		assert.Equal(t, []string{"model-a", "model-b"}, result.RuntimeConfig.Parameters["embeddings_models"])
	})

	t.Run("should omit embeddings_models when empty", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req)

		_, exists := result.RuntimeConfig.Parameters["embeddings_models"]
		assert.False(t, exists)
	})

	t.Run("should include generation_models when provided", func(t *testing.T) {
		req := newValidCreateRequest()
		req.GenerationModels = []string{"gen-1"}
		result := BuildKFPRunRequest(req)

		assert.Equal(t, []string{"gen-1"}, result.RuntimeConfig.Parameters["generation_models"])
	})

	t.Run("should omit generation_models when empty", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req)

		_, exists := result.RuntimeConfig.Parameters["generation_models"]
		assert.False(t, exists)
	})

	t.Run("should include llama_stack_vector_database_id when provided", func(t *testing.T) {
		req := newValidCreateRequest()
		req.LlamaStackVectorDatabaseID = "milvus-db"
		result := BuildKFPRunRequest(req)

		assert.Equal(t, "milvus-db", result.RuntimeConfig.Parameters["llama_stack_vector_database_id"])
	})

	t.Run("should omit llama_stack_vector_database_id when empty", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req)

		_, exists := result.RuntimeConfig.Parameters["llama_stack_vector_database_id"]
		assert.False(t, exists)
	})

	t.Run("should pass description to KFP request", func(t *testing.T) {
		req := newValidCreateRequest()
		req.Description = "my description"
		result := BuildKFPRunRequest(req)

		assert.Equal(t, "my description", result.Description)
	})
}

func TestValidateCreateAutoRAGRunRequest(t *testing.T) {
	t.Run("should pass with all required fields", func(t *testing.T) {
		req := newValidCreateRequest()
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.NoError(t, err)
	})

	t.Run("should fail when display_name is missing", func(t *testing.T) {
		req := newValidCreateRequest()
		req.DisplayName = ""
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name")
	})

	t.Run("should fail when multiple required fields are missing", func(t *testing.T) {
		req := models.CreateAutoRAGRunRequest{}
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name")
		assert.Contains(t, err.Error(), "test_data_secret_name")
		assert.Contains(t, err.Error(), "llama_stack_secret_name")
	})

	t.Run("should accept valid optimization_metric values", func(t *testing.T) {
		for _, metric := range []string{"faithfulness", "answer_correctness", "context_correctness"} {
			req := newValidCreateRequest()
			req.OptimizationMetric = metric
			err := ValidateCreateAutoRAGRunRequest(req)
			assert.NoError(t, err, "metric %q should be valid", metric)
		}
	})

	t.Run("should reject invalid optimization_metric", func(t *testing.T) {
		req := newValidCreateRequest()
		req.OptimizationMetric = "invalid_metric"
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid optimization_metric")
	})

	t.Run("should allow empty optimization_metric", func(t *testing.T) {
		req := newValidCreateRequest()
		req.OptimizationMetric = ""
		err := ValidateCreateAutoRAGRunRequest(req)
		assert.NoError(t, err)
	})
}
