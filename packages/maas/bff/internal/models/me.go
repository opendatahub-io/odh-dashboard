package models

const MaasOrgsClaim = "https://redhat.com/maas/orgs"

type MaasOrg struct {
	OrganizationID   string   `json:"organization_id"`
	OrganizationName string   `json:"organization_name,omitempty"`
	Roles            []string `json:"roles"`
}

type MaasMe struct {
	Sub   string    `json:"sub"`
	Email string    `json:"email,omitempty"`
	Name  string    `json:"name,omitempty"`
	Orgs  []MaasOrg `json:"https://redhat.com/maas/orgs"`
}
