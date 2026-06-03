package repositories

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	helper "github.com/opendatahub-io/mlflow/bff/internal/helpers"
	mlflow "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
)

// PromptsRepository handles MLflow prompt-related operations and data transformations.
type PromptsRepository struct{}

// NewPromptsRepository creates a new prompts repository.
func NewPromptsRepository() *PromptsRepository {
	return &PromptsRepository{}
}

// ListPrompts retrieves available prompts using the client from the request context.
func (r *PromptsRepository) ListPrompts(ctx context.Context, pageToken string, maxResults string, nameFilter string) (*models.PromptsResponse, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}
	return r.ListPromptsWithClient(ctx, client, pageToken, maxResults, nameFilter)
}

// ListPromptsWithClient retrieves prompts using an explicit client, allowing
// the caller to target a specific namespace (e.g., global namespaces).
func (r *PromptsRepository) ListPromptsWithClient(ctx context.Context, client mlflow.ClientInterface, pageToken string, maxResults string, nameFilter string) (*models.PromptsResponse, error) {
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
		// Append SQL LIKE wildcard for prefix matching: "pet" becomes "pet%".
		// The MLflow server uses LIKE semantics for this filter.
		opts = append(opts, promptregistry.WithNameFilter(nameFilter+"%"))
	}

	promptList, err := client.ListPrompts(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("listing prompts: %w", err)
	}

	prompts := make([]models.Prompt, len(promptList.Prompts))
	for i, p := range promptList.Prompts {
		prompts[i] = models.Prompt{
			Name:              p.Name,
			Description:       p.Description,
			LatestVersion:     p.LatestVersion,
			Tags:              p.Tags,
			CreationTimestamp: p.CreationTimestamp,
		}
	}

	return &models.PromptsResponse{
		Prompts: prompts,
	}, nil
}

// RegisterPrompt creates a new prompt or adds a new version to an existing prompt.
func (r *PromptsRepository) RegisterPrompt(ctx context.Context, req models.RegisterPromptRequest) (*models.PromptVersion, error) {
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
			if strings.TrimSpace(m.Role) == "" || strings.TrimSpace(m.Content) == "" {
				return nil, fmt.Errorf("message %d requires non-empty role and content", i)
			}
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
		return nil, fmt.Errorf("registering prompt %q: %w", req.Name, err)
	}

	return toPromptVersion(pv), nil
}

// LoadPrompt retrieves a specific prompt, optionally at a given version.
func (r *PromptsRepository) LoadPrompt(ctx context.Context, name string, version *int) (*models.PromptVersion, error) {
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
		return nil, fmt.Errorf("loading prompt %q: %w", name, err)
	}

	return toPromptVersion(pv), nil
}

// ListPromptVersions retrieves all versions of a prompt with optional pagination.
func (r *PromptsRepository) ListPromptVersions(ctx context.Context, name string, pageToken string, maxResults string) (*models.PromptVersionsResponse, error) {
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
		return nil, fmt.Errorf("listing versions for prompt %q: %w", name, err)
	}

	versions := make([]models.PromptVersionMeta, len(versionList.Versions))
	for i, v := range versionList.Versions {
		versions[i] = models.PromptVersionMeta{
			Version:       v.Version,
			CommitMessage: v.CommitMessage,
			Aliases:       v.Aliases,
			Tags:          v.Tags,
			CreatedAt:     v.CreatedAt,
			UpdatedAt:     v.UpdatedAt,
		}
	}

	return &models.PromptVersionsResponse{
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
	if err := client.DeletePrompt(ctx, name); err != nil {
		return fmt.Errorf("deleting prompt %q: %w", name, err)
	}
	return nil
}

// DeletePromptVersion removes a specific version of a prompt.
func (r *PromptsRepository) DeletePromptVersion(ctx context.Context, name string, version int) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	if err := client.DeletePromptVersion(ctx, name, version); err != nil {
		return fmt.Errorf("deleting prompt %q version %d: %w", name, version, err)
	}
	return nil
}

func toPromptVersion(pv *promptregistry.PromptVersion) *models.PromptVersion {
	if pv == nil {
		return nil
	}
	var messages []models.Message
	if pv.Messages != nil {
		messages = make([]models.Message, len(pv.Messages))
		for i, m := range pv.Messages {
			messages[i] = models.Message{
				Role:    m.Role,
				Content: m.Content,
			}
		}
	}

	return &models.PromptVersion{
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
