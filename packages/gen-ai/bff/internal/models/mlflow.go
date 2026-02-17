package models

import "time"

// MLflowPrompt represents a prompt from MLflow in BFF response format.
type MLflowPrompt struct {
	Name              string            `json:"name"`
	Description       string            `json:"description"`
	LatestVersion     int               `json:"latest_version"`
	Tags              map[string]string `json:"tags,omitempty"`
	CreationTimestamp time.Time         `json:"creation_timestamp"`
}

// MLflowPromptsResponse is the response for listing MLflow prompts.
type MLflowPromptsResponse struct {
	Prompts       []MLflowPrompt `json:"prompts"`
	NextPageToken string         `json:"next_page_token,omitempty"`
}
