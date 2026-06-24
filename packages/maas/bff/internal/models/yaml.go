package models

// YamlResponse is the response body for GET /api/v1/maas-governance/yaml.
type YamlResponse struct {
	Content string `json:"content"`
}
