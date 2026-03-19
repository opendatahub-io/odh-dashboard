package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockClientWithPipelineSpec embeds the base mock and overrides GetPipelineVersion
// to return a version with a PipelineSpec field.
type mockClientWithPipelineSpec struct {
	*psmocks.MockPipelineServerClient
	pipelineSpec json.RawMessage
}

func (m *mockClientWithPipelineSpec) GetPipelineVersion(_ context.Context, _, _ string) (*models.KFPipelineVersion, error) {
	return &models.KFPipelineVersion{
		PipelineID:        "test-pipeline-id",
		PipelineVersionID: "test-version-id",
		DisplayName:       "test-version",
		PipelineSpec:      m.pipelineSpec,
	}, nil
}

// mockClientFailingVersion embeds the base mock and overrides GetPipelineVersion to return an error.
type mockClientFailingVersion struct {
	*psmocks.MockPipelineServerClient
}

func (m *mockClientFailingVersion) GetPipelineVersion(_ context.Context, _, _ string) (*models.KFPipelineVersion, error) {
	return nil, fmt.Errorf("version fetch failed")
}

func TestPipelineRunsRepository_GetPipelineRun(t *testing.T) {
	repo := NewPipelineRunsRepository()
	ctx := context.Background()

	t.Run("should retrieve a pipeline run successfully", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		run, err := repo.GetPipelineRun(mockClient, ctx, "run-1")

		require.NoError(t, err)
		require.NotNil(t, run)
		assert.NotEmpty(t, run.RunID)
		assert.NotEmpty(t, run.DisplayName)
		assert.NotEmpty(t, run.State)
	})

	t.Run("should enrich run with pipeline_spec from pipeline version", func(t *testing.T) {
		mockPipelineSpec := json.RawMessage(`{"root":{"dag":{"tasks":{"task-1":{}}}}}`)
		client := &mockClientWithPipelineSpec{
			MockPipelineServerClient: psmocks.NewMockPipelineServerClient("mock://test-namespace"),
			pipelineSpec:             mockPipelineSpec,
		}

		run, err := repo.GetPipelineRun(client, ctx, "run-1")

		require.NoError(t, err)
		require.NotNil(t, run)
		assert.NotNil(t, run.PipelineSpec, "PipelineSpec should be enriched from pipeline version")
		assert.JSONEq(t, `{"root":{"dag":{"tasks":{"task-1":{}}}}}`, string(run.PipelineSpec))
	})

	t.Run("should still return run when GetPipelineVersion fails", func(t *testing.T) {
		client := &mockClientFailingVersion{
			MockPipelineServerClient: psmocks.NewMockPipelineServerClient("mock://test-namespace"),
		}

		run, err := repo.GetPipelineRun(client, ctx, "run-1")

		require.NoError(t, err)
		require.NotNil(t, run)
		assert.NotEmpty(t, run.RunID, "Run should still be returned even if version fetch fails")
	})

	t.Run("should return error when client is nil", func(t *testing.T) {
		run, err := repo.GetPipelineRun(nil, ctx, "run-1")

		assert.Error(t, err)
		assert.Nil(t, run)
		assert.Contains(t, err.Error(), "pipeline server client is nil")
	})

	t.Run("should include run_details in the response", func(t *testing.T) {
		mockClient := psmocks.NewMockPipelineServerClient("mock://test-namespace")
		run, err := repo.GetPipelineRun(mockClient, ctx, "run-1")

		require.NoError(t, err)
		require.NotNil(t, run)
		assert.NotNil(t, run.RunDetails, "RunDetails should be present for topology status display")
	})
}
