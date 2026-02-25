package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

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
