package kubernetes

// ServiceDetails holds information about a Kubernetes service.
type ServiceDetails struct {
	Name                string
	DisplayName         string
	Description         string
	ClusterIP           string
	HTTPPort            int32
	IsHTTPS             bool
	ExternalAddressRest string
}

// RequestIdentity holds authenticated user identity information.
type RequestIdentity struct {
	UserID string
	Groups []string
	Token  BearerToken
}

// BearerToken wraps a bearer token string with safe string representation.
type BearerToken struct {
	raw string
}

// NewBearerToken creates a new BearerToken from a raw token string.
func NewBearerToken(t string) BearerToken {
	return BearerToken{raw: t}
}

func (t BearerToken) String() string {
	return "[REDACTED]"
}

func (t BearerToken) Raw() string {
	return t.raw
}
