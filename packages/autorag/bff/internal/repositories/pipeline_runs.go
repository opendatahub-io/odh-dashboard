package repositories

import (
	"context"
	"encoding/json"
	"fmt"

	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// PipelineRunsRepository handles business logic for pipeline runs
type PipelineRunsRepository struct{}

// NewPipelineRunsRepository creates a new pipeline runs repository
func NewPipelineRunsRepository() *PipelineRunsRepository {
	return &PipelineRunsRepository{}
}

// GetPipelineRuns retrieves pipeline runs filtered by pipeline ID
func (r *PipelineRunsRepository) GetPipelineRuns(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	pipelineID string,
	pageSize int32,
	pageToken string,
) (*models.PipelineRunsData, error) {

	// Build filter for pipeline ID if provided
	filter := buildPipelineIDFilter(pipelineID)

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
		run := models.PipelineRun{
			RunID:             kfRun.RunID,
			DisplayName:       kfRun.DisplayName,
			Description:       kfRun.Description,
			PipelineVersionID: kfRun.PipelineVersionID,
			State:             kfRun.State,
			CreatedAt:         kfRun.CreatedAt,
			FinishedAt:        kfRun.FinishedAt,
		}
		runs = append(runs, run)
	}

	return &models.PipelineRunsData{
		Runs:          runs,
		TotalSize:     kfResponse.TotalSize,
		NextPageToken: kfResponse.NextPageToken,
	}, nil
}

// buildPipelineIDFilter creates a Kubeflow Pipelines API filter string for pipeline ID
// The filter follows the format: {"predicates": [{"key": "...", "operation": "EQUALS", "string_value": "..."}]}
func buildPipelineIDFilter(pipelineID string) string {
	if pipelineID == "" {
		return ""
	}

	predicates := []map[string]interface{}{
		{
			"key":          "storage_state",
			"operation":    "EQUALS",
			"string_value": "AVAILABLE",
		},
	}

	// Add pipeline ID filter if provided
	// In Kubeflow Pipelines API, we filter by pipeline_spec.pipeline_id or resource_references
	predicates = append(predicates, map[string]interface{}{
		"key":          "pipeline_spec.pipeline_id",
		"operation":    "EQUALS",
		"string_value": pipelineID,
	})

	filter := map[string]interface{}{
		"predicates": predicates,
	}

	filterJSON, err := json.Marshal(filter)
	if err != nil {
		return ""
	}

	return string(filterJSON)
}
