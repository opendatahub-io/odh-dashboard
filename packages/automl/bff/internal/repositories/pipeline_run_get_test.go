package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver/psmocks"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
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

// mockClientNilRef returns a run with nil PipelineVersionReference
type mockClientNilRef struct {
	*psmocks.MockPipelineServerClient
}

func (m *mockClientNilRef) GetRun(ctx context.Context, runID string) (*models.KFPipelineRun, error) {
	run, err := m.MockPipelineServerClient.GetRun(ctx, runID)
	if err != nil {
		return nil, err
	}
	// Override to return nil PipelineVersionReference
	run.PipelineVersionReference = nil
	return run, nil
}

// mockClientEmptyPipelineID returns a run with empty PipelineID
type mockClientEmptyPipelineID struct {
	*psmocks.MockPipelineServerClient
}

func (m *mockClientEmptyPipelineID) GetRun(ctx context.Context, runID string) (*models.KFPipelineRun, error) {
	run, err := m.MockPipelineServerClient.GetRun(ctx, runID)
	if err != nil {
		return nil, err
	}
	// Override to return empty PipelineID
	run.PipelineVersionReference.PipelineID = ""
	return run, nil
}

// mockClientEmptyVersionID returns a run with empty PipelineVersionID
type mockClientEmptyVersionID struct {
	*psmocks.MockPipelineServerClient
}

func (m *mockClientEmptyVersionID) GetRun(ctx context.Context, runID string) (*models.KFPipelineRun, error) {
	run, err := m.MockPipelineServerClient.GetRun(ctx, runID)
	if err != nil {
		return nil, err
	}
	// Override to return empty PipelineVersionID
	run.PipelineVersionReference.PipelineVersionID = ""
	return run, nil
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

	t.Run("should handle nil PipelineVersionReference without panic", func(t *testing.T) {
		// Create a custom mock that returns a run with nil PipelineVersionReference
		// to verify the guard at line 513:
		// if ref := kfRun.PipelineVersionReference; ref != nil && ref.PipelineID != "" && ref.PipelineVersionID != ""
		mockNilRef := &mockClientNilRef{
			MockPipelineServerClient: psmocks.NewMockPipelineServerClient("mock://test-namespace"),
		}

		run, err := repo.GetPipelineRun(mockNilRef, ctx, "run-1")

		// Should complete successfully without panic - the guard prevents GetPipelineVersion call
		require.NoError(t, err)
		require.NotNil(t, run)
		assert.Nil(t, run.PipelineVersionReference, "Test setup: reference should be nil")
		// PipelineSpec should not be enriched when reference is nil
		assert.Nil(t, run.PipelineSpec, "PipelineSpec should not be enriched when PipelineVersionReference is nil")
	})

	t.Run("should handle empty PipelineID in PipelineVersionReference", func(t *testing.T) {
		// This test verifies the guard checks: ref.PipelineID != ""
		mockEmptyID := &mockClientEmptyPipelineID{
			MockPipelineServerClient: psmocks.NewMockPipelineServerClient("mock://test-namespace"),
		}

		run, err := repo.GetPipelineRun(mockEmptyID, ctx, "run-1")

		require.NoError(t, err)
		require.NotNil(t, run)
		assert.Equal(t, "", run.PipelineVersionReference.PipelineID, "Test setup: PipelineID should be empty")
		// PipelineSpec should not be enriched when PipelineID is empty
		assert.Nil(t, run.PipelineSpec, "PipelineSpec should not be enriched when PipelineID is empty")
	})

	t.Run("should handle empty PipelineVersionID in PipelineVersionReference", func(t *testing.T) {
		// This test verifies the guard checks: ref.PipelineVersionID != ""
		mockEmptyVersionID := &mockClientEmptyVersionID{
			MockPipelineServerClient: psmocks.NewMockPipelineServerClient("mock://test-namespace"),
		}

		run, err := repo.GetPipelineRun(mockEmptyVersionID, ctx, "run-1")

		require.NoError(t, err)
		require.NotNil(t, run)
		assert.Equal(t, "", run.PipelineVersionReference.PipelineVersionID, "Test setup: PipelineVersionID should be empty")
		// PipelineSpec should not be enriched when PipelineVersionID is empty
		assert.Nil(t, run.PipelineSpec, "PipelineSpec should not be enriched when PipelineVersionID is empty")
	})
}
