package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// PipelineRunsRepository handles business logic for pipeline runs
type PipelineRunsRepository struct{}

// NewPipelineRunsRepository creates a new pipeline runs repository
func NewPipelineRunsRepository() *PipelineRunsRepository {
	return &PipelineRunsRepository{}
}

// GetPipelineRuns retrieves pipeline runs filtered by annotations
func (r *PipelineRunsRepository) GetPipelineRuns(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	annotations map[string]string,
	pageSize int32,
	pageToken string,
) (*models.PipelineRunsData, error) {

	// Build filter for annotations
	filter := buildAnnotationFilter(annotations)

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

	// Transform Kubeflow format to our stable API format
	runs := make([]models.PipelineRun, 0, len(kfResponse.Runs))
	for _, kfRun := range kfResponse.Runs {
		// Extract annotations from runtime config if present
		annotations := extractAnnotations(kfRun)

		run := models.PipelineRun{
			RunID:             kfRun.RunID,
			DisplayName:       kfRun.DisplayName,
			Description:       kfRun.Description,
			PipelineVersionID: kfRun.PipelineVersionID,
			State:             kfRun.State,
			CreatedAt:         kfRun.CreatedAt,
			FinishedAt:        kfRun.FinishedAt,
			Annotations:       annotations,
		}
		runs = append(runs, run)
	}

	return &models.PipelineRunsData{
		Runs:          runs,
		TotalSize:     kfResponse.TotalSize,
		NextPageToken: kfResponse.NextPageToken,
	}, nil
}

// buildAnnotationFilter creates a Kubeflow Pipelines API filter string for annotations
// The filter follows the format: {"predicates": [{"key": "...", "operation": "EQUALS", "string_value": "..."}]}
func buildAnnotationFilter(annotations map[string]string) string {
	if len(annotations) == 0 {
		return ""
	}

	predicates := make([]map[string]interface{}, 0, len(annotations))
	for key, value := range annotations {
		predicates = append(predicates, map[string]interface{}{
			"key":          fmt.Sprintf("annotations.%s", key),
			"operation":    "EQUALS",
			"string_value": value,
		})
	}

	filter := map[string]interface{}{
		"predicates": predicates,
	}

	filterJSON, err := json.Marshal(filter)
	if err != nil {
		return ""
	}

	return string(filterJSON)
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
		return fmt.Errorf("missing required fields: %v", missing)
	}

	if req.OptimizationMetric != "" && !constants.ValidOptimizationMetrics[req.OptimizationMetric] {
		return fmt.Errorf("invalid optimization_metric %q: must be one of faithfulness, answer_correctness, context_correctness", req.OptimizationMetric)
	}

	return nil
}

// BuildKFPRunRequest maps AutoRAG parameters to a KFP v2beta1 create-run request.
func BuildKFPRunRequest(req models.CreateAutoRAGRunRequest) models.CreatePipelineRunKFRequest {
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

	if req.VectorDatabaseID != "" {
		params["vector_database_id"] = req.VectorDatabaseID
	}

	return models.CreatePipelineRunKFRequest{
		DisplayName: req.DisplayName,
		Description: req.Description,
		PipelineVersionReference: models.PipelineVersionReference{
			PipelineID: constants.AutoRAGPipelineID,
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
	req models.CreateAutoRAGRunRequest,
) (*models.KFPipelineRun, error) {
	if err := ValidateCreateAutoRAGRunRequest(req); err != nil {
		return nil, err
	}

	kfpRequest := BuildKFPRunRequest(req)

	runResponse, err := client.CreateRun(ctx, kfpRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to create pipeline run: %w", err)
	}

	return runResponse, nil
}

// extractAnnotations extracts annotations from a Kubeflow pipeline run
// Annotations are stored in runtime_config.parameters with "annotation_" prefix
func extractAnnotations(kfRun models.KFPipelineRun) map[string]string {
	annotations := make(map[string]string)

	// Check if runtime config has annotation-like parameters
	if kfRun.RuntimeConfig != nil && kfRun.RuntimeConfig.Parameters != nil {
		for key, value := range kfRun.RuntimeConfig.Parameters {
			// Look for annotation-prefixed parameters
			if strings.HasPrefix(key, "annotation_") {
				annotationKey := strings.TrimPrefix(key, "annotation_")
				if strValue, ok := value.(string); ok {
					annotations[annotationKey] = strValue
				}
			}
		}
	}

	return annotations
}
