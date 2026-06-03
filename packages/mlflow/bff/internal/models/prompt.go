package models

import "time"

// PromptScopeType classifies a prompt's scope within the platform.
type PromptScopeType string

const (
	PromptScopeProject PromptScopeType = "project"
	PromptScopeGlobal  PromptScopeType = "global"
)

// PromptScope identifies where a prompt lives and how it is scoped.
type PromptScope struct {
	Type      PromptScopeType `json:"type"`
	Namespace string          `json:"namespace"`
}

// Prompt represents a prompt from the MLflow Prompt Registry.
type Prompt struct {
	Name              string            `json:"name"`
	Description       string            `json:"description"`
	LatestVersion     int               `json:"latest_version"`
	Tags              map[string]string `json:"tags,omitempty"`
	CreationTimestamp time.Time         `json:"creation_timestamp"`
	Scope             PromptScope       `json:"scope"`
}

// PromptsResponse is the response for listing prompts.
type PromptsResponse struct {
	Prompts          []Prompt `json:"prompts"`
	FailedNamespaces []string `json:"failed_namespaces,omitempty"`
}

// Message represents a single message in a chat prompt.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// RegisterPromptRequest is the request body for creating or updating a prompt.
// Either Messages (chat prompt) or Template (text prompt) must be set, but not both.
// When CreateOnly is true, the request fails with 409 if a prompt with the given name already exists.
type RegisterPromptRequest struct {
	Name          string            `json:"name"`
	Messages      []Message         `json:"messages,omitempty"`
	Template      string            `json:"template,omitempty"`
	CommitMessage string            `json:"commit_message,omitempty"`
	Tags          map[string]string `json:"tags,omitempty"`
	CreateOnly    bool              `json:"create_only,omitempty"`
}

// PromptVersion represents a full prompt version with content.
type PromptVersion struct {
	Name          string            `json:"name"`
	Version       int               `json:"version"`
	Template      string            `json:"template,omitempty"`
	Messages      []Message         `json:"messages,omitempty"`
	CommitMessage string            `json:"commit_message,omitempty"`
	Aliases       []string          `json:"aliases,omitempty"`
	Tags          map[string]string `json:"tags,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

// PromptVersionMeta represents version metadata without full content.
type PromptVersionMeta struct {
	Version       int               `json:"version"`
	CommitMessage string            `json:"commit_message,omitempty"`
	Aliases       []string          `json:"aliases,omitempty"`
	Tags          map[string]string `json:"tags,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

// PromptVersionsResponse is the response for listing prompt versions.
type PromptVersionsResponse struct {
	Versions      []PromptVersionMeta `json:"versions"`
	NextPageToken string              `json:"next_page_token,omitempty"`
}
