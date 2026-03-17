package models

import "time"

// APIKeyCreateRequest represents a request to create a new API key.
// Based on the MaaS API OpenAPI spec: POST /v1/api-keys
type APIKeyCreateRequest struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	ExpiresIn   string `json:"expiresIn,omitempty"`
}

// APIKeyCreateResponse is the one-time response when an API key is created.
// The plaintext key is shown only at creation time.
type APIKeyCreateResponse struct {
	Key       string     `json:"key"`
	KeyPrefix string     `json:"keyPrefix"`
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	CreatedAt time.Time  `json:"createdAt"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
}

// APIKey represents metadata for an API key (returned by GET, DELETE, and search).
type APIKey struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	Description    string     `json:"description,omitempty"`
	Username       string     `json:"username,omitempty"`
	Groups         []string   `json:"groups,omitempty"`
	CreationDate   time.Time  `json:"creationDate"`
	ExpirationDate *time.Time `json:"expirationDate,omitempty"`
	Status         string     `json:"status"`
	LastUsedAt     *time.Time `json:"lastUsedAt,omitempty"`
}

// APIKeySearchRequest represents a search/filter request for API keys.
// Based on the MaaS API OpenAPI spec: POST /v1/api-keys/search
type APIKeySearchRequest struct {
	Filters    *APIKeySearchFilters    `json:"filters,omitempty"`
	Sort       *APIKeySearchSort       `json:"sort,omitempty"`
	Pagination *APIKeySearchPagination `json:"pagination,omitempty"`
}

type APIKeySearchFilters struct {
	Username string   `json:"username,omitempty"`
	Status   []string `json:"status,omitempty"`
}

type APIKeySearchSort struct {
	By    string `json:"by,omitempty"`
	Order string `json:"order,omitempty"`
}

type APIKeySearchPagination struct {
	Limit  int `json:"limit,omitempty"`
	Offset int `json:"offset,omitempty"`
}

// APIKeyListResponse is the paginated list response from search.
type APIKeyListResponse struct {
	Object  string   `json:"object"`
	Data    []APIKey `json:"data"`
	HasMore bool     `json:"has_more"`
}

// APIKeyBulkRevokeRequest represents a request to bulk-revoke a user's keys.
type APIKeyBulkRevokeRequest struct {
	Username string `json:"username"`
}

// APIKeyBulkRevokeResponse is the response from a bulk-revoke operation.
type APIKeyBulkRevokeResponse struct {
	RevokedCount int    `json:"revokedCount"`
	Message      string `json:"message"`
}

// APIKeyStatus constants
const (
	APIKeyStatusActive  = "active"
	APIKeyStatusRevoked = "revoked"
	APIKeyStatusExpired = "expired"
)
