package models

// ConfigMapInfo provides metadata about a source ConfigMap
type ConfigMapInfo struct {
	Name        string `json:"name"`
	Namespace   string `json:"namespace"`
	LastUpdated string `json:"last_updated"` // ISO 8601 format
}
