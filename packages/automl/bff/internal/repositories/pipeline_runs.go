package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// ErrPipelineRunNotFound is returned when a requested pipeline run does not exist
var ErrPipelineRunNotFound = errors.New("pipeline run not found")

// PipelineRunsRepository handles business logic for pipeline runs
type PipelineRunsRepository struct{}

// NewPipelineRunsRepository creates a new pipeline runs repository
func NewPipelineRunsRepository() *PipelineRunsRepository {
	return &PipelineRunsRepository{}
}

// GetPipelineRuns retrieves pipeline runs filtered by pipeline version ID
func (r *PipelineRunsRepository) GetPipelineRuns(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	pipelineVersionID string,
	pageSize int32,
	pageToken string,
) (*models.PipelineRunsData, error) {
	// Guard against nil client to prevent panic
	if client == nil {
		return nil, fmt.Errorf("pipeline server client is nil")
	}

	// Build filter (always includes storage_state: AVAILABLE to exclude archived runs)
	filter := buildFilter(pipelineVersionID)

	params := &ps.ListRunsParams{
		PageSize:  pageSize,
		PageToken: pageToken,
		SortBy:    "created_at desc",
		Filter:    filter,
	}

	// Query pipeline server
	kfResponse, err := client.ListRuns(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("error fetching pipeline runs: %w", err)
	}

	if kfResponse == nil {
		return &models.PipelineRunsData{
			Runs:          []models.PipelineRun{},
			TotalSize:     0,
			NextPageToken: "",
		}, nil
	}

	// Transform Kubeflow format to our stable API format
	runs := make([]models.PipelineRun, 0, len(kfResponse.Runs))
	for _, kfRun := range kfResponse.Runs {
		runs = append(runs, toPipelineRun(&kfRun))
	}

	return &models.PipelineRunsData{
		Runs:          runs,
		TotalSize:     kfResponse.TotalSize,
		NextPageToken: kfResponse.NextPageToken,
	}, nil
}

// buildFilter creates a Kubeflow Pipelines API filter string for pipeline version ID
// The filter follows the format: {"predicates": [{"key": "...", "operation": "EQUALS", "string_value": "..."}]}
// Always filters for storage_state: AVAILABLE to exclude archived runs
func buildFilter(pipelineVersionID string) string {
	// Always include storage_state filter to exclude archived runs
	predicates := []map[string]interface{}{
		{
			"key":          "storage_state",
			"operation":    "EQUALS",
			"string_value": "AVAILABLE",
		},
	}

	// Add pipeline version ID filter if provided
	if pipelineVersionID != "" {
		predicates = append(predicates, map[string]interface{}{
			"key":          "pipeline_version_id",
			"operation":    "EQUALS",
			"string_value": pipelineVersionID,
		})
	}

	filter := map[string]interface{}{
		"predicates": predicates,
	}

	filterJSON, err := json.Marshal(filter)
	if err != nil {
		// Log the marshal error with context
		slog.Error("Failed to marshal filter in buildFilter",
			"error", err,
			"pipelineVersionID", pipelineVersionID)

		// Return a minimal safe JSON filter that excludes archived runs
		// This ensures archived runs are never returned even if marshaling fails
		return `{"predicates":[{"key":"storage_state","operation":"EQUALS","string_value":"AVAILABLE"}]}`
	}

	return string(filterJSON)
}

// toPipelineRun transforms a Kubeflow pipeline run to our stable API format
func toPipelineRun(kfRun *models.KFPipelineRun) models.PipelineRun {
	return models.PipelineRun{
		RunID:                    kfRun.RunID,
		DisplayName:              kfRun.DisplayName,
		Description:              kfRun.Description,
		ExperimentID:             kfRun.ExperimentID,
		PipelineVersionReference: kfRun.PipelineVersionReference,
		RuntimeConfig:            kfRun.RuntimeConfig,
		State:                    kfRun.State,
		StorageState:             kfRun.StorageState,
		ServiceAccount:           kfRun.ServiceAccount,
		CreatedAt:                kfRun.CreatedAt,
		ScheduledAt:              kfRun.ScheduledAt,
		FinishedAt:               kfRun.FinishedAt,
		StateHistory:             kfRun.StateHistory,
		Error:                    kfRun.Error,
		RunDetails:               kfRun.RunDetails,
	}
}

// ValidateCreateAutoMLRunRequest checks that all required fields are present
// and that optional enum fields have valid values.
func ValidateCreateAutoMLRunRequest(req models.CreateAutoMLRunRequest) error {
	var missing []string
	if req.DisplayName == "" {
		missing = append(missing, "display_name")
	}
	if req.TrainDataSecretName == "" {
		missing = append(missing, "train_data_secret_name")
	}
	if req.TrainDataBucketName == "" {
		missing = append(missing, "train_data_bucket_name")
	}
	if req.TrainDataFileKey == "" {
		missing = append(missing, "train_data_file_key")
	}
	if req.LabelColumn == "" {
		missing = append(missing, "label_column")
	}
	if req.TaskType == "" {
		missing = append(missing, "task_type")
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing required fields: %v", missing)
	}

	if !constants.ValidTaskTypes[req.TaskType] {
		return fmt.Errorf("invalid task_type %q: must be one of binary, multiclass, regression", req.TaskType)
	}

	if req.TopN != nil && *req.TopN <= 0 {
		return fmt.Errorf("invalid top_n: must be a positive integer")
	}

	return nil
}

// BuildKFPRunRequest maps AutoML parameters to a KFP v2beta1 create-run request.
func BuildKFPRunRequest(req models.CreateAutoMLRunRequest) models.CreatePipelineRunKFRequest {
	params := map[string]interface{}{
		"train_data_secret_name": req.TrainDataSecretName,
		"train_data_bucket_name": req.TrainDataBucketName,
		"train_data_file_key":    req.TrainDataFileKey,
		"label_column":           req.LabelColumn,
		"task_type":              req.TaskType,
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
			PipelineID:        constants.AutoMLPipelineID,
			PipelineVersionID: constants.AutoMLPipelineVersionID,
		},
		RuntimeConfig: models.RuntimeConfig{
			Parameters: params,
		},
	}
}

// CreatePipelineRun validates the request, builds the KFP payload, and submits it.
func (r *PipelineRunsRepository) CreatePipelineRun(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	req models.CreateAutoMLRunRequest,
) (*models.PipelineRun, error) {
	if client == nil {
		return nil, fmt.Errorf("pipeline server client is nil")
	}

	if err := ValidateCreateAutoMLRunRequest(req); err != nil {
		return nil, err
	}

	kfpRequest := BuildKFPRunRequest(req)

	kfRun, err := client.CreateRun(ctx, kfpRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to create pipeline run: %w", err)
	}

	if kfRun == nil {
		return nil, fmt.Errorf("pipeline server returned nil run")
	}

	run := toPipelineRun(kfRun)
	return &run, nil
}

// GetPipelineRun retrieves a single pipeline run by ID
func (r *PipelineRunsRepository) GetPipelineRun(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	runID string,
) (*models.PipelineRun, error) {
	// Guard against nil client to prevent panic
	if client == nil {
		return nil, fmt.Errorf("pipeline server client is nil")
	}

	// Query pipeline server for single run
	kfRun, err := client.GetRun(ctx, runID)
	if err != nil {
		// Check if this is a 404 error from the pipeline server using structured error type
		var httpErr *ps.HTTPError
		if errors.As(err, &httpErr) && httpErr.Status() == http.StatusNotFound {
			return nil, ErrPipelineRunNotFound
		}
		return nil, fmt.Errorf("error fetching pipeline run: %w", err)
	}

	if kfRun == nil {
		return nil, ErrPipelineRunNotFound
	}

	// Transform Kubeflow format to our stable API format
	run := toPipelineRun(kfRun)
	return &run, nil
}
