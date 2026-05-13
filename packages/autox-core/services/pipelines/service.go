package pipelines

import (
	"context"
	"log/slog"

	k8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// PipelinesService provides business logic for Pipelines operations
type PipelinesService struct {
	Client     PipelinesClientInterface
	K8sService *k8s.K8sService
	Logger     *slog.Logger
}

type PipelinesServiceConfig struct {
	Logger *slog.Logger
}

func NewPipelinesService(cfg PipelinesServiceConfig, client PipelinesClientInterface, k8sService *k8s.K8sService) *PipelinesService {
	return &PipelinesService{
		Client:     client,
		K8sService: k8sService,
		Logger:     cfg.Logger,
	}
}

// PipelineTargetOptions specifies where to execute pipeline operations
type PipelineTargetOptions struct {
	// Namespace to discover DSPA in (mutually exclusive with BaseURL)
	Namespace string
	// BaseURL to use directly (mutually exclusive with Namespace)
	BaseURL string
}

// CreatePipelineRun creates a pipeline run
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) CreatePipelineRun(ctx context.Context, opts PipelineTargetOptions, req *CreatePipelineRunRequest) (*PipelineRun, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("creating pipeline run", "pipeline_id", req.PipelineID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	run, err := s.Client.CreatePipelineRun(ctx, baseURL, req)
	if err != nil {
		s.Logger.Error("failed to create pipeline run", "error", err)
		return nil, err
	}

	return run, nil
}

// GetPipelineRun retrieves a pipeline run by ID
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) GetPipelineRun(ctx context.Context, opts PipelineTargetOptions, runID string) (*PipelineRun, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting pipeline run", "run_id", runID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	run, err := s.Client.GetPipelineRun(ctx, baseURL, runID)
	if err != nil {
		s.Logger.Error("failed to get pipeline run", "run_id", runID, "error", err)
		return nil, err
	}

	return run, nil
}

// ListPipelineRuns lists pipeline runs
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) ListPipelineRuns(ctx context.Context, opts PipelineTargetOptions, params *ListRunsParams) (*PipelineRunResponse, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("listing pipeline runs")

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	response, err := s.Client.ListPipelineRuns(ctx, baseURL, params)
	if err != nil {
		s.Logger.Error("failed to list pipeline runs", "error", err)
		return nil, err
	}

	return response, nil
}

// TerminateRun terminates a running pipeline
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) TerminateRun(ctx context.Context, opts PipelineTargetOptions, runID string) error {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("terminating pipeline run", "run_id", runID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return err
	}

	if err := s.Client.TerminateRun(ctx, baseURL, runID); err != nil {
		s.Logger.Error("failed to terminate pipeline run", "run_id", runID, "error", err)
		return err
	}

	return nil
}

// RetryRun retries a failed pipeline run
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) RetryRun(ctx context.Context, opts PipelineTargetOptions, runID string) error {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("retrying pipeline run", "run_id", runID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return err
	}

	if err := s.Client.RetryRun(ctx, baseURL, runID); err != nil {
		s.Logger.Error("failed to retry pipeline run", "run_id", runID, "error", err)
		return err
	}

	return nil
}

// DeleteRun deletes a pipeline run
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) DeleteRun(ctx context.Context, opts PipelineTargetOptions, runID string) error {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("deleting pipeline run", "run_id", runID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return err
	}

	if err := s.Client.DeleteRun(ctx, baseURL, runID); err != nil {
		s.Logger.Error("failed to delete pipeline run", "run_id", runID, "error", err)
		return err
	}

	return nil
}

// ListPipelines lists all pipelines
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) ListPipelines(ctx context.Context, opts PipelineTargetOptions, filter string) (*PipelinesResponse, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("listing pipelines")

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	response, err := s.Client.ListPipelines(ctx, baseURL, filter)
	if err != nil {
		s.Logger.Error("failed to list pipelines", "error", err)
		return nil, err
	}

	return response, nil
}

// GetPipelineVersion retrieves a pipeline version
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) GetPipelineVersion(ctx context.Context, opts PipelineTargetOptions, pipelineID, versionID string) (*PipelineVersion, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting pipeline version", "pipeline_id", pipelineID, "version_id", versionID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	version, err := s.Client.GetPipelineVersion(ctx, baseURL, pipelineID, versionID)
	if err != nil {
		s.Logger.Error("failed to get pipeline version", "pipeline_id", pipelineID, "version_id", versionID, "error", err)
		return nil, err
	}

	return version, nil
}

// ListPipelineVersions lists all versions for a pipeline
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) ListPipelineVersions(ctx context.Context, opts PipelineTargetOptions, pipelineID string) (*PipelineVersionsResponse, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("listing pipeline versions", "pipeline_id", pipelineID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	response, err := s.Client.ListPipelineVersions(ctx, baseURL, pipelineID)
	if err != nil {
		s.Logger.Error("failed to list pipeline versions", "pipeline_id", pipelineID, "error", err)
		return nil, err
	}

	return response, nil
}

// CreatePipeline creates a new pipeline
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) CreatePipeline(ctx context.Context, opts PipelineTargetOptions, name string) (*Pipeline, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("creating pipeline", "name", name)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	pipeline, err := s.Client.CreatePipeline(ctx, baseURL, name)
	if err != nil {
		s.Logger.Error("failed to create pipeline", "name", name, "error", err)
		return nil, err
	}

	return pipeline, nil
}

// UploadPipelineVersion uploads a new pipeline version
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) UploadPipelineVersion(ctx context.Context, opts PipelineTargetOptions, pipelineID, versionName string, fileContent []byte) (*PipelineVersion, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("uploading pipeline version", "pipeline_id", pipelineID, "version_name", versionName)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	version, err := s.Client.UploadPipelineVersion(ctx, baseURL, pipelineID, versionName, fileContent)
	if err != nil {
		s.Logger.Error("failed to upload pipeline version", "pipeline_id", pipelineID, "version_name", versionName, "error", err)
		return nil, err
	}

	return version, nil
}

// loggerWithIdentity extracts identity from context and returns a logger with the user field attached.
// If identity extraction fails, it logs the error and returns the base logger (without user field).
func (s *PipelinesService) loggerWithIdentity(ctx context.Context) *slog.Logger {
	identity, err := k8s.IdentityFromContext(ctx)
	if err != nil {
		// This indicates a middleware configuration issue - log but don't fail the request
		s.Logger.Error("missing identity in context", "error", err)
		return s.Logger
	}
	// Return a logger with user field already attached
	return s.Logger.With("user", identity.UserID)
}
