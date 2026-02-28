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

	t.Run("should handle pipeline version ID filtering", func(t *testing.T) {
		pipelineVersionID := "22e57c06-030f-4c63-900d-0a808d577899"

		runsData, err := repo.GetPipelineRuns(mockClient, ctx, pipelineVersionID, 20, "")

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
