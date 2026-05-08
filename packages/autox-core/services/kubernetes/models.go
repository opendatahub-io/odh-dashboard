package kubernetes

// RequestIdentity represents the authenticated user making the request
// This is used throughout the service and client layers
type RequestIdentity struct {
	UserID string
	Groups []string
	Token  string
}
