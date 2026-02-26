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

// GetPipelineRuns retrieves pipeline runs filtered by pipeline version ID
func (r *PipelineRunsRepository) GetPipelineRuns(
	client ps.PipelineServerClientInterface,
	ctx context.Context,
	pipelineVersionID string,
	pageSize int32,
	pageToken string,
) (*models.PipelineRunsData, error) {

	// Build filter for pipeline version ID if provided
	filter := buildPipelineVersionFilter(pipelineVersionID)

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

// buildPipelineVersionFilter creates a Kubeflow Pipelines API filter string for pipeline version ID
// The filter follows the format: {"predicates": [{"key": "...", "operation": "EQUALS", "string_value": "..."}]}
func buildPipelineVersionFilter(pipelineVersionID string) string {
	if pipelineVersionID == "" {
		return ""
	}

	predicates := []map[string]interface{}{
		{
			"key":          "storage_state",
			"operation":    "EQUALS",
			"string_value": "AVAILABLE",
		},
		{
			"key":          "pipeline_version_id",
			"operation":    "EQUALS",
			"string_value": pipelineVersionID,
		},
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
