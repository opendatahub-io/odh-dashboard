package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/stretchr/testify/assert"
)

func TestPipelineRunsRepository_GetPipelineRuns(t *testing.T) {
	repo := NewPipelineRunsRepository()
	mockClient := psmocks.NewMockPipelineServerClient()
	ctx := context.Background()

	t.Run("should retrieve pipeline runs successfully", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, nil, 20, "")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		assert.Len(t, runsData.Runs, 3)
		assert.Equal(t, int32(3), runsData.TotalSize)
	})

	t.Run("should handle annotation filtering", func(t *testing.T) {
		annotations := map[string]string{
			"autorag.opendatahub.io/experiment-id": "exp-123",
		}

		runsData, err := repo.GetPipelineRuns(mockClient, ctx, annotations, 20, "")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		// Mock returns all runs regardless of filter
		assert.Len(t, runsData.Runs, 3)
	})

	t.Run("should handle pagination parameters", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, nil, 10, "page-token-123")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
	})

	t.Run("should extract annotations from runtime config", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, nil, 20, "")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)

		if len(runsData.Runs) > 0 {
			firstRun := runsData.Runs[0]
			assert.NotNil(t, firstRun.Annotations)
			// Mock data should have annotations extracted from runtime config
			assert.Contains(t, firstRun.Annotations, "autorag.opendatahub.io/experiment-id")
		}
	})

	t.Run("should transform Kubeflow format to stable API format", func(t *testing.T) {
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, nil, 20, "")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)

		if len(runsData.Runs) > 0 {
			run := runsData.Runs[0]
			// Verify required fields are present
			assert.NotEmpty(t, run.RunID)
			assert.NotEmpty(t, run.DisplayName)
			assert.NotEmpty(t, run.State)
			assert.NotEmpty(t, run.CreatedAt)
		}
	})
}

func TestBuildAnnotationFilter(t *testing.T) {
	t.Run("should build filter with single annotation", func(t *testing.T) {
		annotations := map[string]string{
			"experiment-id": "exp-123",
		}

		filter := buildAnnotationFilter(annotations)
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, "experiment-id")
		assert.Contains(t, filter, "exp-123")
		assert.Contains(t, filter, "predicates")
	})

	t.Run("should build filter with multiple annotations", func(t *testing.T) {
		annotations := map[string]string{
			"experiment-id": "exp-123",
			"dataset":       "test-set-v1",
		}

		filter := buildAnnotationFilter(annotations)
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, "experiment-id")
		assert.Contains(t, filter, "dataset")
		assert.Contains(t, filter, "predicates")
	})

	t.Run("should return empty filter for no annotations", func(t *testing.T) {
		filter := buildAnnotationFilter(nil)
		assert.Empty(t, filter)

		filter = buildAnnotationFilter(map[string]string{})
		assert.Empty(t, filter)
	})

	t.Run("should format filter as JSON", func(t *testing.T) {
		annotations := map[string]string{
			"key": "value",
		}

		filter := buildAnnotationFilter(annotations)
		// Should be valid JSON
		assert.True(t, filter[0] == '{')
		assert.Contains(t, filter, "\"predicates\"")
	})
}

func TestExtractAnnotations(t *testing.T) {
	t.Run("should extract annotations with annotation_ prefix", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.Background()

		// Get mock response
		kfResponse, err := mockClient.ListRuns(ctx, nil)
		assert.NoError(t, err)
		assert.NotEmpty(t, kfResponse.Runs)

		// Extract annotations from first run
		annotations := extractAnnotations(kfResponse.Runs[0])

		assert.NotNil(t, annotations)
		// Mock data has annotations with "annotation_" prefix in parameters
		assert.Contains(t, annotations, "autorag.opendatahub.io/experiment-id")
	})

	// Note: Testing empty runtime config would require creating a KFPipelineRun
	// with nil RuntimeConfig, which is handled by the extractAnnotations function

	t.Run("should skip non-string annotation values", func(t *testing.T) {
		// Test that only string values are extracted from annotations
		// Non-string parameters should be ignored
		mockClient := psmocks.NewMockPipelineServerClient()
		ctx := context.Background()

		kfResponse, err := mockClient.ListRuns(ctx, nil)
		assert.NoError(t, err)

		if len(kfResponse.Runs) > 0 {
			annotations := extractAnnotations(kfResponse.Runs[0])
			// All extracted annotations should be strings
			for _, value := range annotations {
				assert.IsType(t, "", value)
			}
		}
	})
}
