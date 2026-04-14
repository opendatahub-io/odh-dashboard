package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
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

// PipelineRunsRepository handles business logic for pipeline runs
type PipelineRunsRepository struct{}

// NewPipelineRunsRepository creates a new pipeline runs repository
func NewPipelineRunsRepository() *PipelineRunsRepository {
	return &PipelineRunsRepository{}
}

// GetPipelineRuns retrieves pipeline runs filtered by pipeline version ID.
// pipelineType is set on each returned run to identify the owning pipeline (e.g. "autorag").
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
// pipelineType identifies the owning pipeline (e.g. "autorag").
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

// ValidateCreateAutoRAGRunRequest checks that all required fields are present
// and that optional enum fields have valid values.
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
	if req.LlamaStackSecretName == "" {
		missing = append(missing, "llama_stack_secret_name")
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

// BuildKFPRunRequest maps AutoRAG parameters to a KFP v2beta1 create-run request.
//
// This function transforms the BFF's AutoRAG-specific request format into the Kubeflow Pipelines
// v2beta1 runtime config format. It injects the provided pipeline and version IDs, which are
// typically obtained from automatic pipeline discovery.
//
// Parameters:
//   - req: AutoRAG-specific run parameters (secrets, data locations, models, etc.)
//   - pipelineID: ID of the discovered AutoRAG pipeline
//   - pipelineVersionID: Version ID of the discovered AutoRAG pipeline
//
// Returns:
//   - models.CreatePipelineRunKFRequest: KFP v2beta1 formatted request ready for submission
func BuildKFPRunRequest(req models.CreateAutoRAGRunRequest, pipelineID, pipelineVersionID string) models.CreatePipelineRunKFRequest {
	params := map[string]interface{}{
		"test_data_secret_name":   req.TestDataSecretName,
		"test_data_bucket_name":   req.TestDataBucketName,
		"test_data_key":           req.TestDataKey,
		"input_data_secret_name":  req.InputDataSecretName,
		"input_data_bucket_name":  req.InputDataBucketName,
		"input_data_key":          req.InputDataKey,
		"llama_stack_secret_name": req.LlamaStackSecretName,
	}

	if len(req.EmbeddingsModels) > 0 {
		params["embeddings_models"] = req.EmbeddingsModels
	}
	if len(req.GenerationModels) > 0 {
		params["generation_models"] = req.GenerationModels
	}

	metric := req.OptimizationMetric
	if metric == "" {
		metric = constants.DefaultOptimizationMetric
	}
	params["optimization_metric"] = metric

	if req.LlamaStackVectorIOProviderID != "" {
		params["llama_stack_vector_io_provider_id"] = req.LlamaStackVectorIOProviderID
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

// CreatePipelineRun validates the request, builds the KFP payload, and submits it.
//
// This method orchestrates the creation of a new AutoRAG pipeline run by:
//  1. Validating all required fields in the request
//  2. Building a KFP v2beta1 runtime config with the provided pipeline IDs
//  3. Submitting the run to the Pipeline Server
//  4. Transforming the response to the stable API format
//
// Parameters:
//   - client: Pipeline Server client interface
//   - ctx: Request context
//   - req: AutoRAG-specific run parameters
//   - pipelineID: ID of the AutoRAG pipeline (from discovery)
//   - pipelineVersionID: Version ID of the AutoRAG pipeline (from discovery)
//   - pipelineType: Pipeline type to set on the returned run (e.g. "autorag")
//
// Returns:
//   - *models.PipelineRun: The created run in stable API format
//   - error: If validation fails or the Pipeline Server returns an error
func (r *PipelineRunsRepository) CreatePipelineRun(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	req models.CreateAutoRAGRunRequest,
	pipelineID, pipelineVersionID string,
	pipelineType string,
) (*models.PipelineRun, error) {
	if client == nil {
		return nil, fmt.Errorf("pipeline server client is nil")
	}

	if err := ValidateCreateAutoRAGRunRequest(req); err != nil {
		return nil, err
	}

	kfpRequest := BuildKFPRunRequest(req, pipelineID, pipelineVersionID)

	kfRun, err := client.CreateRun(ctx, kfpRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to create pipeline run: %w", err)
	}

	run := toPipelineRun(kfRun, pipelineType)
	return &run, nil
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
