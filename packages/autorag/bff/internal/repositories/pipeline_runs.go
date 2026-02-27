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

// GetPipelineRuns retrieves pipeline runs filtered by pipeline version ID or run ID
func (r *PipelineRunsRepository) GetPipelineRuns(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	pipelineVersionID string,
	runID string,
	pageSize int32,
	pageToken string,
) (*models.PipelineRunsData, error) {

	// Build filter for pipeline version ID and/or run ID if provided
	filter := buildFilter(pipelineVersionID, runID)

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
		run := models.PipelineRun{
			RunID:                    kfRun.RunID,
			DisplayName:              kfRun.DisplayName,
			Description:              kfRun.Description,
			ExperimentID:             kfRun.ExperimentID,
			PipelineVersionReference: kfRun.PipelineVersionReference,
			State:                    kfRun.State,
			StorageState:             kfRun.StorageState,
			ServiceAccount:           kfRun.ServiceAccount,
			CreatedAt:                kfRun.CreatedAt,
			ScheduledAt:              kfRun.ScheduledAt,
			FinishedAt:               kfRun.FinishedAt,
			StateHistory:             kfRun.StateHistory,
		}
		runs = append(runs, run)
	}

	return &models.PipelineRunsData{
		Runs:          runs,
		TotalSize:     kfResponse.TotalSize,
		NextPageToken: kfResponse.NextPageToken,
	}, nil
}

// buildFilter creates a Kubeflow Pipelines API filter string for pipeline version ID and/or run ID
// The filter follows the format: {"predicates": [{"key": "...", "operation": "EQUALS", "string_value": "..."}]}
func buildFilter(pipelineVersionID string, runID string) string {
	if pipelineVersionID == "" && runID == "" {
		return ""
	}

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

	// Add run ID filter if provided
	if runID != "" {
		predicates = append(predicates, map[string]interface{}{
			"key":          "run_id",
			"operation":    "EQUALS",
			"string_value": runID,
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
