package repositories

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	embeddedpipelines "github.com/opendatahub-io/automl-library/bff/internal/pipelines"
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
// automl-specific logic (validation, ownership, state machines, definitions) local.
type PipelinesRepository struct {
	core   *pipelines.Service
	config PipelinesRepositoryConfig
}

type PipelinesRepositoryConfig struct {
	TimeSeriesPipelineName string
	TabularPipelineName    string
	DefaultPipelineVersion string
}

func NewPipelinesRepository(core *pipelines.Service, cfg PipelinesRepositoryConfig) *PipelinesRepository {
	if cfg.DefaultPipelineVersion == "" {
		cfg.DefaultPipelineVersion = constants.DefaultPipelineVersionSuffix
	}
	return &PipelinesRepository{core: core, config: cfg}
}

// --- Pipeline Discovery & Ensure ---

func (r *PipelinesRepository) DiscoverNamedPipelines(ctx context.Context, namespace string) (map[string]*pipelines.DiscoveredPipeline, error) {
	definitions := map[string]string{
		constants.PipelineTypeTimeSeries: r.config.TimeSeriesPipelineName,
		constants.PipelineTypeTabular:    r.config.TabularPipelineName,
	}
	return r.core.DiscoverNamedPipelines(ctx, namespace, r.config.DefaultPipelineVersion, definitions)
}

func (r *PipelinesRepository) EnsurePipeline(ctx context.Context, namespace, pipelineType string) (*pipelines.DiscoveredPipeline, error) {
	def, err := r.pipelineDefinition(pipelineType)
	if err != nil {
		return nil, err
	}
	return r.core.EnsurePipeline(ctx, namespace, def)
}

func (r *PipelinesRepository) pipelineDefinition(pipelineType string) (pipelines.PipelineDefinition, error) {
	var name, pipelineDir string
	switch pipelineType {
	case constants.PipelineTypeTimeSeries:
		name = r.config.TimeSeriesPipelineName
		pipelineDir = constants.PipelineDirTimeSeries
	case constants.PipelineTypeTabular:
		name = r.config.TabularPipelineName
		pipelineDir = constants.PipelineDirTabular
	default:
		return pipelines.PipelineDefinition{}, fmt.Errorf("unsupported pipeline type: %s", pipelineType)
	}

	yamlBytes, err := embeddedpipelines.GetPipelineYAML(pipelineDir)
	if err != nil {
		return pipelines.PipelineDefinition{}, fmt.Errorf("failed to load embedded pipeline YAML %q: %w", pipelineDir, err)
	}

	if override := os.Getenv("RELATED_IMAGE_ODH_AUTOML_IMAGE"); override != "" {
		yamlBytes = embeddedpipelines.ReplaceImageRef(yamlBytes, embeddedpipelines.AutoMLImagePattern, override)
	}

	return pipelines.PipelineDefinition{
		Name:        name,
		Version:     r.config.DefaultPipelineVersion,
		FileContent: yamlBytes,
	}, nil
}

// --- Pipeline Runs: List ---

func (r *PipelinesRepository) GetCombinedRuns(ctx context.Context, namespace string, page int64, pageSize int32) (*models.PipelineRunsData, error) {
	discovered, err := r.DiscoverNamedPipelines(ctx, namespace)
	if err != nil {
		return nil, err
	}

	if len(discovered) == 0 {
		return &models.PipelineRunsData{Runs: []models.PipelineRun{}}, nil
	}

	var allRuns []pipelines.PipelineRun
	for _, dp := range discovered {
		runs, err := r.core.GetAllPipelineRuns(ctx, namespace, dp.PipelineID)
		if err != nil {
			return nil, fmt.Errorf("failed to get pipeline runs: %w", err)
		}
		allRuns = append(allRuns, runs...)
	}

	paged := pipelines.SortAndPaginateRuns(allRuns, page, pageSize)

	taggedRuns := make([]models.PipelineRun, 0, len(paged.Runs))
	for _, run := range paged.Runs {
		pipelineType := r.matchPipelineType(run, discovered)
		taggedRuns = append(taggedRuns, toAutoMLRun(&run, pipelineType))
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

	pipelineType := r.matchPipelineType(*coreRun, discovered)
	if pipelineType == "" {
		return nil, ErrPipelineRunNotFound
	}

	run := toAutoMLRun(coreRun, pipelineType)
	return &run, nil
}

// --- Pipeline Runs: Create ---

func (r *PipelinesRepository) CreateRun(ctx context.Context, namespace string, req models.CreateAutoMLRunRequest) (*models.PipelineRun, error) {
	if req.TaskType == nil || *req.TaskType == "" {
		return nil, NewValidationError("task_type is required")
	}

	pipelineType, err := DeterminePipelineType(*req.TaskType)
	if err != nil {
		return nil, err
	}

	if err := ValidateCreateAutoMLRunRequest(req, pipelineType); err != nil {
		return nil, err
	}

	discovered, err := r.EnsurePipeline(ctx, namespace, pipelineType)
	if err != nil {
		return nil, fmt.Errorf("failed to ensure %s pipeline: %w", pipelineType, err)
	}

	kfpReq := BuildKFPRunRequest(req, discovered.PipelineID, discovered.PipelineVersionID, pipelineType)

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

	run := toAutoMLRun(coreRun, pipelineType)
	return &run, nil
}

// --- Pipeline Runs: Mutations ---
// State validation (terminatable/retryable/deletable) is handled by autox-core.
// Ownership validation (run belongs to a discovered AutoML pipeline) is automl-specific.

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

func (r *PipelinesRepository) matchPipelineType(run pipelines.PipelineRun, discovered map[string]*pipelines.DiscoveredPipeline) string {
	if run.PipelineVersionReference == nil {
		return ""
	}
	for pipelineType, dp := range discovered {
		if run.PipelineVersionReference.PipelineID == dp.PipelineID {
			return pipelineType
		}
	}
	return ""
}

func toAutoMLRun(run *pipelines.PipelineRun, pipelineType string) models.PipelineRun {
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
		PipelineType:   pipelineType,
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

// --- Validation (automl-specific) ---

type fieldCheck struct {
	name     string
	isSet    func(models.CreateAutoMLRunRequest) bool
	required bool
}

var commonFields = []fieldCheck{
	{"display_name", func(r models.CreateAutoMLRunRequest) bool { return r.DisplayName != "" }, true},
	{"train_data_secret_name", func(r models.CreateAutoMLRunRequest) bool { return r.TrainDataSecretName != "" }, true},
	{"train_data_bucket_name", func(r models.CreateAutoMLRunRequest) bool { return r.TrainDataBucketName != "" }, true},
	{"train_data_file_key", func(r models.CreateAutoMLRunRequest) bool { return r.TrainDataFileKey != "" }, true},
	{"top_n", func(r models.CreateAutoMLRunRequest) bool { return r.TopN != nil }, false},
	{"description", func(r models.CreateAutoMLRunRequest) bool { return r.Description != "" }, false},
}

var pipelineSpecificFields = map[string][]fieldCheck{
	constants.PipelineTypeTabular: {
		{"label_column", func(r models.CreateAutoMLRunRequest) bool { return r.LabelColumn != nil && *r.LabelColumn != "" }, true},
		{"task_type", func(r models.CreateAutoMLRunRequest) bool { return r.TaskType != nil && *r.TaskType != "" }, true},
	},
	constants.PipelineTypeTimeSeries: {
		{"task_type", func(r models.CreateAutoMLRunRequest) bool { return r.TaskType != nil && *r.TaskType != "" }, true},
		{"target", func(r models.CreateAutoMLRunRequest) bool { return r.Target != nil && *r.Target != "" }, true},
		{"id_column", func(r models.CreateAutoMLRunRequest) bool { return r.IDColumn != nil && *r.IDColumn != "" }, true},
		{"timestamp_column", func(r models.CreateAutoMLRunRequest) bool {
			return r.TimestampColumn != nil && *r.TimestampColumn != ""
		}, true},
		{"prediction_length", func(r models.CreateAutoMLRunRequest) bool { return r.PredictionLength != nil }, false},
		{"known_covariates_names", func(r models.CreateAutoMLRunRequest) bool { return r.KnownCovariatesNames != nil }, false},
	},
}

func DeterminePipelineType(taskType string) (string, error) {
	switch taskType {
	case constants.TaskTypeBinary, constants.TaskTypeMulticlass, constants.TaskTypeRegression:
		return constants.PipelineTypeTabular, nil
	case constants.PipelineTypeTimeSeries:
		return constants.PipelineTypeTimeSeries, nil
	default:
		return "", NewValidationError(fmt.Sprintf("invalid task_type %q: must be one of binary, multiclass, regression, timeseries", taskType))
	}
}

func ValidateCreateAutoMLRunRequest(req models.CreateAutoMLRunRequest, pipelineType string) error {
	specificFields, exists := pipelineSpecificFields[pipelineType]
	if !exists {
		return fmt.Errorf("unsupported pipeline type: %s", pipelineType)
	}

	schema := make([]fieldCheck, 0, len(commonFields)+len(specificFields))
	schema = append(schema, commonFields...)
	schema = append(schema, specificFields...)

	allowedFields := make(map[string]bool)
	var missing []string
	for _, field := range schema {
		allowedFields[field.name] = true
		if field.required && !field.isSet(req) {
			missing = append(missing, field.name)
		}
	}
	if len(missing) > 0 {
		return NewValidationError(fmt.Sprintf("missing required fields: %s", strings.Join(missing, ", ")))
	}

	var unexpected []string
	for _, fields := range pipelineSpecificFields {
		for _, field := range fields {
			if field.isSet(req) && !allowedFields[field.name] {
				unexpected = append(unexpected, field.name)
			}
		}
	}
	if len(unexpected) > 0 {
		sort.Strings(unexpected)
		return NewValidationError(fmt.Sprintf("unexpected fields for %s pipeline: %s", pipelineType, strings.Join(unexpected, ", ")))
	}

	if req.TaskType != nil {
		switch pipelineType {
		case constants.PipelineTypeTabular:
			if !constants.ValidTaskTypes[*req.TaskType] {
				return NewValidationError(fmt.Sprintf("invalid task_type %q: must be one of binary, multiclass, regression", *req.TaskType))
			}
		case constants.PipelineTypeTimeSeries:
			if *req.TaskType != constants.PipelineTypeTimeSeries {
				return NewValidationError(fmt.Sprintf("invalid task_type %q for timeseries pipeline: must be \"timeseries\"", *req.TaskType))
			}
		}
	}

	if req.TopN != nil {
		if *req.TopN < constants.MinTopN {
			return NewValidationError(fmt.Sprintf("invalid top_n: must be at least %d", constants.MinTopN))
		}
		maxTopN := constants.MaxTopNTabular
		if pipelineType == constants.PipelineTypeTimeSeries {
			maxTopN = constants.MaxTopNTimeSeries
		}
		if *req.TopN > maxTopN {
			return NewValidationError(fmt.Sprintf("invalid top_n: maximum value for %s pipeline is %d", pipelineType, maxTopN))
		}
	}

	if req.PredictionLength != nil && *req.PredictionLength <= 0 {
		return NewValidationError("invalid prediction_length: must be a positive integer")
	}

	if utf8.RuneCountInString(req.DisplayName) > 250 {
		return NewValidationError("display_name must be at most 250 characters")
	}

	return nil
}

func BuildKFPRunRequest(req models.CreateAutoMLRunRequest, pipelineID, pipelineVersionID, pipelineType string) models.CreatePipelineRunKFRequest {
	params := map[string]interface{}{
		"train_data_secret_name": req.TrainDataSecretName,
		"train_data_bucket_name": req.TrainDataBucketName,
		"train_data_file_key":    req.TrainDataFileKey,
	}

	switch pipelineType {
	case constants.PipelineTypeTabular:
		if req.LabelColumn != nil {
			params["label_column"] = *req.LabelColumn
		}
		if req.TaskType != nil {
			params["task_type"] = *req.TaskType
		}
	case constants.PipelineTypeTimeSeries:
		if req.Target != nil {
			params["target"] = *req.Target
		}
		if req.IDColumn != nil {
			params["id_column"] = *req.IDColumn
		}
		if req.TimestampColumn != nil {
			params["timestamp_column"] = *req.TimestampColumn
		}
		predictionLength := 1
		if req.PredictionLength != nil {
			predictionLength = *req.PredictionLength
		}
		params["prediction_length"] = predictionLength
		if req.KnownCovariatesNames != nil {
			params["known_covariates_names"] = *req.KnownCovariatesNames
		}
	}

	topN := constants.DefaultTopN
	if req.TopN != nil {
		topN = *req.TopN
	}
	params["top_n"] = topN

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
