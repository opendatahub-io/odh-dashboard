package repositories

import (
	"context"
	"strconv"

	helper "github.com/opendatahub-io/mlflow/bff/internal/helpers"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
)

// PromptsRepository handles MLflow prompt-related operations and data transformations.
type PromptsRepository struct{}

// NewPromptsRepository creates a new prompts repository.
func NewPromptsRepository() *PromptsRepository {
	return &PromptsRepository{}
}

// ListPrompts retrieves available prompts with optional pagination and filtering.
func (r *PromptsRepository) ListPrompts(ctx context.Context, pageToken string, maxResults string, nameFilter string) (*models.MLflowPromptsResponse, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []promptregistry.ListPromptsOption
	if pageToken != "" {
		opts = append(opts, promptregistry.WithPageToken(pageToken))
	}
	if maxResults != "" {
		n, err := strconv.Atoi(maxResults)
		if err == nil && n > 0 {
			opts = append(opts, promptregistry.WithMaxResults(n))
		}
	}
	if nameFilter != "" {
		opts = append(opts, promptregistry.WithNameFilter(nameFilter+"%"))
	}

	promptList, err := client.ListPrompts(ctx, opts...)
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
			CreationTimestamp: p.CreationTimestamp,
		}
	}

	return &models.MLflowPromptsResponse{
		Prompts:       prompts,
		NextPageToken: promptList.NextPageToken,
	}, nil
}

// RegisterPrompt creates a new prompt or adds a new version to an existing prompt.
func (r *PromptsRepository) RegisterPrompt(ctx context.Context, req models.MLflowRegisterPromptRequest) (*models.MLflowPromptVersion, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []promptregistry.RegisterOption
	if req.CommitMessage != "" {
		opts = append(opts, promptregistry.WithCommitMessage(req.CommitMessage))
	}
	if len(req.Tags) > 0 {
		opts = append(opts, promptregistry.WithTags(req.Tags))
	}

	var pv *promptregistry.PromptVersion
	if len(req.Messages) > 0 {
		messages := make([]promptregistry.ChatMessage, len(req.Messages))
		for i, m := range req.Messages {
			messages[i] = promptregistry.ChatMessage{
				Role:    m.Role,
				Content: m.Content,
			}
		}
		pv, err = client.RegisterChatPrompt(ctx, req.Name, messages, opts...)
	} else {
		pv, err = client.RegisterPrompt(ctx, req.Name, req.Template, opts...)
	}
	if err != nil {
		return nil, err
	}

	return toMLflowPromptVersion(pv), nil
}

// LoadPrompt retrieves a specific prompt, optionally at a given version.
func (r *PromptsRepository) LoadPrompt(ctx context.Context, name string, version *int) (*models.MLflowPromptVersion, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []promptregistry.LoadOption
	if version != nil {
		opts = append(opts, promptregistry.WithVersion(*version))
	}

	pv, err := client.LoadPrompt(ctx, name, opts...)
	if err != nil {
		return nil, err
	}

	return toMLflowPromptVersion(pv), nil
}

// ListPromptVersions retrieves all versions of a prompt with optional pagination.
func (r *PromptsRepository) ListPromptVersions(ctx context.Context, name string, pageToken string, maxResults string) (*models.MLflowPromptVersionsResponse, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []promptregistry.ListVersionsOption
	if pageToken != "" {
		opts = append(opts, promptregistry.WithVersionsPageToken(pageToken))
	}
	if maxResults != "" {
		n, err := strconv.Atoi(maxResults)
		if err == nil && n > 0 {
			opts = append(opts, promptregistry.WithVersionsMaxResults(n))
		}
	}

	versionList, err := client.ListPromptVersions(ctx, name, opts...)
	if err != nil {
		return nil, err
	}

	versions := make([]models.MLflowPromptVersionMeta, len(versionList.Versions))
	for i, v := range versionList.Versions {
		versions[i] = models.MLflowPromptVersionMeta{
			Version:       v.Version,
			CommitMessage: v.CommitMessage,
			Aliases:       v.Aliases,
			Tags:          v.Tags,
			CreatedAt:     v.CreatedAt,
			UpdatedAt:     v.UpdatedAt,
		}
	}

	return &models.MLflowPromptVersionsResponse{
		Versions:      versions,
		NextPageToken: versionList.NextPageToken,
	}, nil
}

// DeletePrompt removes an entire prompt and all its versions.
func (r *PromptsRepository) DeletePrompt(ctx context.Context, name string) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	return client.DeletePrompt(ctx, name)
}

// DeletePromptVersion removes a specific version of a prompt.
func (r *PromptsRepository) DeletePromptVersion(ctx context.Context, name string, version int) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	return client.DeletePromptVersion(ctx, name, version)
}

func toMLflowPromptVersion(pv *promptregistry.PromptVersion) *models.MLflowPromptVersion {
	var messages []models.MLflowMessage
	if pv.Messages != nil {
		messages = make([]models.MLflowMessage, len(pv.Messages))
		for i, m := range pv.Messages {
			messages[i] = models.MLflowMessage{
				Role:    m.Role,
				Content: m.Content,
			}
		}
	}

	return &models.MLflowPromptVersion{
		Name:          pv.Name,
		Version:       pv.Version,
		Template:      pv.Template,
		Messages:      messages,
		CommitMessage: pv.CommitMessage,
		Aliases:       pv.Aliases,
		Tags:          pv.Tags,
		CreatedAt:     pv.CreatedAt,
		UpdatedAt:     pv.UpdatedAt,
	}
}
