package models

// TokenRequest represents a request to issue a new ephemeral token
// Used by Gen-AI BFF for playground session authentication
type TokenRequest struct {
	// Expiration is the token time-to-live in Go duration format (ns, us, ms, s, m, h)
	// Default: "4h" if not provided
	Expiration string `json:"expiration,omitempty"`
}

// TokenResponse represents the response when a token is issued
type TokenResponse struct {
	// Token is the generated JWT token for MaaS API authentication
	Token string `json:"token"`

	// ExpiresAt is the token expiration timestamp as Unix timestamp
	ExpiresAt int64 `json:"expiresAt"`
}
