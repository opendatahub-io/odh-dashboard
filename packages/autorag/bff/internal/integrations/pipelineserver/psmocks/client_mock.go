package psmocks

import (
	"context"
	"crypto/x509"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// MockPipelineServerClient provides mock data for development
type MockPipelineServerClient struct{}

// NewMockPipelineServerClient creates a new mock pipeline server client
func NewMockPipelineServerClient() *MockPipelineServerClient {
	return &MockPipelineServerClient{}
}

// ListRuns returns mock pipeline run data
func (m *MockPipelineServerClient) ListRuns(ctx context.Context, params *pipelineserver.ListRunsParams) (*models.KFPipelineRunResponse, error) {
	// Return mock data with enhanced fields
	return &models.KFPipelineRunResponse{
		Runs: []models.KFPipelineRun{
			{
				RunID:        "run-abc123-def456",
				DisplayName:  "AutoRAG Optimization Run 1",
				Description:  "Test optimization run",
				ExperimentID: "exp-123",
				PipelineVersionReference: &models.PipelineVersionReference{
					PipelineID:        "pipeline-xyz",
					PipelineVersionID: "version-v1",
				},
				State:          "SUCCEEDED",
				StorageState:   "AVAILABLE",
				ServiceAccount: "pipeline-runner-dspa",
				CreatedAt:      "2026-02-24T10:30:00Z",
				ScheduledAt:    "2026-02-24T10:30:00Z",
				FinishedAt:     "2026-02-24T11:15:00Z",
				StateHistory: []models.RuntimeStatus{
					{
						UpdateTime: "2026-02-24T10:30:00Z",
						State:      "RUNNING",
					},
					{
						UpdateTime: "2026-02-24T11:15:00Z",
						State:      "SUCCEEDED",
					},
				},
			},
			{
				RunID:        "run-ghi789-jkl012",
				DisplayName:  "AutoRAG Optimization Run 2",
				Description:  "Another test run",
				ExperimentID: "exp-456",
				PipelineVersionReference: &models.PipelineVersionReference{
					PipelineID:        "pipeline-xyz",
					PipelineVersionID: "version-v2",
				},
				State:          "RUNNING",
				StorageState:   "AVAILABLE",
				ServiceAccount: "pipeline-runner-dspa",
				CreatedAt:      "2026-02-24T12:00:00Z",
				ScheduledAt:    "2026-02-24T12:00:00Z",
				StateHistory: []models.RuntimeStatus{
					{
						UpdateTime: "2026-02-24T12:00:00Z",
						State:      "RUNNING",
					},
				},
			},
			{
				RunID:        "run-mno345-pqr678",
				DisplayName:  "AutoRAG Baseline Run",
				Description:  "Baseline comparison run",
				ExperimentID: "exp-123",
				PipelineVersionReference: &models.PipelineVersionReference{
					PipelineID:        "pipeline-xyz",
					PipelineVersionID: "version-v1",
				},
				State:          "FAILED",
				StorageState:   "AVAILABLE",
				ServiceAccount: "pipeline-runner-dspa",
				CreatedAt:      "2026-02-23T14:00:00Z",
				ScheduledAt:    "2026-02-23T14:00:00Z",
				FinishedAt:     "2026-02-23T14:30:00Z",
				Error: &models.ErrorInfo{
					Code:    500,
					Message: "Pipeline execution failed: unable to connect to data source",
				},
				StateHistory: []models.RuntimeStatus{
					{
						UpdateTime: "2026-02-23T14:00:00Z",
						State:      "RUNNING",
					},
					{
						UpdateTime: "2026-02-23T14:30:00Z",
						State:      "FAILED",
						Error: &models.ErrorInfo{
							Code:    500,
							Message: "Pipeline execution failed: unable to connect to data source",
						},
					},
				},
			},
		},
		TotalSize:     3,
		NextPageToken: "",
	}, nil
}

// GetRun returns a mock pipeline run by ID
func (m *MockPipelineServerClient) GetRun(ctx context.Context, runID string) (*models.KFPipelineRun, error) {
	// Return mock data based on the run ID
	mockRun := &models.KFPipelineRun{
		RunID:        runID,
		DisplayName:  "AutoRAG Optimization Run",
		Description:  "Test optimization run",
		ExperimentID: "exp-123",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        "pipeline-xyz",
			PipelineVersionID: "version-v1",
		},
		State:          "SUCCEEDED",
		StorageState:   "AVAILABLE",
		ServiceAccount: "pipeline-runner-dspa",
		CreatedAt:      "2026-02-24T10:30:00Z",
		ScheduledAt:    "2026-02-24T10:30:00Z",
		FinishedAt:     "2026-02-24T11:15:00Z",
		StateHistory: []models.RuntimeStatus{
			{
				UpdateTime: "2026-02-24T10:30:00Z",
				State:      "RUNNING",
			},
			{
				UpdateTime: "2026-02-24T11:15:00Z",
				State:      "SUCCEEDED",
			},
		},
	}
	return mockRun, nil
}

// MockClientFactory creates mock pipeline server clients
type MockClientFactory struct{}

// NewMockClientFactory creates a new mock client factory
func NewMockClientFactory() *MockClientFactory {
	return &MockClientFactory{}
}

// CreateClient creates a mock pipeline server client
func (f *MockClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) pipelineserver.PipelineServerClientInterface {
	return NewMockPipelineServerClient()
}
