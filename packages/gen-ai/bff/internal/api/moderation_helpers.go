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
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get LlamaStack client: %w", err)
	}

	response, err := client.CreateModeration(ctx, input, shieldID)
	if err != nil {
		return nil, fmt.Errorf("moderation API call failed: %w", err)
	}

	// No results means content is not flagged
	if len(response.Results) == 0 {
		return &ModerationResult{Flagged: false}, nil
	}

	modResult := response.Results[0]
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
