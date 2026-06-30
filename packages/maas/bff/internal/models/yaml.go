package models

// YamlResponse is the response body for GET /api/v1/yaml.
type YamlResponse struct {
	Content string `json:"content"`
}
