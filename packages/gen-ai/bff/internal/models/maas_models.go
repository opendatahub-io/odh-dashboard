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

// --- Types for inter-BFF communication with MaaS BFF ---

// MaaSBFFModelDetails contains model metadata from MaaS BFF
type MaaSBFFModelDetails struct {
	DisplayName   string `json:"displayName,omitempty"`
	Description   string `json:"description,omitempty"`
	GenAIUseCase  string `json:"genaiUseCase,omitempty"`
	ContextWindow int    `json:"contextWindow,omitempty"`
}

// MaaSBFFModel represents a model from MaaS BFF with nested modelDetails
type MaaSBFFModel struct {
	ID            string               `json:"id"`
	Object        string               `json:"object"`
	Created       int64                `json:"created"`
	OwnedBy       string               `json:"owned_by"`
	Ready         bool                 `json:"ready"`
	URL           string               `json:"url"`
	ModelType     string               `json:"model_type,omitempty"`
	ModelDetails  *MaaSBFFModelDetails `json:"modelDetails,omitempty"`
	Subscriptions []SubscriptionInfo   `json:"subscriptions,omitempty"`
	Kind          string               `json:"kind,omitempty"`
}

// MaaSBFFModelsData represents the data field in MaaS BFF models response
type MaaSBFFModelsData struct {
	Object string         `json:"object"`
	Data   []MaaSBFFModel `json:"data"`
}

// MaaSBFFModelsResponse represents the full MaaS BFF models response envelope
type MaaSBFFModelsResponse struct {
	Data MaaSBFFModelsData `json:"data"`
}

// MaaSBFFAPIKeyRequestData represents the payload inside the envelope for API key creation.
type MaaSBFFAPIKeyRequestData struct {
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	ExpiresIn    string `json:"expiresIn,omitempty"`
	Subscription string `json:"subscription"`
	Ephemeral    bool   `json:"ephemeral"`
}

// MaaSBFFAPIKeyRequest represents the MaaS BFF API key creation request.
// Per MaaS BFF OpenAPI spec, POST /api/v1/api-keys expects an envelope wrapper {"data": {...}}.
type MaaSBFFAPIKeyRequest struct {
	Data MaaSBFFAPIKeyRequestData `json:"data"`
}

// MaaSBFFAPIKeyResponseData represents the payload inside the envelope for API key response.
type MaaSBFFAPIKeyResponseData struct {
	Key       string  `json:"key"`
	KeyPrefix string  `json:"keyPrefix,omitempty"`
	ID        string  `json:"id,omitempty"`
	Name      string  `json:"name,omitempty"`
	CreatedAt *string `json:"createdAt,omitempty"`
	ExpiresAt *string `json:"expiresAt,omitempty"`
}

// MaaSBFFAPIKeyResponse represents the MaaS BFF API key response.
// Per MaaS BFF OpenAPI spec, POST /api/v1/api-keys returns an envelope wrapper {"data": {...}}.
type MaaSBFFAPIKeyResponse struct {
	Data MaaSBFFAPIKeyResponseData `json:"data"`
}
