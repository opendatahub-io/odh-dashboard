package api

import (
	"context"
	"fmt"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations/nemo"
)

// ModerationResult contains the result of a moderation check
type ModerationResult struct {
	Flagged         bool
	ViolationReason string
}

func (app *App) checkModeration(ctx context.Context, messages []nemo.Message, opts nemo.GuardrailsOptions) (*ModerationResult, error) {
	app.logger.Debug("Moderation check started", "inline", opts.Config != nil, "messageCount", len(messages))

	nemoClient, err := helper.GetContextNemoClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get NeMo Guardrails client: %w", err)
	}

	response, err := nemoClient.CheckGuardrails(ctx, messages, opts)
	if err != nil {
		app.logger.Debug("NeMo guardrail check error", "error", err)
		return nil, fmt.Errorf("guardrail check failed: %w", err)
	}

	return interpretNemoResponse(response), nil
}

// buildInlineGuardrailOptions constructs a GuardrailsOptions with a fully inline config,
// allowing per-request model, rails, and prompt customisation without a cluster ConfigMap.
//
// A rail is enabled when its corresponding prompt is non-empty — no separate boolean needed.
func buildInlineGuardrailOptions(
	endpointURL string,
	modelID string,
	apiKey string,
	inputPrompt string,
	outputPrompt string,
) nemo.GuardrailsOptions {
	config := &nemo.InlineGuardrailConfig{
		Models: []nemo.InlineGuardrailModel{
			{
				Type:   "main",
				Engine: "openai",
				Parameters: map[string]interface{}{
					"openai_api_base": endpointURL,
					"model_name":      modelID,
					"api_key":         apiKey,
				},
			},
		},
	}

	if inputPrompt != "" {
		config.Rails.Input = &nemo.InlineGuardrailRailFlows{
			Flows: []string{nemo.FlowSelfCheckInput},
		}
		config.Prompts = append(config.Prompts, nemo.InlineGuardrailPrompt{
			Task:    nemo.TaskSelfCheckInput,
			Content: inputPrompt,
		})
	}
	if outputPrompt != "" {
		config.Rails.Output = &nemo.InlineGuardrailRailFlows{
			Flows: []string{nemo.FlowSelfCheckOutput},
		}
		config.Prompts = append(config.Prompts, nemo.InlineGuardrailPrompt{
			Task:    nemo.TaskSelfCheckOutput,
			Content: outputPrompt,
		})
	}

	return nemo.GuardrailsOptions{Config: config}
}

// interpretNemoResponse converts a NeMo GuardrailCheckResponse into a ModerationResult.
func interpretNemoResponse(resp *nemo.GuardrailCheckResponse) *ModerationResult {
	if resp == nil {
		return &ModerationResult{Flagged: false}
	}

	switch resp.Status {
	case nemo.StatusBlocked:
		reason := extractBlockedRailName(resp.RailsStatus)
		return &ModerationResult{Flagged: true, ViolationReason: reason}
	case nemo.StatusError:
		return &ModerationResult{Flagged: false}
	default:
		return &ModerationResult{Flagged: false}
	}
}

// extractBlockedRailName finds the first rail that has a "blocked" status.
func extractBlockedRailName(railsStatus map[string]nemo.RailStatus) string {
	for name, rail := range railsStatus {
		if rail.Status == nemo.StatusBlocked {
			return name
		}
	}
	return "guardrail_violation"
}

func ShouldTriggerModeration(accumulatedText string, wordCount int) bool {
	// Primary: Check for sentence boundaries - provides better readability in UI
	if EndsWithSentenceBoundary(accumulatedText) && wordCount >= constants.MinModerationWordCount {
		return true
	}

	// Fallback: Word count threshold for cases without sentence boundaries
	// (e.g., code blocks, lists, non-English text)
	if wordCount >= constants.ModerationChunkSize {
		return true
	}

	return false
}

// EndsWithSentenceBoundary checks if the text ends with a sentence-ending punctuation mark.
// Handles common sentence terminators, newlines, and accounts for trailing whitespace.
func EndsWithSentenceBoundary(text string) bool {
	trimmed := strings.TrimRight(text, " \t")
	if len(trimmed) == 0 {
		return false
	}

	lastChar := trimmed[len(trimmed)-1]
	return lastChar == '.' || lastChar == '!' || lastChar == '?' || lastChar == '\n'
}

// extractResponseText extracts the text content from a response for moderation.
func extractResponseText(response *ResponseData) string {
	var textParts []string
	for _, output := range response.Output {
		if output.Type == "message" {
			for _, content := range output.Content {
				if content.Type == "output_text" && content.Text != "" {
					textParts = append(textParts, content.Text)
				}
			}
		}
	}
	return strings.Join(textParts, " ")
}
