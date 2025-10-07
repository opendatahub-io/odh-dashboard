package models

// MaaSModel represents a Model as a Service model based on the OpenAPI spec
type MaaSModel struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	OwnedBy string `json:"owned_by"`
	Ready   bool   `json:"ready"`
	URL     string `json:"url"`
}

// MaaSModelsResponse represents the response structure for listing MaaS models
// This follows the OpenAI-compatible format as specified in the API spec
type MaaSModelsResponse struct {
	Object string      `json:"object"`
	Data   []MaaSModel `json:"data"`
}

// MaaSTokenRequest represents a request to issue a new token
type MaaSTokenRequest struct {
	TTL string `json:"expiration"` // Token time-to-live (Go duration format: ns, us, ms, s, m, h), default: "4h"
}

// MaaSTokenResponse represents the response when a token is issued
type MaaSTokenResponse struct {
	Token     string `json:"token"`     // Generated token
	ExpiresAt int64  `json:"expiresAt"` // Token expiration (Unix timestamp)
}
