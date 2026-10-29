package kubernetes

import "context"

type trustedPortForwardEndpointContextKey struct{}

// WithTrustedPortForwardEndpoint marks a request rewritten by the trusted local
// port-forward transport. hostPort must be the exact rewritten localhost host/port.
func WithTrustedPortForwardEndpoint(ctx context.Context, hostPort string) context.Context {
	return context.WithValue(ctx, trustedPortForwardEndpointContextKey{}, hostPort)
}

// TrustedPortForwardEndpoint returns the exact localhost host/port marked by the
// trusted local port-forward transport, if present.
func TrustedPortForwardEndpoint(ctx context.Context) (string, bool) {
	hostPort, ok := ctx.Value(trustedPortForwardEndpointContextKey{}).(string)
	return hostPort, ok && hostPort != ""
}
