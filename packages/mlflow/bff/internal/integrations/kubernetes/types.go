package kubernetes

// ServiceDetails holds the resolved connection details for a Kubernetes Service.
type ServiceDetails struct {
	Name                string
	DisplayName         string
	Description         string
	ClusterIP           string
	HTTPPort            int32
	IsHTTPS             bool
	ExternalAddressRest string
}

// RequestIdentity carries the caller's identity extracted from an HTTP request.
// Depending on the auth method, either UserID+Groups (internal) or Token (user_token) is populated.
type RequestIdentity struct {
	UserID string
	Groups []string
	Token  BearerToken
}

// BearerToken wraps a raw token string and redacts it in String() to prevent accidental logging.
type BearerToken struct {
	raw string
}

// NewBearerToken creates a BearerToken from a raw token string.
func NewBearerToken(t string) BearerToken {
	return BearerToken{raw: t}
}

// String returns "[REDACTED]" so the token is never accidentally printed.
func (t BearerToken) String() string {
	return "[REDACTED]"
}

// Raw returns the underlying token value for use in API calls.
func (t BearerToken) Raw() string {
	return t.raw
}
