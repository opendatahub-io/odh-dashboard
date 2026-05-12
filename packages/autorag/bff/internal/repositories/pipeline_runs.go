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

// maxVersionIDs caps the number of version IDs used in KFP filter predicates.
// ListPipelineVersions returns versions sorted by created_at desc, so keeping
// only the first N entries retains the most recent versions.
const maxVersionIDs = 100

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
	pipelineID string,
	pageSize int32,
	pageToken string,
	pipelineType string,
) (*models.PipelineRunsData, error) {
	// Guard against nil client to prevent panic
	if client == nil {
		return nil, fmt.Errorf("pipeline server client is nil")
	}

	// Collect all version IDs for this pipeline so runs from every version are returned.
	versionIDs, err := collectVersionIDs(client, ctx, pipelineID)
	if err != nil {
		return nil, fmt.Errorf("error collecting pipeline version IDs: %w", err)
	}

	// A pipeline with no versions cannot have runs; return empty rather than
	// issuing an unscoped ListRuns that would return runs from all pipelines.
	if len(versionIDs) == 0 {
		return &models.PipelineRunsData{
			Runs:          []models.PipelineRun{},
			TotalSize:     0,
			NextPageToken: "",
		}, nil
	}

	// Build filter (always includes storage_state: AVAILABLE to exclude archived runs)
	filter, err := buildFilter(versionIDs)
	if err != nil {
		return nil, fmt.Errorf("error building filter: %w", err)
	}

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

// collectVersionIDs returns all pipeline version IDs for the given pipeline.
// It first checks the pipeline cache for pre-fetched version IDs before calling the API.
func collectVersionIDs(client ps.PipelineServerClientInterface, ctx context.Context, pipelineID string) ([]string, error) {
	if pipelineID == "" {
		return nil, nil
	}

	if ids := getCachedVersionIDs(pipelineID); ids != nil {
		return ids, nil
	}

	versionsResp, err := client.ListPipelineVersions(ctx, pipelineID)
	if err != nil {
		return nil, fmt.Errorf("failed to list pipeline versions: %w", err)
	}
	if versionsResp == nil || len(versionsResp.PipelineVersions) == 0 {
		return nil, nil
	}
	versions := versionsResp.PipelineVersions
	if len(versions) > maxVersionIDs {
		versions = versions[:maxVersionIDs]
	}
	ids := make([]string, 0, len(versions))
	for _, v := range versions {
		if strings.TrimSpace(v.PipelineVersionID) != "" {
			ids = append(ids, v.PipelineVersionID)
		}
	}
	if len(ids) == 0 {
		return nil, nil
	}
	return ids, nil
}

// buildFilter creates a Kubeflow Pipelines API filter string.
// Always filters for storage_state: AVAILABLE to exclude archived runs.
// When versionIDs are provided, adds an IN predicate to scope runs to those versions.
func buildFilter(versionIDs []string) (string, error) {
	// Always include storage_state filter to exclude archived runs
	predicates := []map[string]interface{}{
		{
			"key":          "storage_state",
			"operation":    "EQUALS",
			"string_value": "AVAILABLE",
		},
	}

	// Scope to the given pipeline versions
	if len(versionIDs) > 0 {
		predicates = append(predicates, map[string]interface{}{
			"key":       "pipeline_version_id",
			"operation": "IN",
			"string_values": map[string]interface{}{
				"values": versionIDs,
			},
		})
	}

	filter := map[string]interface{}{
		"predicates": predicates,
	}

	filterJSON, err := json.Marshal(filter)
	if err != nil {
		return "", fmt.Errorf("failed to marshal filter: %w", err)
	}

	return string(filterJSON), nil
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
