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
		runsData, err := repo.GetPipelineRuns(mockClient, ctx, "", 20, "")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		assert.Len(t, runsData.Runs, 3)
		assert.Equal(t, int32(3), runsData.TotalSize)
	})

	t.Run("should handle pipeline ID filtering", func(t *testing.T) {
		pipelineID := "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

		runsData, err := repo.GetPipelineRuns(mockClient, ctx, pipelineID, 20, "")

		assert.NoError(t, err)
		assert.NotNil(t, runsData)
		// Mock returns all runs regardless of filter
		assert.Len(t, runsData.Runs, 3)
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
		}
	})
}

func TestBuildPipelineIDFilter(t *testing.T) {
	t.Run("should build filter with pipeline ID", func(t *testing.T) {
		pipelineID := "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

		filter := buildPipelineIDFilter(pipelineID)
		assert.NotEmpty(t, filter)
		assert.Contains(t, filter, pipelineID)
		assert.Contains(t, filter, "pipeline_spec.pipeline_id")
		assert.Contains(t, filter, "predicates")
	})

	t.Run("should return empty filter for no pipeline ID", func(t *testing.T) {
		filter := buildPipelineIDFilter("")
		assert.Empty(t, filter)
	})

	t.Run("should format filter as JSON", func(t *testing.T) {
		pipelineID := "test-pipeline-id"

		filter := buildPipelineIDFilter(pipelineID)
		// Should be valid JSON
		assert.True(t, filter[0] == '{')
		assert.Contains(t, filter, "\"predicates\"")
	})
}
