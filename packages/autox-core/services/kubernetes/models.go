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
	UserID       string
	ClusterAdmin bool
}

// NamespaceInfo contains namespace metadata
type NamespaceInfo struct {
	Name        string
	DisplayName string
}

// SecretInfo contains filtered secret data with type detection
type SecretInfo struct {
	UUID        string
	Name        string
	Type        string
	Data        map[string]string
	DisplayName string
	Description string
}
