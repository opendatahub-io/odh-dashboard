package models

const MaaSOrgsClaim = "https://redhat.com/maas/orgs"

type MaaSOrg struct {
	OrganizationID   string   `json:"organization_id"`
	OrganizationName string   `json:"organization_name,omitempty"`
	Roles            []string `json:"roles"`
}

type MaaSWhoAmI struct {
	Sub     string `json:"sub"`
	Email   string `json:"email,omitempty"`
	Name    string `json:"name,omitempty"`
	IsAdmin bool   `json:"isAdmin"`
}

// MaaSWhoAmIUpstream is the response returned by maas-api /v1/me. The BFF
// intentionally does not expose the organization claim to its callers.
type MaaSWhoAmIUpstream struct {
	Sub   string     `json:"sub"`
	Email string     `json:"email,omitempty"`
	Name  string     `json:"name,omitempty"`
	Orgs  *[]MaaSOrg `json:"https://redhat.com/maas/orgs"`
}
