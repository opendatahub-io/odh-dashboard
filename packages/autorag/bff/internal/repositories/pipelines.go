package repositories

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"unicode/utf8"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	embeddedpipelines "github.com/opendatahub-io/autorag-library/bff/internal/pipelines"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

var (
	ErrPipelineRunNotFound = errors.New("pipeline run not found")
	ErrValidation          = errors.New("validation error")
)

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

func (e *ValidationError) Unwrap() error {
	return ErrValidation
}

func NewValidationError(message string) error {
	return &ValidationError{Message: message}
}

// PipelinesRepository handles all pipeline and pipeline-run operations,
// delegating generic work to autox-core's PipelinesService and keeping
// autorag-specific logic (validation, ownership, definitions) local.
type PipelinesRepository struct {
	core   pipelines.Service
	config PipelinesRepositoryConfig
}

type PipelinesRepositoryConfig struct {
	AutoRAGPipelineName    string
	DefaultPipelineVersion string
}

func NewPipelinesRepository(core pipelines.Service, cfg PipelinesRepositoryConfig) *PipelinesRepository {
	if cfg.DefaultPipelineVersion == "" {
		cfg.DefaultPipelineVersion = constants.DefaultPipelineVersionSuffix
	}
	return &PipelinesRepository{core: core, config: cfg}
}

// --- Pipeline Discovery & Ensure ---

func (r *PipelinesRepository) DiscoverNamedPipelines(ctx context.Context, namespace string) (map[string]*pipelines.DiscoveredPipeline, error) {
	definitions := map[string]string{
		constants.PipelineTypeAutoRAG: r.config.AutoRAGPipelineName,
	}
	return r.core.DiscoverNamedPipelines(ctx, namespace, r.config.DefaultPipelineVersion, definitions)
}

func (r *PipelinesRepository) EnsurePipeline(ctx context.Context, namespace string) (*pipelines.DiscoveredPipeline, error) {
	def, err := r.pipelineDefinition()
	if err != nil {
		return nil, err
	}
	return r.core.EnsurePipeline(ctx, namespace, def)
}

func (r *PipelinesRepository) pipelineDefinition() (pipelines.PipelineDefinition, error) {
	yamlBytes, err := embeddedpipelines.GetPipelineYAML(constants.PipelineDirAutoRAG)
	if err != nil {
		return pipelines.PipelineDefinition{}, fmt.Errorf("failed to load embedded pipeline YAML %q: %w", constants.PipelineDirAutoRAG, err)
	}

	if override := os.Getenv("RELATED_IMAGE_ODH_AUTORAG_IMAGE"); override != "" {
		yamlBytes = embeddedpipelines.ReplaceImageRef(yamlBytes, embeddedpipelines.AutoRAGImagePattern, override)
	}

	return pipelines.PipelineDefinition{
		Name:        r.config.AutoRAGPipelineName,
		Version:     r.config.DefaultPipelineVersion,
		FileContent: yamlBytes,
	}, nil
}

// --- Pipeline Runs: List ---

func (r *PipelinesRepository) GetCombinedRuns(ctx context.Context, namespace string, pageSize int32, pageToken string) (*models.PipelineRunsData, error) {
	discovered, err := r.DiscoverNamedPipelines(ctx, namespace)
	if err != nil {
		return nil, err
	}

	dp := discovered[constants.PipelineTypeAutoRAG]
	if dp == nil {
		return &models.PipelineRunsData{Runs: []models.PipelineRun{}}, nil
	}

	// AutoRAG has a single pipeline type — delegate directly to autox-core's
	// per-pipeline list which handles version collection and filtering internally.
	runs, err := r.core.GetAllPipelineRuns(ctx, namespace, dp.PipelineID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pipeline runs: %w", err)
	}

	// Apply page/pageSize pagination
	page := int64(1)
	paged := pipelines.SortAndPaginateRuns(runs, page, pageSize)

	taggedRuns := make([]models.PipelineRun, 0, len(paged.Runs))
	for _, run := range paged.Runs {
		taggedRuns = append(taggedRuns, toAutoRAGRun(&run))
	}

	return &models.PipelineRunsData{
		Runs:      taggedRuns,
		TotalSize: paged.TotalSize,
	}, nil
}

// --- Pipeline Runs: Single + Ownership ---

func (r *PipelinesRepository) GetManagedRun(ctx context.Context, namespace, runID string) (*models.PipelineRun, error) {
	coreRun, err := r.core.GetPipelineRunWithSpec(ctx, namespace, runID)
	if err != nil {
		if errors.Is(err, pipelines.ErrPipelineRunNotFound) {
			return nil, ErrPipelineRunNotFound
		}
		return nil, err
	}

	discovered, err := r.DiscoverNamedPipelines(ctx, namespace)
	if err != nil {
		return nil, err
	}

	if !r.isManaged(*coreRun, discovered) {
		return nil, ErrPipelineRunNotFound
	}

	run := toAutoRAGRun(coreRun)
	return &run, nil
}

// --- Pipeline Runs: Create ---

func (r *PipelinesRepository) CreateRun(ctx context.Context, namespace string, req models.CreateAutoRAGRunRequest) (*models.PipelineRun, error) {
	if err := ValidateCreateAutoRAGRunRequest(req); err != nil {
		return nil, err
	}

	discovered, err := r.EnsurePipeline(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to ensure autorag pipeline: %w", err)
	}

	kfpReq := BuildKFPRunRequest(req, discovered.PipelineID, discovered.PipelineVersionID)

	coreRun, err := r.core.CreatePipelineRun(ctx, namespace, &pipelines.CreatePipelineRunInput{
		DisplayName: kfpReq.DisplayName,
		Description: kfpReq.Description,
		PipelineVersionReference: &pipelines.PipelineVersionReference{
			PipelineID:        kfpReq.PipelineVersionReference.PipelineID,
			PipelineVersionID: kfpReq.PipelineVersionReference.PipelineVersionID,
		},
		RuntimeConfig: &pipelines.RuntimeConfig{
			Parameters: kfpReq.RuntimeConfig.Parameters,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create pipeline run: %w", err)
	}

	run := toAutoRAGRun(coreRun)
	return &run, nil
}

// --- Pipeline Runs: Mutations ---
// State validation is handled by autox-core.
// Ownership validation (run belongs to a discovered AutoRAG pipeline) is autorag-specific.

func (r *PipelinesRepository) TerminateRun(ctx context.Context, namespace, runID string) error {
	if _, err := r.GetManagedRun(ctx, namespace, runID); err != nil {
		return err
	}
	return r.core.TerminateRun(ctx, namespace, runID)
}

func (r *PipelinesRepository) RetryRun(ctx context.Context, namespace, runID string) error {
	if _, err := r.GetManagedRun(ctx, namespace, runID); err != nil {
		return err
	}
	return r.core.RetryRun(ctx, namespace, runID)
}

func (r *PipelinesRepository) DeleteRun(ctx context.Context, namespace, runID string) error {
	if _, err := r.GetManagedRun(ctx, namespace, runID); err != nil {
		return err
	}
	return r.core.DeleteRun(ctx, namespace, runID)
}

// --- Helpers ---

func (r *PipelinesRepository) isManaged(run pipelines.PipelineRun, discovered map[string]*pipelines.DiscoveredPipeline) bool {
	if run.PipelineVersionReference == nil {
		return false
	}
	for _, dp := range discovered {
		if run.PipelineVersionReference.PipelineID == dp.PipelineID {
			return true
		}
	}
	return false
}

func toAutoRAGRun(run *pipelines.PipelineRun) models.PipelineRun {
	result := models.PipelineRun{
		RunID:          run.RunID,
		DisplayName:    run.DisplayName,
		Description:    run.Description,
		ExperimentID:   run.ExperimentID,
		State:          run.State,
		StorageState:   run.StorageState,
		ServiceAccount: run.ServiceAccount,
		CreatedAt:      run.CreatedAt,
		ScheduledAt:    run.ScheduledAt,
		FinishedAt:     run.FinishedAt,
		PipelineSpec:   run.PipelineSpec,
		PipelineType:   constants.PipelineTypeAutoRAG,
	}

	if run.PipelineVersionReference != nil {
		result.PipelineVersionReference = &models.PipelineVersionReference{
			PipelineID:        run.PipelineVersionReference.PipelineID,
			PipelineVersionID: run.PipelineVersionReference.PipelineVersionID,
		}
	}

	if run.RuntimeConfig != nil {
		result.RuntimeConfig = &models.RuntimeConfig{
			Parameters:   run.RuntimeConfig.Parameters,
			PipelineRoot: run.RuntimeConfig.PipelineRoot,
		}
	}

	if run.Error != nil {
		result.Error = &models.ErrorInfo{Code: run.Error.Code, Message: run.Error.Message}
	}

	if run.RunDetails != nil {
		details := &models.RunDetails{}
		for _, td := range run.RunDetails.TaskDetails {
			detail := models.TaskDetail{
				RunID: td.RunID, TaskID: td.TaskID, DisplayName: td.DisplayName,
				CreateTime: td.CreateTime, StartTime: td.StartTime, EndTime: td.EndTime,
				State: td.State,
			}
			if td.Error != nil {
				detail.Error = &models.ErrorInfo{Code: td.Error.Code, Message: td.Error.Message}
			}
			for _, ct := range td.ChildTasks {
				detail.ChildTasks = append(detail.ChildTasks, models.ChildTask{PodName: ct.PodName})
			}
			for _, sh := range td.StateHistory {
				rs := models.RuntimeStatus{UpdateTime: sh.UpdateTime, State: sh.State}
				if sh.Error != nil {
					rs.Error = &models.ErrorInfo{Code: sh.Error.Code, Message: sh.Error.Message}
				}
				detail.StateHistory = append(detail.StateHistory, rs)
			}
			details.TaskDetails = append(details.TaskDetails, detail)
		}
		result.RunDetails = details
	}

	for _, sh := range run.StateHistory {
		rs := models.RuntimeStatus{UpdateTime: sh.UpdateTime, State: sh.State}
		if sh.Error != nil {
			rs.Error = &models.ErrorInfo{Code: sh.Error.Code, Message: sh.Error.Message}
		}
		result.StateHistory = append(result.StateHistory, rs)
	}

	return result
}

// --- Validation (autorag-specific) ---

func ValidateCreateAutoRAGRunRequest(req models.CreateAutoRAGRunRequest) error {
	var missing []string
	if req.DisplayName == "" {
		missing = append(missing, "display_name")
	}
	if req.TestDataSecretName == "" {
		missing = append(missing, "test_data_secret_name")
	}
	if req.TestDataBucketName == "" {
		missing = append(missing, "test_data_bucket_name")
	}
	if req.TestDataKey == "" {
		missing = append(missing, "test_data_key")
	}
	if req.InputDataSecretName == "" {
		missing = append(missing, "input_data_secret_name")
	}
	if req.InputDataBucketName == "" {
		missing = append(missing, "input_data_bucket_name")
	}
	if req.InputDataKey == "" {
		missing = append(missing, "input_data_key")
	}
	if req.OGXSecretName == "" {
		missing = append(missing, "ogx_secret_name")
	}
	if len(missing) > 0 {
		return NewValidationError(fmt.Sprintf("missing required fields: %s", strings.Join(missing, ", ")))
	}

	if req.OptimizationMetric != "" && !constants.ValidOptimizationMetrics[req.OptimizationMetric] {
		return NewValidationError(fmt.Sprintf("invalid optimization_metric %q: must be one of faithfulness, answer_correctness, context_correctness", req.OptimizationMetric))
	}

	if req.OptimizationMaxRagPatterns != nil {
		value := *req.OptimizationMaxRagPatterns
		if value < constants.MinRagPatterns {
			return NewValidationError(fmt.Sprintf("optimization_max_rag_patterns must be at least %d, got %d", constants.MinRagPatterns, value))
		}
		if value > constants.MaxRagPatterns {
			return NewValidationError(fmt.Sprintf("optimization_max_rag_patterns must be at most %d, got %d", constants.MaxRagPatterns, value))
		}
	}

	if utf8.RuneCountInString(req.DisplayName) > 250 {
		return NewValidationError("display_name must be at most 250 characters")
	}

	return nil
}

func BuildKFPRunRequest(req models.CreateAutoRAGRunRequest, pipelineID, pipelineVersionID string) models.CreatePipelineRunKFRequest {
	params := map[string]any{
		"test_data_secret_name":  req.TestDataSecretName,
		"test_data_bucket_name":  req.TestDataBucketName,
		"test_data_key":          req.TestDataKey,
		"input_data_secret_name": req.InputDataSecretName,
		"input_data_bucket_name": req.InputDataBucketName,
		"input_data_key":         req.InputDataKey,
		"ogx_secret_name":        req.OGXSecretName,
	}

	if len(req.EmbeddingModels) > 0 {
		params["embedding_models"] = req.EmbeddingModels
	}
	if len(req.GenerationModels) > 0 {
		params["generation_models"] = req.GenerationModels
	}

	metric := req.OptimizationMetric
	if metric == "" {
		metric = constants.DefaultOptimizationMetric
	}
	params["optimization_metric"] = metric

	if req.VectorIOProviderID != "" {
		params["vector_io_provider_id"] = req.VectorIOProviderID
	}

	if req.OptimizationMaxRagPatterns != nil {
		params["optimization_max_rag_patterns"] = *req.OptimizationMaxRagPatterns
	}

	return models.CreatePipelineRunKFRequest{
		DisplayName: req.DisplayName,
		Description: req.Description,
		PipelineVersionReference: models.PipelineVersionReference{
			PipelineID:        pipelineID,
			PipelineVersionID: pipelineVersionID,
		},
		RuntimeConfig: models.RuntimeConfig{
			Parameters: params,
		},
	}
}
