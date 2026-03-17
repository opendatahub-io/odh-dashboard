package repositories

import (
	"context"
	"fmt"
	"maps"

	"github.com/opendatahub-io/mlflow-go/mlflow/tracking"
	helper "github.com/opendatahub-io/mlflow/bff/internal/helpers"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
)

// ExperimentsRepository handles MLflow experiment-related operations and data transformations.
type ExperimentsRepository struct{}

// NewExperimentsRepository creates a new experiments repository.
func NewExperimentsRepository() *ExperimentsRepository {
	return &ExperimentsRepository{}
}

// ListExperiments retrieves experiments from the MLflow tracking server with optional pagination and filtering.
// The MLflow client is expected to be in the context (set by AttachMLflowClient middleware).
func (r *ExperimentsRepository) ListExperiments(ctx context.Context, pageToken string, maxResults int, filter string) (*models.ExperimentsResponse, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []tracking.SearchExperimentsOption
	if pageToken != "" {
		opts = append(opts, tracking.WithExperimentsPageToken(pageToken))
	}
	if maxResults > 0 {
		opts = append(opts, tracking.WithExperimentsMaxResults(maxResults))
	}
	if filter != "" {
		opts = append(opts, tracking.WithExperimentsFilter(filter))
	}

	result, err := client.SearchExperiments(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("searching experiments: %w", err)
	}

	experiments := make([]models.Experiment, 0, len(result.Experiments))
	for _, exp := range result.Experiments {
		experiments = append(experiments, models.Experiment{
			ID:               exp.ID,
			Name:             exp.Name,
			ArtifactLocation: exp.ArtifactLocation,
			LifecycleStage:   exp.LifecycleStage,
			Tags:             maps.Clone(exp.Tags),
			CreationTime:     exp.CreationTime,
			LastUpdateTime:   exp.LastUpdateTime,
		})
	}

	return &models.ExperimentsResponse{
		Experiments:   experiments,
		NextPageToken: result.NextPageToken,
	}, nil
}
