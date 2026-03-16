package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
)

// mockNamespace is the namespace that NewMockPipelineServerClient("http://mock-ps") produces.
// Since "http://mock-ps" is not a "mock://" URL, the mock's Namespace field is "".
const mockNamespace = ""

func TestPipelineRunsRepository_GetPipelineRuns(t *testing.T) {
	repo := NewPipelineRunsRepository()
	mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
	ctx := context.Background()

	t.Run("should retrieve pipeline runs successfully", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, "", 20, "", constants.PipelineTypeTimeSeries)

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		// Mock with empty namespace returns 5 runs (default count for unknown namespace)
		assert.Len(t, runsData.Runs, 5)
		assert.Equal(t, int32(5), runsData.TotalSize)
	})

	t.Run("should pass pipeline version ID filter to the client", func(t *testing.T) {
		// Use the derived version ID for the empty namespace (matching how mock generates IDs)
		ids := psmocks.DeriveMockIDs(mockNamespace)
		pipelineVersionID := ids.LatestVersionID

		runsData, err := repo.GetPipelineRuns(mockClient, ctx, pipelineVersionID, 20, "", constants.PipelineTypeTimeSeries)

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		// Verify the filter was forwarded to the client with the requested version ID
		assert.NotNil(t, mockClient.LastListRunsParams, "GetPipelineRuns should have called ListRuns")
		assert.Contains(t, mockClient.LastListRunsParams.Filter, pipelineVersionID,
			"filter should include the requested pipeline version ID")
		assert.Contains(t, mockClient.LastListRunsParams.Filter, "pipeline_version_id",
			"filter should include the pipeline_version_id key")
	})

	t.Run("should handle pagination parameters", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, "", 10, "page-token-123", constants.PipelineTypeTimeSeries)

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
	})

	t.Run("should transform Kubeflow format to stable API format", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, "", 20, "", constants.PipelineTypeTimeSeries)

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

			// Verify pipeline_type is set from the pipelineType parameter
			assert.Equal(t, constants.PipelineTypeTimeSeries, run.PipelineType)
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
		result := BuildKFPRunRequest(req, "test-pipeline-id", "test-version-id")

		assert.Equal(t, "test-run", result.DisplayName)
		assert.Equal(t, "test-pipeline-id", result.PipelineVersionReference.PipelineID)
		assert.Equal(t, "test-version-id", result.PipelineVersionReference.PipelineVersionID)

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
		result := BuildKFPRunRequest(req, "test-pipeline-id", "test-version-id")

		assert.Equal(t, constants.DefaultTopN, result.RuntimeConfig.Parameters["top_n"])
	})

	t.Run("should use provided top_n", func(t *testing.T) {
		req := newValidCreateRequest()
		topN := 5
		req.TopN = &topN
		result := BuildKFPRunRequest(req, "test-pipeline-id", "test-version-id")

		assert.Equal(t, 5, result.RuntimeConfig.Parameters["top_n"])
	})

	t.Run("should pass description to KFP request", func(t *testing.T) {
		req := newValidCreateRequest()
		req.Description = "my description"
		result := BuildKFPRunRequest(req, "test-pipeline-id", "test-version-id")

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
