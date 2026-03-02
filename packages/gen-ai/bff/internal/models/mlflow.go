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

// MLflowMessage represents a single message in a chat prompt.
type MLflowMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// MLflowRegisterPromptRequest is the request body for creating or updating a prompt.
// Either Messages (chat prompt) or Template (text prompt) must be set, but not both.
type MLflowRegisterPromptRequest struct {
	Name          string            `json:"name"`
	Messages      []MLflowMessage   `json:"messages,omitempty"`
	Template      string            `json:"template,omitempty"`
	CommitMessage string            `json:"commit_message,omitempty"`
	Tags          map[string]string `json:"tags,omitempty"`
}

// MLflowPromptVersion represents a full prompt version with content.
type MLflowPromptVersion struct {
	Name          string            `json:"name"`
	Version       int               `json:"version"`
	Template      string            `json:"template,omitempty"`
	Messages      []MLflowMessage   `json:"messages,omitempty"`
	CommitMessage string            `json:"commit_message,omitempty"`
	Aliases       []string          `json:"aliases,omitempty"`
	Tags          map[string]string `json:"tags,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

// MLflowPromptVersionMeta represents version metadata without full content.
type MLflowPromptVersionMeta struct {
	Version       int               `json:"version"`
	CommitMessage string            `json:"commit_message,omitempty"`
	Aliases       []string          `json:"aliases,omitempty"`
	Tags          map[string]string `json:"tags,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

// MLflowPromptVersionsResponse is the response for listing prompt versions.
type MLflowPromptVersionsResponse struct {
	Versions      []MLflowPromptVersionMeta `json:"versions"`
	NextPageToken string                    `json:"next_page_token,omitempty"`
}
