package models

type SystemInfo struct {
	Version string `json:"version"`
}

type OpenShellStatus struct {
	Enabled   bool   `json:"enabled"`
	Gateway   string `json:"gateway,omitempty"`
	Namespace string `json:"namespace,omitempty"`
}

type HealthCheckModel struct {
	Status     string          `json:"status"`
	SystemInfo SystemInfo      `json:"system_info"`
	OpenShell  OpenShellStatus `json:"openshell"`
}
