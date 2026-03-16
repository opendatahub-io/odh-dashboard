package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestPipelineRunsRepository_GetPipelineRuns(t *testing.T) {
	repo := NewPipelineRunsRepository()
	mockClient := psmocks.NewMockPipelineServerClient()
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

func newValidCreateRequest() models.CreateAutoMLRunRequest {
	topN := 3
	return models.CreateAutoMLRunRequest{
		DisplayName:         "test-run",
		TrainDataSecretName: "minio-secret",
		TrainDataBucketName: "automl",
		TrainDataFileKey:    "data/train.csv",
		LabelColumn:         "target",
		TaskType:            "binary",
		TopN:                &topN,
	}
}

func TestBuildKFPRunRequest(t *testing.T) {
	t.Run("should map all required parameters correctly", func(t *testing.T) {
		req := newValidCreateRequest()
		result := BuildKFPRunRequest(req)

		assert.Equal(t, "test-run", result.DisplayName)
		assert.Equal(t, constants.AutoMLPipelineID, result.PipelineVersionReference.PipelineID)
		assert.Equal(t, constants.AutoMLPipelineVersionID, result.PipelineVersionReference.PipelineVersionID)

		params := result.RuntimeConfig.Parameters
		assert.Equal(t, "minio-secret", params["train_data_secret_name"])
		assert.Equal(t, "automl", params["train_data_bucket_name"])
		assert.Equal(t, "data/train.csv", params["train_data_file_key"])
		assert.Equal(t, "target", params["label_column"])
		assert.Equal(t, "binary", params["task_type"])
	})

	t.Run("should default top_n to 3 when nil", func(t *testing.T) {
		req := newValidCreateRequest()
		req.TopN = nil
		result := BuildKFPRunRequest(req)

		assert.Equal(t, constants.DefaultTopN, result.RuntimeConfig.Parameters["top_n"])
	})

	t.Run("should use provided top_n", func(t *testing.T) {
		req := newValidCreateRequest()
		topN := 5
		req.TopN = &topN
		result := BuildKFPRunRequest(req)

		assert.Equal(t, 5, result.RuntimeConfig.Parameters["top_n"])
	})

	t.Run("should pass description to KFP request", func(t *testing.T) {
		req := newValidCreateRequest()
		req.Description = "my description"
		result := BuildKFPRunRequest(req)

		assert.Equal(t, "my description", result.Description)
	})
}

func TestValidateCreateAutoMLRunRequest(t *testing.T) {
	t.Run("should pass with all required fields", func(t *testing.T) {
		req := newValidCreateRequest()
		err := ValidateCreateAutoMLRunRequest(req)
		assert.NoError(t, err)
	})

	t.Run("should fail when display_name is missing", func(t *testing.T) {
		req := newValidCreateRequest()
		req.DisplayName = ""
		err := ValidateCreateAutoMLRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name")
	})

	t.Run("should fail when multiple required fields are missing", func(t *testing.T) {
		req := models.CreateAutoMLRunRequest{}
		err := ValidateCreateAutoMLRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name")
		assert.Contains(t, err.Error(), "train_data_secret_name")
		assert.Contains(t, err.Error(), "task_type")
	})

	t.Run("should accept valid task_type values", func(t *testing.T) {
		for _, taskType := range []string{"binary", "multiclass", "regression"} {
			req := newValidCreateRequest()
			req.TaskType = taskType
			err := ValidateCreateAutoMLRunRequest(req)
			assert.NoError(t, err, "task_type %q should be valid", taskType)
		}
	})

	t.Run("should reject invalid task_type", func(t *testing.T) {
		req := newValidCreateRequest()
		req.TaskType = "invalid_type"
		err := ValidateCreateAutoMLRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid task_type")
	})

	t.Run("should reject non-positive top_n", func(t *testing.T) {
		req := newValidCreateRequest()
		topN := 0
		req.TopN = &topN
		err := ValidateCreateAutoMLRunRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "top_n")
	})

	t.Run("should allow nil top_n", func(t *testing.T) {
		req := newValidCreateRequest()
		req.TopN = nil
		err := ValidateCreateAutoMLRunRequest(req)
		assert.NoError(t, err)
	})
}
