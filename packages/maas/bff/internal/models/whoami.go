package models

type MaaSWhoAmI struct {
	Sub     string `json:"sub"`
	Email   string `json:"email,omitempty"`
	Name    string `json:"name,omitempty"`
	IsAdmin bool   `json:"isAdmin"`
	// OrgID and OrgName are the caller's organization, set only for an
	// organization-scoped identity (the token's org_id and org_name claims).
	// The MaaS Portal shows group names "<org-id>/<group>" by the org's name.
	OrgID   string `json:"orgId,omitempty"`
	OrgName string `json:"orgName,omitempty"`
}

// MaaSWhoAmIUpstream is the response returned by maas-api /v1/me. The identity
// contract is flat: org_id identifies the caller organization, with optional
// org_name and roles. The BFF passes org_id and org_name on (MaaSWhoAmI) and
// keeps roles to itself.
type MaaSWhoAmIUpstream struct {
	Sub     string   `json:"sub"`
	Email   string   `json:"email,omitempty"`
	Name    string   `json:"name,omitempty"`
	OrgID   string   `json:"org_id,omitempty"`
	OrgName string   `json:"org_name,omitempty"`
	Roles   []string `json:"roles,omitempty"`
}
