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
	// Return mock data
	return &models.KFPipelineRunResponse{
		Runs: []models.KFPipelineRun{
			{
				RunID:       "run-abc123-def456",
				DisplayName: "AutoRAG Optimization Run 1",
				Description: "Test optimization run",
				State:       "SUCCEEDED",
				CreatedAt:   "2026-02-24T10:30:00Z",
				FinishedAt:  "2026-02-24T11:15:00Z",
			},
			{
				RunID:       "run-ghi789-jkl012",
				DisplayName: "AutoRAG Optimization Run 2",
				Description: "Another test run",
				State:       "RUNNING",
				CreatedAt:   "2026-02-24T12:00:00Z",
			},
			{
				RunID:       "run-mno345-pqr678",
				DisplayName: "AutoRAG Baseline Run",
				Description: "Baseline comparison run",
				State:       "FAILED",
				CreatedAt:   "2026-02-23T14:00:00Z",
				FinishedAt:  "2026-02-23T14:30:00Z",
			},
		},
		TotalSize:     3,
		NextPageToken: "",
	}, nil
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
