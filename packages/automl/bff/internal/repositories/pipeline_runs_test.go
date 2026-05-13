package repositories

import (
	"context"
	"strings"
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

// newValidTabularRequest creates a valid tabular pipeline request for testing
func newValidTabularRequest() models.CreateAutoMLRunRequest {
	topN := 3
	labelColumn := "target"
	taskType := "binary"
	return models.CreateAutoMLRunRequest{
		DisplayName:         "test-run",
		TrainDataSecretName: "minio-secret",
		TrainDataBucketName: "automl",
		TrainDataFileKey:    "data/train.csv",
		LabelColumn:         &labelColumn,
		TaskType:            &taskType,
		TopN:                &topN,
	}
}

// newValidTimeSeriesRequest creates a valid timeseries pipeline request for testing
func newValidTimeSeriesRequest() models.CreateAutoMLRunRequest {
	topN := 3
	taskType := "timeseries"
	target := "sales"
	idColumn := "store_id"
	timestampColumn := "date"
	predictionLength := 7
	covariates := []string{"temperature", "is_holiday"}
	return models.CreateAutoMLRunRequest{
		DisplayName:          "test-run",
		TrainDataSecretName:  "minio-secret",
		TrainDataBucketName:  "automl",
		TrainDataFileKey:     "data/train.csv",
		TaskType:             &taskType,
		Target:               &target,
		IDColumn:             &idColumn,
		TimestampColumn:      &timestampColumn,
		PredictionLength:     &predictionLength,
		KnownCovariatesNames: &covariates,
		TopN:                 &topN,
	}
}

func TestBuildKFPRunRequest(t *testing.T) {
	t.Run("should map all required tabular parameters correctly", func(t *testing.T) {
		req := newValidTabularRequest()
		result := BuildKFPRunRequest(req, "test-pipeline-id", "test-version-id", constants.PipelineTypeTabular)

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

	t.Run("should map all required timeseries parameters correctly", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		result := BuildKFPRunRequest(req, "test-pipeline-id", "test-version-id", constants.PipelineTypeTimeSeries)

		assert.Equal(t, "test-run", result.DisplayName)
		assert.Equal(t, "test-pipeline-id", result.PipelineVersionReference.PipelineID)
		assert.Equal(t, "test-version-id", result.PipelineVersionReference.PipelineVersionID)

		params := result.RuntimeConfig.Parameters
		assert.Equal(t, "minio-secret", params["train_data_secret_name"])
		assert.Equal(t, "automl", params["train_data_bucket_name"])
		assert.Equal(t, "data/train.csv", params["train_data_file_key"])
		assert.Equal(t, "sales", params["target"])
		assert.Equal(t, "store_id", params["id_column"])
		assert.Equal(t, "date", params["timestamp_column"])
		assert.Equal(t, 7, params["prediction_length"])
		assert.Equal(t, []string{"temperature", "is_holiday"}, params["known_covariates_names"])
		// task_type should NOT be in parameters for timeseries (used for discrimination only, not a KFP parameter)
		assert.NotContains(t, params, "task_type")
	})

	t.Run("should default top_n to 3 when nil", func(t *testing.T) {
		req := newValidTabularRequest()
		req.TopN = nil
		result := BuildKFPRunRequest(req, "test-pipeline-id", "test-version-id", constants.PipelineTypeTabular)

		assert.Equal(t, constants.DefaultTopN, result.RuntimeConfig.Parameters["top_n"])
	})

	t.Run("should use provided top_n", func(t *testing.T) {
		req := newValidTabularRequest()
		topN := 5
		req.TopN = &topN
		result := BuildKFPRunRequest(req, "test-pipeline-id", "test-version-id", constants.PipelineTypeTabular)

		assert.Equal(t, 5, result.RuntimeConfig.Parameters["top_n"])
	})

	t.Run("should pass description to KFP request", func(t *testing.T) {
		req := newValidTabularRequest()
		req.Description = "my description"
		result := BuildKFPRunRequest(req, "test-pipeline-id", "test-version-id", constants.PipelineTypeTabular)

		assert.Equal(t, "my description", result.Description)
	})
}

func TestDeterminePipelineType(t *testing.T) {
	t.Run("should return tabular for binary task type", func(t *testing.T) {
		pipelineType, err := DeterminePipelineType("binary")
		assert.NoError(t, err)
		assert.Equal(t, constants.PipelineTypeTabular, pipelineType)
	})

	t.Run("should return tabular for multiclass task type", func(t *testing.T) {
		pipelineType, err := DeterminePipelineType("multiclass")
		assert.NoError(t, err)
		assert.Equal(t, constants.PipelineTypeTabular, pipelineType)
	})

	t.Run("should return tabular for regression task type", func(t *testing.T) {
		pipelineType, err := DeterminePipelineType("regression")
		assert.NoError(t, err)
		assert.Equal(t, constants.PipelineTypeTabular, pipelineType)
	})

	t.Run("should return timeseries for timeseries task type", func(t *testing.T) {
		pipelineType, err := DeterminePipelineType("timeseries")
		assert.NoError(t, err)
		assert.Equal(t, constants.PipelineTypeTimeSeries, pipelineType)
	})

	t.Run("should return error for invalid task type", func(t *testing.T) {
		_, err := DeterminePipelineType("invalid")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid task_type")
	})

	t.Run("should return error for empty task type", func(t *testing.T) {
		_, err := DeterminePipelineType("")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid task_type")
	})
}

func TestValidateCreateAutoMLRunRequest(t *testing.T) {
	t.Run("should pass with all required tabular fields", func(t *testing.T) {
		req := newValidTabularRequest()
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.NoError(t, err)
	})

	t.Run("should pass with all required timeseries fields", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.NoError(t, err)
	})

	t.Run("should fail when display_name is missing", func(t *testing.T) {
		req := newValidTabularRequest()
		req.DisplayName = ""
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name")
	})

	t.Run("should fail when multiple required tabular fields are missing", func(t *testing.T) {
		req := models.CreateAutoMLRunRequest{}
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name")
		assert.Contains(t, err.Error(), "train_data_secret_name")
		assert.Contains(t, err.Error(), "label_column")
		assert.Contains(t, err.Error(), "task_type")
	})

	t.Run("should fail when multiple required timeseries fields are missing", func(t *testing.T) {
		req := models.CreateAutoMLRunRequest{}
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name")
		assert.Contains(t, err.Error(), "train_data_secret_name")
		assert.Contains(t, err.Error(), "task_type")
		assert.Contains(t, err.Error(), "target")
		assert.Contains(t, err.Error(), "id_column")
		assert.Contains(t, err.Error(), "timestamp_column")
	})

	t.Run("should accept valid task_type values for tabular", func(t *testing.T) {
		for _, taskType := range []string{"binary", "multiclass", "regression"} {
			req := newValidTabularRequest()
			req.TaskType = &taskType
			err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
			assert.NoError(t, err, "task_type %q should be valid", taskType)
		}
	})

	t.Run("should reject invalid task_type for tabular", func(t *testing.T) {
		req := newValidTabularRequest()
		invalidType := "invalid_type"
		req.TaskType = &invalidType
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid task_type")
	})

	t.Run("should accept task_type=timeseries for timeseries pipeline", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		taskType := "timeseries"
		req.TaskType = &taskType
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.NoError(t, err)
	})

	t.Run("should reject non-timeseries task_type for timeseries pipeline", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		taskType := "binary"
		req.TaskType = &taskType
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid task_type")
		assert.Contains(t, err.Error(), "timeseries")
	})

	t.Run("should reject non-positive top_n", func(t *testing.T) {
		req := newValidTabularRequest()
		topN := 0
		req.TopN = &topN
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "top_n")
	})

	t.Run("should accept top_n at maximum for tabular pipeline", func(t *testing.T) {
		req := newValidTabularRequest()
		topN := constants.MaxTopNTabular
		req.TopN = &topN
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.NoError(t, err)
	})

	t.Run("should reject top_n exceeding maximum for tabular pipeline", func(t *testing.T) {
		req := newValidTabularRequest()
		topN := constants.MaxTopNTabular + 1
		req.TopN = &topN
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "top_n")
		assert.Contains(t, err.Error(), "maximum value")
		assert.Contains(t, err.Error(), "tabular")
	})

	t.Run("should accept top_n at maximum for timeseries pipeline", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		topN := constants.MaxTopNTimeSeries
		req.TopN = &topN
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.NoError(t, err)
	})

	t.Run("should reject top_n exceeding maximum for timeseries pipeline", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		topN := constants.MaxTopNTimeSeries + 1
		req.TopN = &topN
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "top_n")
		assert.Contains(t, err.Error(), "maximum value")
		assert.Contains(t, err.Error(), "timeseries")
	})

	t.Run("should reject non-positive prediction_length for timeseries", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		predictionLength := 0
		req.PredictionLength = &predictionLength
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "prediction_length")
	})

	t.Run("should allow nil top_n", func(t *testing.T) {
		req := newValidTabularRequest()
		req.TopN = nil
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.NoError(t, err)
	})

	t.Run("should allow nil prediction_length for timeseries", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		req.PredictionLength = nil
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.NoError(t, err)
	})

	t.Run("should allow nil known_covariates_names for timeseries", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		req.KnownCovariatesNames = nil
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.NoError(t, err)
	})

	t.Run("should fail for unsupported pipeline type", func(t *testing.T) {
		req := newValidTabularRequest()
		err := ValidateCreateAutoMLRunRequest(req, "unsupported")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported pipeline type")
	})

	t.Run("should reject timeseries fields when pipeline type is tabular", func(t *testing.T) {
		req := newValidTabularRequest()
		// Add timeseries-specific fields
		target := "sales"
		idColumn := "store_id"
		timestampColumn := "date"
		req.Target = &target
		req.IDColumn = &idColumn
		req.TimestampColumn = &timestampColumn

		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unexpected fields")
		assert.Contains(t, err.Error(), "tabular")
		assert.Contains(t, err.Error(), "target")
		assert.Contains(t, err.Error(), "id_column")
		assert.Contains(t, err.Error(), "timestamp_column")
	})

	t.Run("should reject tabular-only fields when pipeline type is timeseries", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		// Add tabular-only field
		labelColumn := "target"
		req.LabelColumn = &labelColumn

		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unexpected fields")
		assert.Contains(t, err.Error(), "timeseries")
		assert.Contains(t, err.Error(), "label_column")
	})

	t.Run("should reject single unexpected field for tabular pipeline", func(t *testing.T) {
		req := newValidTabularRequest()
		target := "sales"
		req.Target = &target

		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unexpected fields")
		assert.Contains(t, err.Error(), "target")
	})

	t.Run("should reject single unexpected field for timeseries pipeline", func(t *testing.T) {
		req := newValidTimeSeriesRequest()
		labelColumn := "target"
		req.LabelColumn = &labelColumn

		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTimeSeries)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unexpected fields")
		assert.Contains(t, err.Error(), "label_column")
	})

	t.Run("should accept display_name at exactly 250 characters", func(t *testing.T) {
		req := newValidTabularRequest()
		req.DisplayName = strings.Repeat("a", 250)
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.NoError(t, err)
	})

	t.Run("should reject display_name exceeding 250 characters", func(t *testing.T) {
		req := newValidTabularRequest()
		req.DisplayName = strings.Repeat("a", 251)
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name must be at most 250 characters")
	})

	t.Run("should accept display_name with 250 multi-byte characters", func(t *testing.T) {
		// Each character is multi-byte in UTF-8 but counts as 1 rune.
		// The limit is character-based (MySQL varchar(256) counts characters, not bytes).
		req := newValidTabularRequest()
		req.DisplayName = strings.Repeat("\u00e9", 250) // é = 2 bytes each, 500 bytes total
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.NoError(t, err)
	})

	t.Run("should reject display_name with 251 multi-byte characters", func(t *testing.T) {
		req := newValidTabularRequest()
		req.DisplayName = strings.Repeat("\u00e9", 251)
		err := ValidateCreateAutoMLRunRequest(req, constants.PipelineTypeTabular)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "display_name must be at most 250 characters")
	})
}
