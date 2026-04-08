package models

// SubscriptionInfo contains metadata about which subscription provides access to a model.
type SubscriptionInfo struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName,omitempty"`
	Description string `json:"description,omitempty"`
}

// MaaSModel represents a Model as a Service model based on the OpenAPI spec
type MaaSModel struct {
	ID            string             `json:"id"`
	Object        string             `json:"object"`
	Created       int64              `json:"created"`
	OwnedBy       string             `json:"owned_by"`
	Ready         bool               `json:"ready"`
	URL           string             `json:"url"`
	DisplayName   string             `json:"display_name,omitempty"`
	Description   string             `json:"description,omitempty"`
	Usecase       string             `json:"usecase,omitempty"`
	ModelType     string             `json:"model_type,omitempty"`
	Subscriptions []SubscriptionInfo `json:"subscriptions,omitempty"`
}

// MaaSModelsResponse represents the response structure for listing MaaS models
// This follows the OpenAI-compatible format as specified in the API spec
type MaaSModelsResponse struct {
	Object string      `json:"object"`
	Data   []MaaSModel `json:"data"`
}

// MaaSTokenRequest represents a request to create a new ephemeral API key
type MaaSTokenRequest struct {
	Name         string `json:"name,omitempty"`
	Description  string `json:"description,omitempty"`
	ExpiresIn    string `json:"expiresIn,omitempty"`
	Ephemeral    bool   `json:"ephemeral"`
	Subscription string `json:"subscription,omitempty"`
}

// MaaSTokenResponse represents the response when an API key is created
type MaaSTokenResponse struct {
	Key       string `json:"key"`
	ExpiresAt string `json:"expiresAt,omitempty"`
}
