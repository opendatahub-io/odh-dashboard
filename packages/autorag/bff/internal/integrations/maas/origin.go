package maas

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
)

// MaaSOrigin identifies the exact HTTPS origin that is trusted for the
// allowlisted private MaaS gateway. The port is always populated so that a
// trusted hostname cannot be reused to reach a different internal service.
type MaaSOrigin struct {
	Host string
	Port string
}

func (o MaaSOrigin) String() string {
	return net.JoinHostPort(o.Host, o.Port)
}

func (o MaaSOrigin) Equal(other MaaSOrigin) bool {
	return strings.EqualFold(o.Host, other.Host) && o.Port == other.Port
}

// MaaSOriginFromURL returns the normalized origin for a validated HTTPS MaaS
// URL. IP literals are deliberately excluded: only an installation-controlled
// DNS hostname returned by the MaaS BFF can receive the private-address
// exception.
func MaaSOriginFromURL(parsed *url.URL) (MaaSOrigin, error) {
	if parsed == nil || parsed.Scheme != "https" {
		return MaaSOrigin{}, fmt.Errorf("MaaS origin must use HTTPS")
	}
	host := strings.TrimSuffix(strings.ToLower(strings.TrimSpace(parsed.Hostname())), ".")
	if host == "" {
		return MaaSOrigin{}, fmt.Errorf("MaaS origin must contain a hostname")
	}
	if net.ParseIP(host) != nil {
		return MaaSOrigin{}, fmt.Errorf("MaaS origin must contain a hostname, not an IP address")
	}

	port := parsed.Port()
	if port == "" {
		port = "443"
	} else {
		portNumber, err := strconv.Atoi(port)
		if err != nil || portNumber < 1 || portNumber > 65535 {
			return MaaSOrigin{}, fmt.Errorf("MaaS origin contains an unsupported port")
		}
		port = strconv.Itoa(portNumber)
	}

	return MaaSOrigin{Host: host, Port: port}, nil
}

type trustedOriginContextKey struct{}

// WithTrustedMaaSOrigin attaches the installation-trusted MaaS origin to a
// request context. The dialer uses this capability only for the matching
// hostname and port; it is never derived from the user-provided Secret.
func WithTrustedMaaSOrigin(ctx context.Context, origin MaaSOrigin) context.Context {
	return context.WithValue(ctx, trustedOriginContextKey{}, origin)
}

func trustedMaaSOriginFromContext(ctx context.Context) (MaaSOrigin, bool) {
	origin, ok := ctx.Value(trustedOriginContextKey{}).(MaaSOrigin)
	return origin, ok
}

// TrustedMaaSOriginFromContext returns the request-scoped installation trust
// capability, if one was attached by the repository layer.
func TrustedMaaSOriginFromContext(ctx context.Context) (MaaSOrigin, bool) {
	return trustedMaaSOriginFromContext(ctx)
}
