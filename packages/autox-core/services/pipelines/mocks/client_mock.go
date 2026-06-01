package mocks

import (
	"context"

	plsvc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

// MockPipelinesClient implements plsvc.PipelinesClient with configurable function fields.
// Each field is optional — if nil, the method returns a zero value and nil error.
type MockPipelinesClient struct {
	CreatePipelineRunFunc    func(ctx context.Context, baseURL string, input *plsvc.CreatePipelineRunInput) (*plsvc.PipelineRun, error)
	GetPipelineRunFunc       func(ctx context.Context, baseURL string, runID string) (*plsvc.PipelineRun, error)
	ListPipelineRunsFunc     func(ctx context.Context, baseURL string, params *plsvc.ListRunsParams) (*plsvc.PipelineRunResponse, error)
	TerminateRunFunc         func(ctx context.Context, baseURL string, runID string) error
	RetryRunFunc             func(ctx context.Context, baseURL string, runID string) error
	DeleteRunFunc            func(ctx context.Context, baseURL string, runID string) error
	ListPipelinesFunc        func(ctx context.Context, baseURL string, filter string) (*plsvc.PipelinesResponse, error)
	GetPipelineVersionFunc   func(ctx context.Context, baseURL string, pipelineID, versionID string) (*plsvc.PipelineVersion, error)
	ListPipelineVersionsFunc func(ctx context.Context, baseURL string, pipelineID string) (*plsvc.PipelineVersionsResponse, error)
	CreatePipelineFunc       func(ctx context.Context, baseURL string, name string) (*plsvc.Pipeline, error)
	UploadPipelineVersionFunc func(ctx context.Context, baseURL string, pipelineID string, versionName string, fileContent []byte) (*plsvc.PipelineVersion, error)
}

func (m *MockPipelinesClient) CreatePipelineRun(ctx context.Context, baseURL string, input *plsvc.CreatePipelineRunInput) (*plsvc.PipelineRun, error) {
	if m.CreatePipelineRunFunc != nil {
		return m.CreatePipelineRunFunc(ctx, baseURL, input)
	}
	return &plsvc.PipelineRun{RunID: "mock-run-id", DisplayName: input.DisplayName}, nil
}

func (m *MockPipelinesClient) GetPipelineRun(ctx context.Context, baseURL string, runID string) (*plsvc.PipelineRun, error) {
	if m.GetPipelineRunFunc != nil {
		return m.GetPipelineRunFunc(ctx, baseURL, runID)
	}
	return &plsvc.PipelineRun{RunID: runID, State: "RUNNING"}, nil
}

func (m *MockPipelinesClient) ListPipelineRuns(ctx context.Context, baseURL string, params *plsvc.ListRunsParams) (*plsvc.PipelineRunResponse, error) {
	if m.ListPipelineRunsFunc != nil {
		return m.ListPipelineRunsFunc(ctx, baseURL, params)
	}
	return &plsvc.PipelineRunResponse{Runs: []plsvc.PipelineRun{}}, nil
}

func (m *MockPipelinesClient) TerminateRun(ctx context.Context, baseURL string, runID string) error {
	if m.TerminateRunFunc != nil {
		return m.TerminateRunFunc(ctx, baseURL, runID)
	}
	return nil
}

func (m *MockPipelinesClient) RetryRun(ctx context.Context, baseURL string, runID string) error {
	if m.RetryRunFunc != nil {
		return m.RetryRunFunc(ctx, baseURL, runID)
	}
	return nil
}

func (m *MockPipelinesClient) DeleteRun(ctx context.Context, baseURL string, runID string) error {
	if m.DeleteRunFunc != nil {
		return m.DeleteRunFunc(ctx, baseURL, runID)
	}
	return nil
}

func (m *MockPipelinesClient) ListPipelines(ctx context.Context, baseURL string, filter string) (*plsvc.PipelinesResponse, error) {
	if m.ListPipelinesFunc != nil {
		return m.ListPipelinesFunc(ctx, baseURL, filter)
	}
	return &plsvc.PipelinesResponse{Pipelines: []plsvc.Pipeline{}}, nil
}

func (m *MockPipelinesClient) GetPipelineVersion(ctx context.Context, baseURL string, pipelineID, versionID string) (*plsvc.PipelineVersion, error) {
	if m.GetPipelineVersionFunc != nil {
		return m.GetPipelineVersionFunc(ctx, baseURL, pipelineID, versionID)
	}
	return &plsvc.PipelineVersion{PipelineVersionID: versionID, PipelineID: pipelineID}, nil
}

func (m *MockPipelinesClient) ListPipelineVersions(ctx context.Context, baseURL string, pipelineID string) (*plsvc.PipelineVersionsResponse, error) {
	if m.ListPipelineVersionsFunc != nil {
		return m.ListPipelineVersionsFunc(ctx, baseURL, pipelineID)
	}
	return &plsvc.PipelineVersionsResponse{PipelineVersions: []plsvc.PipelineVersion{}}, nil
}

func (m *MockPipelinesClient) CreatePipeline(ctx context.Context, baseURL string, name string) (*plsvc.Pipeline, error) {
	if m.CreatePipelineFunc != nil {
		return m.CreatePipelineFunc(ctx, baseURL, name)
	}
	return &plsvc.Pipeline{PipelineID: "mock-pipeline-id", DisplayName: name}, nil
}

func (m *MockPipelinesClient) UploadPipelineVersion(ctx context.Context, baseURL string, pipelineID string, versionName string, fileContent []byte) (*plsvc.PipelineVersion, error) {
	if m.UploadPipelineVersionFunc != nil {
		return m.UploadPipelineVersionFunc(ctx, baseURL, pipelineID, versionName, fileContent)
	}
	return &plsvc.PipelineVersion{PipelineVersionID: "mock-version-id", PipelineID: pipelineID, DisplayName: versionName}, nil
}

// Compile-time check.
var _ plsvc.PipelinesClient = (*MockPipelinesClient)(nil)
