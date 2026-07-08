package repositories

import (
	"context"
	"strconv"

	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
)

// MLflowPromptsRepository handles MLflow prompt-related operations and data transformations.
type MLflowPromptsRepository struct {
	// No fields needed - client comes from context
}

// NewMLflowPromptsRepository creates a new MLflow prompts repository.
func NewMLflowPromptsRepository() *MLflowPromptsRepository {
	return &MLflowPromptsRepository{}
}

// maxCountResults is the maximum number of results to fetch for counting.
// MLflow's API maximum is 1000. For registries larger than this, the total
// count will be capped at 1000.
const maxCountResults = 1000

// maxPageSize limits the number of prompts returned per page to control the
// impact of the N+1 query pattern when fetching version tags. See note below
// in the tag-fetching loop for details.
const maxPageSize = 50

// ListPrompts retrieves available MLflow prompts with optional pagination and filtering.
// It also returns a total count of matching prompts by performing a single large fetch
// (up to 1000 results). If the paginated request fits within a single page and has no
// next_page_token, the count is derived directly without an extra query.
//
// IMPORTANT: This function exhibits N+1 query behavior when fetching version tags.
// See the tag-fetching loop below for details and mitigation strategies.
func (r *MLflowPromptsRepository) ListPrompts(ctx context.Context, pageToken string, maxResults string, nameFilter string) (*models.MLflowPromptsResponse, error) {
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
			// Enforce max page size to limit N+1 query impact
			if n > maxPageSize {
				n = maxPageSize
			}
			opts = append(opts, promptregistry.WithMaxResults(n))
		}
	} else {
		// Default to max page size when no limit specified
		opts = append(opts, promptregistry.WithMaxResults(maxPageSize))
	}
	if nameFilter != "" {
		opts = append(opts, promptregistry.WithNameFilter("%"+nameFilter+"%"))
	}

	promptList, err := client.ListPrompts(ctx, opts...)
	if err != nil {
		return nil, err
	}

	prompts := make([]models.MLflowPrompt, len(promptList.Prompts))
	for i, p := range promptList.Prompts {
		// TODO: Resolve N+1 query pattern upstream in mlflow-go SDK
		//
		// PROBLEM: MLflow stores scope tags (scope_type, scope_namespace) on prompt
		// versions, not at the prompt registry level. The mlflow-go SDK's ListPrompts()
		// wrapper only returns empty prompt-level tags because it calls MLflow's
		// ListRegisteredModels API, which has no version tag information.
		//
		// CURRENT WORKAROUND: Fetch each prompt's latest version individually to get
		// the version tags. This creates N+1 queries (1 ListPrompts + N LoadPrompt calls).
		//
		// IMPACT:
		// - 10 prompts = 11 API calls (~550ms at 50ms/call)
		// - 50 prompts = 51 API calls (~2.6s at 50ms/call)
		// Page size is capped at 50 to limit the multiplier effect.
		//
		// UPSTREAM FIX: Modify mlflow-go's registeredModelToPrompt() to optionally
		// fetch and copy latest version tags to the prompt-level Tags field, eliminating
		// the need for per-prompt LoadPrompt calls in consuming code.
		//
		// ALTERNATIVE: Implement parallel fetching with goroutines + semaphore to reduce
		// wall-clock time, though this still results in N API calls and increased load spikes.
		tags := p.Tags
		if p.LatestVersion > 0 {
			latestVersion, err := client.LoadPrompt(ctx, p.Name, promptregistry.WithVersion(p.LatestVersion))
			if err == nil && latestVersion.Tags != nil {
				tags = latestVersion.Tags
			}
		}

		prompts[i] = models.MLflowPrompt{
			Name:              p.Name,
			Description:       p.Description,
			LatestVersion:     p.LatestVersion,
			Tags:              tags,
			CreationTimestamp: p.CreationTimestamp,
			Scope:             determinePromptScope(p.Name, tags),
		}
	}

	totalCount := len(prompts)
	if pageToken != "" || promptList.NextPageToken != "" {
		totalCount, err = r.countPrompts(ctx, nameFilter)
		if err != nil {
			if promptList.NextPageToken != "" {
				totalCount = len(prompts) + 1
				if totalCount > maxCountResults {
					totalCount = maxCountResults
				}
			} else {
				totalCount = len(prompts)
			}
		}
	}

	return &models.MLflowPromptsResponse{
		Prompts:       prompts,
		NextPageToken: promptList.NextPageToken,
		TotalCount:    totalCount,
	}, nil
}

// countPrompts fetches up to maxCountResults prompts with the same filter
// to determine the total count. This avoids N+1 page iteration.
func (r *MLflowPromptsRepository) countPrompts(ctx context.Context, nameFilter string) (int, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return 0, err
	}

	var countOpts []promptregistry.ListPromptsOption
	countOpts = append(countOpts, promptregistry.WithMaxResults(maxCountResults))
	if nameFilter != "" {
		countOpts = append(countOpts, promptregistry.WithNameFilter("%"+nameFilter+"%"))
	}

	countList, err := client.ListPrompts(ctx, countOpts...)
	if err != nil {
		return 0, err
	}
	return len(countList.Prompts), nil
}

// RegisterPrompt creates a new prompt or adds a new version to an existing prompt.
// Dispatches to RegisterChatPrompt or RegisterPrompt based on request content.
func (r *MLflowPromptsRepository) RegisterPrompt(ctx context.Context, req models.MLflowRegisterPromptRequest) (*models.MLflowPromptVersion, error) {
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
func (r *MLflowPromptsRepository) LoadPrompt(ctx context.Context, name string, version *int) (*models.MLflowPromptVersion, error) {
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
func (r *MLflowPromptsRepository) ListPromptVersions(ctx context.Context, name string, pageToken string, maxResults string) (*models.MLflowPromptVersionsResponse, error) {
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
func (r *MLflowPromptsRepository) DeletePrompt(ctx context.Context, name string) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	return client.DeletePrompt(ctx, name)
}

// DeletePromptVersion removes a specific version of a prompt.
func (r *MLflowPromptsRepository) DeletePromptVersion(ctx context.Context, name string, version int) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	return client.DeletePromptVersion(ctx, name, version)
}

// toMLflowPromptVersion converts an SDK PromptVersion to a BFF model.
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
		Scope:         determinePromptScope(pv.Name, pv.Tags),
	}
}

// determinePromptScope derives the scope of a prompt based on tags.
// Prompts with scope_type/scope_namespace tags use those values (if valid).
// Otherwise defaults to global scope with rhoai-templates namespace.
func determinePromptScope(name string, tags map[string]string) *models.MLflowPromptScope {
	// Check for explicit scope tag first
	if scopeType, ok := tags["scope_type"]; ok {
		// Validate scope_type is one of the known enum values
		if scopeType == "project" || scopeType == "global" {
			namespace := tags["scope_namespace"]
			if namespace == "" {
				namespace = "default"
			}
			return &models.MLflowPromptScope{
				Type:      scopeType,
				Namespace: namespace,
			}
		}
		// Invalid scope_type tag - fall through to default
	}

	// Default: global prompts from rhoai-templates namespace
	return &models.MLflowPromptScope{
		Type:      "global",
		Namespace: "rhoai-templates",
	}
}
