package models

// KubeUser represents the current kubeconfig user entry.
type KubeUser struct {
	Name  string `json:"name"`
	Token string `json:"-"`
}

// KubeStatus holds user session status and cluster metadata.
type KubeStatus struct {
	CurrentContext  string   `json:"currentContext"`
	CurrentUser     KubeUser `json:"currentUser"`
	Namespace       string   `json:"namespace"`
	UserName        string   `json:"userName"`
	UserID          string   `json:"userID,omitempty"`
	ClusterID       string   `json:"clusterID"`
	ClusterBranding string   `json:"clusterBranding"`
	IsAdmin         bool     `json:"isAdmin"`
	IsAllowed       bool     `json:"isAllowed"`
	ServerURL       string   `json:"serverURL"`
	IsImpersonating bool     `json:"isImpersonating,omitempty"`
}

// AllowedUser represents a user with notebook access in a namespace.
type AllowedUser struct {
	Username     string `json:"username"`
	Privilege    string `json:"privilege"`
	LastActivity string `json:"lastActivity"`
}

// StatusResponse wraps KubeStatus for the /api/status endpoint.
type StatusResponse struct {
	Kube KubeStatus `json:"kube"`
}
