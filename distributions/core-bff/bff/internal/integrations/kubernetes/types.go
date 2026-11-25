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
	UserID      string
	Groups      []string
	Token       BearerToken
	DevFallback bool
}

// ResolveToken returns the bearer token a proxied request carries: the
// identity's own token, or, on a DEV_MODE fallback, the kubeconfig's token.
// A fallback with no kubeconfig token (a certificate-only kubeconfig) yields
// "": the request then authenticates with the kubeconfig certificate alone,
// never with a placeholder bearer token next to it.
func (id *RequestIdentity) ResolveToken(fallbackToken string) string {
	if id.DevFallback {
		return fallbackToken
	}
	return id.Token.Raw()
}

// BearerHeader is the Authorization value for token, or "" (send no
// Authorization header) when there is no token.
func BearerHeader(token string) string {
	if token == "" {
		return ""
	}
	return BearerTokenPrefix + token
}

// BearerTokenPrefix is the HTTP Authorization header prefix for bearer tokens.
const BearerTokenPrefix = "Bearer "

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
