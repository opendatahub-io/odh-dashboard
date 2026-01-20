package api

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
)

// ModerationResult contains the result of a moderation check
type ModerationResult struct {
	Flagged         bool
	ViolationReason string
}

func (app *App) checkModeration(ctx context.Context, input string, shieldID string) (*ModerationResult, error) {
	app.logger.Debug("Moderation check started", "shield_id", shieldID, "input_length", len(input))

	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get LlamaStack client: %w", err)
	}

	response, err := client.CreateModeration(ctx, input, shieldID)
	if err != nil {
		app.logger.Debug("Moderation API call error", "error", err)
		return nil, fmt.Errorf("moderation API call failed: %w", err)
	}

	// No results means content is not flagged
	if len(response.Results) == 0 {
		app.logger.Debug("Moderation returned no results", "shield_id", shieldID)
		return &ModerationResult{Flagged: false}, nil
	}

	modResult := response.Results[0]
	app.logger.Debug("Moderation result", "flagged", modResult.Flagged, "raw_json", modResult.RawJSON())
	return &ModerationResult{
		Flagged:         modResult.Flagged,
		ViolationReason: extractDetectionType(modResult.RawJSON()),
	}, nil
}

// extractDetectionType extracts the detection_type from TrustyAI's moderation response
func extractDetectionType(rawJSON string) string {
	if rawJSON == "" {
		return ""
	}

	var result struct {
		Metadata struct {
			DetectionType string `json:"detection_type"`
		} `json:"metadata"`
	}

	if err := json.Unmarshal([]byte(rawJSON), &result); err != nil {
		return ""
	}

	return result.Metadata.DetectionType
}

// ShouldTriggerModeration determines if moderation should be triggered based on
// sentence boundaries (primary) or word count fallback (secondary).
// This provides better UX by sending readable chunks that end at natural sentence boundaries.
func ShouldTriggerModeration(accumulatedText string, wordCount int) bool {
	// Primary: Check for sentence boundaries - provides better readability in UI
	if EndsWithSentenceBoundary(accumulatedText) && wordCount > 0 {
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
// Handles common sentence terminators and accounts for trailing whitespace.
func EndsWithSentenceBoundary(text string) bool {
	trimmed := strings.TrimRight(text, " \t")
	if len(trimmed) == 0 {
		return false
	}

	// Check for common sentence-ending punctuation
	lastChar := trimmed[len(trimmed)-1]
	return lastChar == '.' || lastChar == '!' || lastChar == '?'
}

// extractResponseText extracts the text content from a response for moderation
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

// createGuardrailViolationResponse creates a response indicating guardrail violation
func createGuardrailViolationResponse(responseID string, model string, violationReason string) ResponseData {
	// Use the violation reason from moderation API, or fall back to default message
	message := constants.GuardrailViolationMessage
	if violationReason != "" {
		message = violationReason
	}

	return ResponseData{
		ID:                 responseID,
		Model:              model,
		Status:             "completed",
		CreatedAt:          0,
		GuardrailTriggered: true,
		ViolationReason:    violationReason,
		Output: []OutputItem{
			{
				ID:     "msg_guardrail",
				Type:   "message",
				Role:   "assistant",
				Status: "completed",
				Content: []ContentItem{
					{
						Type: "output_text",
						Text: message,
					},
				},
			},
		},
	}
}
