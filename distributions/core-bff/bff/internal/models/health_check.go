// Package models defines domain model types used across the BFF.
package models

// SystemInfo holds system version information.
type SystemInfo struct {
	Version string `json:"version"`
}

// HealthCheckModel represents the health check response structure.
type HealthCheckModel struct {
	Status     string     `json:"status"`
	SystemInfo SystemInfo `json:"systemInfo"`
}
