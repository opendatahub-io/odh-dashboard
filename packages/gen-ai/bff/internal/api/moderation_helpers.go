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

// checkModeration sends content to the NeMo Guardrails API for safety evaluation.
//
// opts identifies the guardrail configuration — either a pre-created config_id (ConfigMap on
// the cluster) or a fully inline config with model, rails, and prompts per-request.
//
// role controls which rails fire: nemo.RoleUser ("user") for input moderation,
// nemo.RoleAssistant ("assistant") for output moderation.
func (app *App) checkModeration(ctx context.Context, input string, opts nemo.GuardrailsOptions, role string) (*ModerationResult, error) {
	app.logger.Debug("Moderation check started", "inline", opts.Config != nil, "role", role, "input_length", len(input))

	nemoClient, err := helper.GetContextNemoClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get NeMo Guardrails client: %w", err)
	}

	response, err := nemoClient.CheckGuardrails(ctx, input, opts, role)
	if err != nil {
		app.logger.Debug("NeMo guardrail check error", "error", err)
		return nil, fmt.Errorf("guardrail check failed: %w", err)
	}

	return interpretNemoResponse(response), nil
}

// buildInlineGuardrailOptions constructs a GuardrailsOptions with a fully inline config,
// allowing per-request model, rails, and prompt customisation without a cluster ConfigMap.
//
// endpointURL is the raw base URL of the guardrail model (e.g. vLLM InferenceService URL,
// external model URL, or MaaS API URL).  The BFF resolves this via GetModelProviderInfo so
// the frontend never needs to send credentials or URLs.
func buildInlineGuardrailOptions(
	endpointURL string,
	modelID string,
	apiKey string,
	inputEnabled bool,
	outputEnabled bool,
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

	if inputEnabled {
		config.Rails.Input = &nemo.InlineGuardrailRailFlows{
			Flows: []string{nemo.FlowSelfCheckInput},
		}
	}
	if outputEnabled {
		config.Rails.Output = &nemo.InlineGuardrailRailFlows{
			Flows: []string{nemo.FlowSelfCheckOutput},
		}
	}

	if inputEnabled && inputPrompt != "" {
		config.Prompts = append(config.Prompts, nemo.InlineGuardrailPrompt{
			Task:    nemo.TaskSelfCheckInput,
			Content: inputPrompt,
		})
	}
	if outputEnabled && outputPrompt != "" {
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
// Will be wired in the follow-up PR once guardrail_config request field is implemented.
//
//nolint:unused
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

// createGuardrailViolationResponse builds a non-streaming guardrail refusal ResponseData.
// Will be wired in the follow-up PR once guardrail_config request field is implemented.
//
//nolint:unused
func createGuardrailViolationResponse(responseID string, model string, isInput bool) ResponseData {
	message := constants.OutputGuardrailViolationMessage
	if isInput {
		message = constants.InputGuardrailViolationMessage
	}

	return ResponseData{
		ID:        responseID,
		Model:     model,
		Status:    "completed",
		CreatedAt: 0,
		Output: []OutputItem{
			{
				ID:     "msg_guardrail",
				Type:   "message",
				Role:   "assistant",
				Status: "completed",
				Content: []ContentItem{
					{
						Type:    "refusal",
						Refusal: message,
					},
				},
			},
		},
	}
}
