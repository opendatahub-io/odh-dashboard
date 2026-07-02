package fake

import (
	"context"

	plsvc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

// PipelinesClient is a fake implementation of pipelines.Client for local development and testing.
type PipelinesClient struct{}

var _ plsvc.Client = (*PipelinesClient)(nil)

func (c *PipelinesClient) CreatePipelineRun(_ context.Context, _ string, input *plsvc.CreatePipelineRunInput) (*plsvc.PipelineRun, error) {
	return &plsvc.PipelineRun{RunID: "fake-run-id", DisplayName: input.DisplayName}, nil
}

func (c *PipelinesClient) GetPipelineRun(_ context.Context, _ string, runID string) (*plsvc.PipelineRun, error) {
	return &plsvc.PipelineRun{RunID: runID}, nil
}

func (c *PipelinesClient) ListPipelineRuns(_ context.Context, _ string, _ *plsvc.ListRunsParams) (*plsvc.PipelineRunResponse, error) {
	return &plsvc.PipelineRunResponse{}, nil
}

func (c *PipelinesClient) TerminateRun(_ context.Context, _ string, _ string) error {
	return nil
}

func (c *PipelinesClient) RetryRun(_ context.Context, _ string, _ string) error {
	return nil
}

func (c *PipelinesClient) DeleteRun(_ context.Context, _ string, _ string) error {
	return nil
}

func (c *PipelinesClient) ListPipelines(_ context.Context, _ string, _ string) (*plsvc.PipelinesResponse, error) {
	return &plsvc.PipelinesResponse{}, nil
}

func (c *PipelinesClient) GetPipelineVersion(_ context.Context, _ string, _, _ string) (*plsvc.PipelineVersion, error) {
	return &plsvc.PipelineVersion{}, nil
}

func (c *PipelinesClient) ListPipelineVersions(_ context.Context, _ string, _ string) (*plsvc.PipelineVersionsResponse, error) {
	return &plsvc.PipelineVersionsResponse{}, nil
}

func (c *PipelinesClient) CreatePipeline(_ context.Context, _ string, _ string) (*plsvc.Pipeline, error) {
	return &plsvc.Pipeline{}, nil
}

func (c *PipelinesClient) UploadPipelineVersion(_ context.Context, _ string, _ string, _ string, _ []byte) (*plsvc.PipelineVersion, error) {
	return &plsvc.PipelineVersion{}, nil
}
