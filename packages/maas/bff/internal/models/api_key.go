package models

import "time"

// APIKeyRequest represents a request to create a new API key
// Based on the MaaS API OpenAPI spec: POST /v1/api-keys
type APIKeyRequest struct {
	// Expiration accepts either Go-style duration string (e.g., "4h", "30m", "24h") or seconds as number
	// Minimum 10 minutes. Default is 4 hours.
	Expiration string `json:"expiration,omitempty"`
	// Name is optional. If provided, the key will be tracked in the metadata store.
	Name string `json:"name,omitempty"`
	// Description provides additional context about the API key's purpose.
	Description string `json:"description,omitempty"`
}

// APIKeyResponse represents the response when an API key is created
// Based on the MaaS API OpenAPI spec
type APIKeyResponse struct {
	// Token is the generated JWT token
	Token string `json:"token"`
	// Expiration is the token expiration duration as string (e.g., "4h")
	Expiration string `json:"expiration"`
	// ExpiresAt is the token expiration timestamp (Unix seconds)
	ExpiresAt int64 `json:"expiresAt"`
	// JTI is the JWT ID - unique identifier for the token
	JTI string `json:"jti"`
	// Name is the token name (present in API key responses)
	Name string `json:"name,omitempty"`
	// Description is the token description (present if provided during creation)
	Description string `json:"description,omitempty"`
}

// APIKeyMetadata represents metadata for an API key
// Used for listing and retrieving API key information
type APIKeyMetadata struct {
	// ID is the unique identifier for the API key metadata
	ID string `json:"id"`
	// Name is the user-friendly name
	Name string `json:"name"`
	// Description provides additional context about the API key's purpose
	Description string `json:"description,omitempty"`
	// CreationDate is when the token was created (ISO format)
	CreationDate time.Time `json:"creationDate"`
	// ExpirationDate is when the token expires (ISO format)
	ExpirationDate time.Time `json:"expirationDate"`
	// Status is the current status (active, expired)
	Status string `json:"status"`
	// ExpiredAt is when the token was revoked/expired (if applicable)
	ExpiredAt *time.Time `json:"expiredAt,omitempty"`
}

// APIKeyStatus constants
const (
	APIKeyStatusActive  = "active"
	APIKeyStatusExpired = "expired"
)
