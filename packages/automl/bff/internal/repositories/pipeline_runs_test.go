package repositories

import (
	"context"
	"encoding/json"
	"fmt"
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

	t.Run("should return empty when pipelineID is empty (no versions to scope)", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, "", 20, "", constants.PipelineTypeTimeSeries)

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		assert.Empty(t, runsData.Runs)
		assert.Equal(t, int32(0), runsData.TotalSize)
	})

	t.Run("should filter by all versions of the given pipeline ID", func(t *testing.T) {
		ids := psmocks.DeriveMockIDs(mockNamespace)
		pipelineID := ids.PipelineID

		runsData, err := repo.GetPipelineRuns(mockClient, ctx, pipelineID, 20, "", constants.PipelineTypeTimeSeries)

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		// Verify the filter was forwarded to the client with pipeline_version_id predicate
		assert.NotNil(t, mockClient.LastListRunsParams, "GetPipelineRuns should have called ListRuns")
		assert.Contains(t, mockClient.LastListRunsParams.Filter, "pipeline_version_id",
			"filter should include the pipeline_version_id key")
	})

	t.Run("should handle pagination parameters", func(t *testing.T) {
		ids := psmocks.DeriveMockIDs(mockNamespace)
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, ids.PipelineID, 10, "page-token-123", constants.PipelineTypeTimeSeries)

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
	})

	t.Run("should transform Kubeflow format to stable API format", func(t *testing.T) {
		ids := psmocks.DeriveMockIDs(mockNamespace)
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, ids.PipelineID, 20, "", constants.PipelineTypeTimeSeries)

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
	t.Run("should build filter with single version ID", func(t *testing.T) {
		versionID := "v1-version-id-12345"

		filter, err := buildFilter([]string{versionID})
		assert.NoError(t, err)
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, versionID)
		assert.Contains(t, filter, "pipeline_version_id")
		assert.Contains(t, filter, "IN")
		assert.Contains(t, filter, "predicates")
		assert.Contains(t, filter, "storage_state")
		assert.Contains(t, filter, "AVAILABLE")
	})

	t.Run("should build filter with multiple version IDs", func(t *testing.T) {
		versionIDs := []string{"version-1", "version-2"}

		filter, err := buildFilter(versionIDs)
		assert.NoError(t, err)
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, "version-1")
		assert.Contains(t, filter, "version-2")
		assert.Contains(t, filter, "pipeline_version_id")
		assert.Contains(t, filter, "IN")
		assert.Contains(t, filter, "storage_state")
		assert.Contains(t, filter, "AVAILABLE")
	})

	t.Run("should always include storage_state filter", func(t *testing.T) {
		filter, err := buildFilter(nil)
		assert.NoError(t, err)
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, "storage_state")
		assert.Contains(t, filter, "AVAILABLE")
		assert.Contains(t, filter, "predicates")
	})

	t.Run("should format filter as valid JSON", func(t *testing.T) {
		filter, err := buildFilter([]string{"test-version-id"})
		assert.NoError(t, err)
		assert.True(t, json.Valid([]byte(filter)))
		assert.Contains(t, filter, "\"predicates\"")
	})
}

func TestCollectVersionIDs(t *testing.T) {
	ctx := context.Background()

	t.Run("should return nil for empty pipeline ID", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
		ids, err := collectVersionIDs(mockClient, ctx, "")
		assert.NoError(t, err)
		assert.Nil(t, ids)
	})

	t.Run("should return cached IDs on cache hit without calling API", func(t *testing.T) {
		cachedPipelineID := "cached-pipeline-id"
		expectedVersionIDs := []string{"cached-v1", "cached-v2"}

		cacheKey := "test-cache:test-ns"
		globalPipelineCache.set(cacheKey, map[string]*DiscoveredPipeline{
			"test": {
				PipelineID:    cachedPipelineID,
				AllVersionIDs: expectedVersionIDs,
			},
		})
		defer globalPipelineCache.invalidate(cacheKey)

		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
		ids, err := collectVersionIDs(mockClient, ctx, cachedPipelineID)

		assert.NoError(t, err)
		assert.Equal(t, expectedVersionIDs, ids)

		// Verify returned slice is a defensive copy — mutating it must not affect the cache.
		if len(ids) > 0 {
			ids[0] = "mutated-value"
			cached, err2 := collectVersionIDs(mockClient, ctx, cachedPipelineID)
			assert.NoError(t, err2)
			assert.Equal(t, expectedVersionIDs, cached,
				"cache must be unaffected by mutation of the returned slice")
		}
	})

	t.Run("should fall back to API on cache miss", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("mock://collect-test")
		derivedIDs := psmocks.DeriveMockIDs("collect-test")

		ids, err := collectVersionIDs(mockClient, ctx, derivedIDs.PipelineID)

		assert.NoError(t, err)
		assert.NotNil(t, ids)
		assert.Contains(t, ids, derivedIDs.LatestVersionID)
	})

	t.Run("should return nil for unknown pipeline ID with no versions", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
		ids, err := collectVersionIDs(mockClient, ctx, "nonexistent-pipeline-id")

		assert.NoError(t, err)
		assert.Nil(t, ids)
	})

	t.Run("should propagate ListPipelineVersions API errors", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
		mockClient.ListPipelineVersionsErr = fmt.Errorf("connection refused")

		ids, err := collectVersionIDs(mockClient, ctx, "any-pipeline-id")

		assert.Nil(t, ids)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to list pipeline versions")
		assert.Contains(t, err.Error(), "connection refused")
	})
}

func TestGetAllPipelineRuns(t *testing.T) {
	repo := NewPipelineRunsRepository()
	ctx := context.Background()

	t.Run("should return error for nil client", func(t *testing.T) {
		runs, err := repo.GetAllPipelineRuns(nil, ctx, "some-id", constants.PipelineTypeTimeSeries)
		assert.Error(t, err)
		assert.Nil(t, runs)
		assert.Contains(t, err.Error(), "pipeline server client is nil")
	})

	t.Run("should retrieve all runs for a pipeline", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("mock://getall-test")
		derivedIDs := psmocks.DeriveMockIDs("getall-test")

		runs, err := repo.GetAllPipelineRuns(mockClient, ctx, derivedIDs.PipelineID, constants.PipelineTypeTimeSeries)

		assert.NoError(t, err)
		assert.NotNil(t, runs)
		for _, run := range runs {
			assert.Equal(t, constants.PipelineTypeTimeSeries, run.PipelineType)
		}
	})

	t.Run("should return nil when pipelineID is empty (no versions to scope)", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("http://mock-ps")
		runs, err := repo.GetAllPipelineRuns(mockClient, ctx, "", constants.PipelineTypeTabular)

		assert.NoError(t, err)
		assert.Nil(t, runs)
	})

	t.Run("should set pipelineType on all returned runs", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("mock://type-test")
		derivedIDs := psmocks.DeriveMockIDs("type-test")

		runs, err := repo.GetAllPipelineRuns(mockClient, ctx, derivedIDs.PipelineID, "custom-type")

		assert.NoError(t, err)
		for _, run := range runs {
			assert.Equal(t, "custom-type", run.PipelineType)
		}
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
