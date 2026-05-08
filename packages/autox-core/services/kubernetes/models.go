package kubernetes

// RequestIdentity represents the authenticated user making the request
type RequestIdentity struct {
	UserID string
	Groups []string
	Token  string
}
