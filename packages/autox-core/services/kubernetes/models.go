package kubernetes

// RequestIdentity represents the authenticated user making the request
// This is used throughout the service and client layers
type RequestIdentity struct {
	UserID string
	Groups []string
	Token  string
}

// UserInfo contains user identity and authorization information
type UserInfo struct {
	UserID       string `json:"userId"`
	ClusterAdmin bool   `json:"clusterAdmin"`
}

// NamespaceInfo contains namespace metadata
type NamespaceInfo struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
}

// SecretInfo contains filtered secret data with type detection
type SecretInfo struct {
	UUID        string            `json:"uuid"`
	Name        string            `json:"name"`
	Type        string            `json:"type,omitempty"`
	Data        map[string]string `json:"data"`
	DisplayName string            `json:"displayName,omitempty"`
	Description string            `json:"description,omitempty"`
}
