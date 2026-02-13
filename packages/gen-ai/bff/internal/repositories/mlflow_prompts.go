package repositories

import (
	"context"

	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MLflowPromptsRepository handles MLflow prompt-related operations and data transformations.
type MLflowPromptsRepository struct {
	// No fields needed - client comes from context
}

// NewMLflowPromptsRepository creates a new MLflow prompts repository.
func NewMLflowPromptsRepository() *MLflowPromptsRepository {
	return &MLflowPromptsRepository{}
}

// ListPrompts retrieves all available MLflow prompts and transforms them for BFF use.
// The MLflow client is expected to be in the context (set by AttachMLflowClient middleware).
func (r *MLflowPromptsRepository) ListPrompts(ctx context.Context) (*models.MLflowPromptsResponse, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	promptList, err := client.ListPrompts(ctx)
	if err != nil {
		return nil, err
	}

	prompts := make([]models.MLflowPrompt, len(promptList.Prompts))
	for i, p := range promptList.Prompts {
		prompts[i] = models.MLflowPrompt{
			Name:              p.Name,
			Description:       p.Description,
			LatestVersion:     p.LatestVersion,
			Tags:              p.Tags,
			CreationTimestamp:  p.CreationTimestamp,
		}
	}

	return &models.MLflowPromptsResponse{
		Prompts:       prompts,
		NextPageToken: promptList.NextPageToken,
	}, nil
}
