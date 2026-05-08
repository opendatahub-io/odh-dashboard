package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// ErrPipelineRunNotFound is returned when a requested pipeline run does not exist
var ErrPipelineRunNotFound = errors.New("pipeline run not found")

// ValidationError represents a client-side validation error (should result in 400 Bad Request)
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

// NewValidationError creates a new validation error
func NewValidationError(message string) error {
	return &ValidationError{Message: message}
}

// maxRunsPerPipeline caps the total number of runs fetched across all pages for a single pipeline
// to prevent unbounded memory accumulation when paginating through large result sets.
const maxRunsPerPipeline = 10000

// PipelineRunsRepository handles business logic for pipeline runs
type PipelineRunsRepository struct{}

// NewPipelineRunsRepository creates a new pipeline runs repository
func NewPipelineRunsRepository() *PipelineRunsRepository {
	return &PipelineRunsRepository{}
}

// GetPipelineRuns retrieves pipeline runs filtered by pipeline version ID.
// pipelineType is set on each returned run to identify the owning pipeline type (e.g. "timeseries", "tabular").
func (r *PipelineRunsRepository) GetPipelineRuns(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	pipelineVersionID string,
	pageSize int32,
	pageToken string,
	pipelineType string,
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
		runs = append(runs, toPipelineRun(&kfRun, pipelineType))
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

// toPipelineRun transforms a Kubeflow pipeline run to our stable API format.
// pipelineType identifies which discovered pipeline produced this run (e.g. "timeseries", "tabular").
func toPipelineRun(kfRun *models.KFPipelineRun, pipelineType string) models.PipelineRun {
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
		PipelineSpec:             kfRun.PipelineSpec,
		StateHistory:             kfRun.StateHistory,
		Error:                    kfRun.Error,
		RunDetails:               kfRun.RunDetails,
		PipelineType:             pipelineType,
	}
}

// fieldCheck defines a field validation rule
type fieldCheck struct {
	name     string
	isSet    func(models.CreateAutoMLRunRequest) bool
	required bool
}

// commonFields are fields allowed for all pipeline types
var commonFields = []fieldCheck{
	// Common required fields
	{"display_name", func(r models.CreateAutoMLRunRequest) bool { return r.DisplayName != "" }, true},
	{"train_data_secret_name", func(r models.CreateAutoMLRunRequest) bool { return r.TrainDataSecretName != "" }, true},
	{"train_data_bucket_name", func(r models.CreateAutoMLRunRequest) bool { return r.TrainDataBucketName != "" }, true},
	{"train_data_file_key", func(r models.CreateAutoMLRunRequest) bool { return r.TrainDataFileKey != "" }, true},
	// Common optional fields
	{"top_n", func(r models.CreateAutoMLRunRequest) bool { return r.TopN != nil }, false},
	{"description", func(r models.CreateAutoMLRunRequest) bool { return r.Description != "" }, false},
}

// pipelineSpecificFields defines pipeline-type-specific fields (combined with commonFields to form complete schema)
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

// getSchemaForPipelineType returns the complete field schema (common + pipeline-specific) for a given pipeline type
func getSchemaForPipelineType(pipelineType string) ([]fieldCheck, error) {
	specificFields, exists := pipelineSpecificFields[pipelineType]
	if !exists {
		return nil, fmt.Errorf("unsupported pipeline type: %s", pipelineType)
	}

	// Combine common fields with pipeline-specific fields
	schema := make([]fieldCheck, 0, len(commonFields)+len(specificFields))
	schema = append(schema, commonFields...)
	schema = append(schema, specificFields...)
	return schema, nil
}

// getAllPipelineSpecificFields returns all pipeline-specific fields across all pipeline types
func getAllPipelineSpecificFields() []fieldCheck {
	seen := make(map[string]bool)
	var allFields []fieldCheck

	for _, fields := range pipelineSpecificFields {
		for _, field := range fields {
			if !seen[field.name] {
				seen[field.name] = true
				allFields = append(allFields, fieldCheck{
					name:  field.name,
					isSet: field.isSet,
				})
			}
		}
	}

	return allFields
}

// DeterminePipelineType maps a task_type value to its corresponding pipeline type.
// Returns "tabular" for binary/multiclass/regression tasks, and "timeseries" for timeseries tasks.
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

// TerminatePipelineRun terminates an active pipeline run by ID.
// It sends a terminate request to the pipeline server.
func (r *PipelineRunsRepository) TerminatePipelineRun(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	runID string,
) error {
	if client == nil {
		return fmt.Errorf("pipeline server client is nil")
	}

	if err := client.TerminateRun(ctx, runID); err != nil {
		var httpErr *ps.HTTPError
		if errors.As(err, &httpErr) {
			switch httpErr.Status() {
			case http.StatusNotFound:
				return ErrPipelineRunNotFound
			case http.StatusBadRequest:
				return err
			}
		}
		return fmt.Errorf("failed to terminate pipeline run: %w", err)
	}

	return nil
}

// RetryPipelineRun retries a failed or terminated pipeline run by ID.
// It sends a retry request to the pipeline server to re-initiate the run.
func (r *PipelineRunsRepository) RetryPipelineRun(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	runID string,
) error {
	if client == nil {
		return fmt.Errorf("pipeline server client is nil")
	}

	if err := client.RetryRun(ctx, runID); err != nil {
		var httpErr *ps.HTTPError
		if errors.As(err, &httpErr) {
			switch httpErr.Status() {
			case http.StatusNotFound:
				return ErrPipelineRunNotFound
			case http.StatusBadRequest:
				return err
			}
		}
		return fmt.Errorf("failed to retry pipeline run: %w", err)
	}

	return nil
}

// DeletePipelineRun permanently deletes a pipeline run by ID.
func (r *PipelineRunsRepository) DeletePipelineRun(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	runID string,
) error {
	if client == nil {
		return fmt.Errorf("pipeline server client is nil")
	}

	if err := client.DeleteRun(ctx, runID); err != nil {
		var httpErr *ps.HTTPError
		if errors.As(err, &httpErr) {
			switch httpErr.Status() {
			case http.StatusNotFound:
				return ErrPipelineRunNotFound
			case http.StatusBadRequest:
				return err
			}
		}
		return fmt.Errorf("failed to delete pipeline run: %w", err)
	}

	return nil
}

// ValidateCreateAutoMLRunRequest checks that all required fields are present,
// rejects fields not in the pipeline type's schema, and validates enum/range values.
//
// Common required fields (all pipeline types):
//   - display_name, train_data_secret_name, train_data_bucket_name, train_data_file_key
//
// Tabular-specific required fields (pipelineType=tabular):
//   - label_column, task_type (must be binary/multiclass/regression)
//
// Timeseries-specific required fields (pipelineType=timeseries):
//   - task_type (must be "timeseries"), target, id_column, timestamp_column
func ValidateCreateAutoMLRunRequest(req models.CreateAutoMLRunRequest, pipelineType string) error {
	// Get complete schema for this pipeline type
	schema, err := getSchemaForPipelineType(pipelineType)
	if err != nil {
		return err
	}

	// Build allowed fields map and check required fields
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

	// Reject any set pipeline-specific field that's not allowed for this pipeline type
	var unexpected []string
	for _, field := range getAllPipelineSpecificFields() {
		if field.isSet(req) && !allowedFields[field.name] {
			unexpected = append(unexpected, field.name)
		}
	}

	if len(unexpected) > 0 {
		sort.Strings(unexpected)
		return NewValidationError(fmt.Sprintf("unexpected fields for %s pipeline: %s", pipelineType, strings.Join(unexpected, ", ")))
	}

	// Validate enum values and consistency with pipeline type
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

	// Validate optional field ranges
	if req.TopN != nil {
		if *req.TopN < constants.MinTopN {
			return NewValidationError(fmt.Sprintf("invalid top_n: must be at least %d", constants.MinTopN))
		}

		// Enforce max top_n based on pipeline type
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

// BuildKFPRunRequest maps AutoML parameters to a KFP v2beta1 create-run request.
// pipelineID and pipelineVersionID are injected by the caller (from discovery or hardcoded fallback).
// The parameters map is built based on the pipelineType (tabular or timeseries).
// Note: task_type is stripped from timeseries parameters as it's not a supported KFP parameter.
func BuildKFPRunRequest(req models.CreateAutoMLRunRequest, pipelineID, pipelineVersionID, pipelineType string) models.CreatePipelineRunKFRequest {
	// Common parameters for all pipeline types
	params := map[string]interface{}{
		"train_data_secret_name": req.TrainDataSecretName,
		"train_data_bucket_name": req.TrainDataBucketName,
		"train_data_file_key":    req.TrainDataFileKey,
	}

	// Add pipeline-specific parameters
	switch pipelineType {
	case constants.PipelineTypeTabular:
		if req.LabelColumn != nil {
			params["label_column"] = *req.LabelColumn
		}
		if req.TaskType != nil {
			params["task_type"] = *req.TaskType
		}
	case constants.PipelineTypeTimeSeries:
		// Note: task_type is NOT included for timeseries pipelines as it's only used for discrimination
		// and is not a valid KFP parameter for the timeseries pipeline
		if req.Target != nil {
			params["target"] = *req.Target
		}
		if req.IDColumn != nil {
			params["id_column"] = *req.IDColumn
		}
		if req.TimestampColumn != nil {
			params["timestamp_column"] = *req.TimestampColumn
		}
		// Optional timeseries parameters
		predictionLength := 1 // Default per automl backend code and OpenAPI spec
		if req.PredictionLength != nil {
			predictionLength = *req.PredictionLength
		}
		params["prediction_length"] = predictionLength
		if req.KnownCovariatesNames != nil {
			params["known_covariates_names"] = *req.KnownCovariatesNames
		}
	}

	// Add optional common parameter
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

// CreatePipelineRun validates the request, builds the KFP payload, and submits it.
// pipelineID and pipelineVersionID are provided by the caller (from dynamic discovery).
// pipelineType is set on the returned run to identify the pipeline type (e.g. "timeseries", "tabular").
func (r *PipelineRunsRepository) CreatePipelineRun(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	req models.CreateAutoMLRunRequest,
	pipelineID, pipelineVersionID string,
	pipelineType string,
) (*models.PipelineRun, error) {
	if client == nil {
		return nil, fmt.Errorf("pipeline server client is nil")
	}

	if err := ValidateCreateAutoMLRunRequest(req, pipelineType); err != nil {
		return nil, err
	}

	if pipelineID == "" {
		return nil, fmt.Errorf("pipelineID is required")
	}
	if pipelineVersionID == "" {
		return nil, fmt.Errorf("pipelineVersionID is required")
	}

	kfpRequest := BuildKFPRunRequest(req, pipelineID, pipelineVersionID, pipelineType)

	kfRun, err := client.CreateRun(ctx, kfpRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to create pipeline run: %w", err)
	}

	if kfRun == nil {
		return nil, fmt.Errorf("pipeline server returned nil run")
	}

	run := toPipelineRun(kfRun, pipelineType)
	return &run, nil
}

// GetAllPipelineRuns fetches all pages of runs for a single pipeline version ID.
// It auto-paginates through the pipeline server's pages and returns the complete list.
// pipelineType is set on each returned run to identify the owning pipeline type (e.g. "timeseries", "tabular").
// This is used by the multi-pipeline runs handler to merge runs from multiple pipelines.
func (r *PipelineRunsRepository) GetAllPipelineRuns(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	pipelineVersionID string,
	pipelineType string,
) ([]models.PipelineRun, error) {
	if client == nil {
		return nil, fmt.Errorf("pipeline server client is nil")
	}

	var allRuns []models.PipelineRun
	pageToken := ""

	for {
		filter := buildFilter(pipelineVersionID)
		params := &ps.ListRunsParams{
			PageSize:  100, // max page size to minimize round trips
			PageToken: pageToken,
			SortBy:    "created_at desc",
			Filter:    filter,
		}

		kfResponse, err := client.ListRuns(ctx, params)
		if err != nil {
			return nil, fmt.Errorf("error fetching pipeline runs: %w", err)
		}

		if kfResponse == nil || len(kfResponse.Runs) == 0 {
			break
		}

		remaining := maxRunsPerPipeline - len(allRuns)
		for i := range kfResponse.Runs {
			if i >= remaining {
				break
			}
			allRuns = append(allRuns, toPipelineRun(&kfResponse.Runs[i], pipelineType))
		}

		if len(allRuns) >= maxRunsPerPipeline {
			break
		}

		if kfResponse.NextPageToken == "" {
			break
		}
		pageToken = kfResponse.NextPageToken
	}

	return allRuns, nil
}

// GetPipelineRun retrieves a single pipeline run by ID.
// It also fetches the pipeline version to include pipeline_spec for topology visualization.
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

	// Transform Kubeflow format to our stable API format.
	// pipeline_type is not set here; the handler sets it after ownership validation.
	run := toPipelineRun(kfRun, "")

	// Enrich with pipeline_spec from the pipeline version (needed for DAG topology)
	if ref := kfRun.PipelineVersionReference; ref != nil && ref.PipelineID != "" && ref.PipelineVersionID != "" {
		version, vErr := client.GetPipelineVersion(ctx, ref.PipelineID, ref.PipelineVersionID)
		if vErr != nil {
			slog.Warn("failed to fetch pipeline version for spec enrichment",
				"pipelineID", ref.PipelineID,
				"versionID", ref.PipelineVersionID,
				"error", vErr)
		} else if version != nil && len(version.PipelineSpec) > 0 {
			run.PipelineSpec = version.PipelineSpec
		}
	}

	return &run, nil
}
