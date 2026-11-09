package models

type MaaSWhoAmI struct {
	Sub     string `json:"sub"`
	Email   string `json:"email,omitempty"`
	Name    string `json:"name,omitempty"`
	IsAdmin bool   `json:"isAdmin"`
}

// MaaSWhoAmIUpstream is the response returned by maas-api /v1/me. The identity
// contract is flat: org_id identifies the caller organization, with optional
// org_name and roles. The BFF intentionally does not expose these claims to its
// callers.
type MaaSWhoAmIUpstream struct {
	Sub     string   `json:"sub"`
	Email   string   `json:"email,omitempty"`
	Name    string   `json:"name,omitempty"`
	OrgID   string   `json:"org_id,omitempty"`
	OrgName string   `json:"org_name,omitempty"`
	Roles   []string `json:"roles,omitempty"`
}
