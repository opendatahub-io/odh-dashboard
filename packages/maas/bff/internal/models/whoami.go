package models

const MaaSOrgsClaim = "https://redhat.com/maas/orgs"

type MaaSOrg struct {
	OrganizationID   string   `json:"organization_id"`
	OrganizationName string   `json:"organization_name,omitempty"`
	Roles            []string `json:"roles"`
}

type MaaSWhoAmI struct {
	Sub   string    `json:"sub"`
	Email string    `json:"email,omitempty"`
	Name  string    `json:"name,omitempty"`
	Orgs  []MaaSOrg `json:"https://redhat.com/maas/orgs"`
}
