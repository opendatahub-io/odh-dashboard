package s3

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"
	"time"

	corekubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// validateKey rejects S3 object keys that contain null bytes, path traversal
// sequences, or control characters. S3 treats keys as flat strings (no real
// directory hierarchy), so these patterns are never legitimate in this application.
func validateKey(key string) error {
	if key == "" {
		return fmt.Errorf("%w: key must not be empty", ErrInvalidKey)
	}
	if strings.ContainsRune(key, 0) {
		return fmt.Errorf("%w: key contains null byte", ErrInvalidKey)
	}
	for _, seg := range strings.Split(key, "/") {
		if seg == ".." {
			return fmt.Errorf("%w: key contains path traversal segment", ErrInvalidKey)
		}
	}
	for _, r := range key {
		if r != '\t' && r < 0x20 {
			return fmt.Errorf("%w: key contains control character", ErrInvalidKey)
		}
	}
	return nil
}

// validateAndNormalizeEndpoint validates the S3 endpoint URL to prevent SSRF attacks.
//
// HTTPS is required for external endpoints — plain HTTP is rejected because S3
// credentials would be transmitted in cleartext. HTTP is permitted for suffix-qualified
// in-cluster service endpoints (<service>.<namespace>.svc and
// <service>.<namespace>.svc.cluster.local) since traffic stays within the cluster network.
// Hostnames — including in-cluster — are resolved and checked at dial time by
// ssrfSafeDialContext to guard against ExternalName service CNAME bypasses. The
// development-only unresolved-host opt-out does not apply to suffix-qualified HTTP endpoints.
// RFC-1918 private IPs are permitted (MinIO commonly runs on cluster service IPs).
// Loopback, link-local, and reserved ranges are always blocked.
func (p *awsClientProvider) validateAndNormalizeEndpoint(endpoint string) (string, error) {
	if endpoint == "" {
		return "", fmt.Errorf("endpoint URL cannot be empty")
	}

	parsedURL, err := url.Parse(endpoint)
	if err != nil {
		return "", fmt.Errorf("invalid endpoint URL format: %w", err)
	}

	if parsedURL.User != nil {
		return "", fmt.Errorf("endpoint URL must not contain credentials (userinfo)")
	}

	if parsedURL.Path != "" && parsedURL.Path != "/" {
		return "", fmt.Errorf("endpoint URL must not contain a path")
	}
	if parsedURL.RawQuery != "" {
		return "", fmt.Errorf("endpoint URL must not contain a query string")
	}
	if parsedURL.Fragment != "" {
		return "", fmt.Errorf("endpoint URL must not contain a fragment")
	}

	hostname := parsedURL.Hostname()
	if hostname == "" {
		return "", fmt.Errorf("endpoint URL must have a valid hostname")
	}

	isInCluster := isInternalHost(hostname)
	if parsedURL.Scheme == "http" && !isInCluster {
		return "", fmt.Errorf("endpoint URL must use HTTPS scheme for external endpoints, got: %s", parsedURL.Scheme)
	}
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return "", fmt.Errorf("endpoint URL must use http or https scheme, got: %s", parsedURL.Scheme)
	}

	// IP-literal endpoints are validated here since there's no DNS resolution to intercept.
	// Hostname endpoints are validated at dial time by ssrfSafeDialContext, which checks
	// every resolved IP before connecting — eliminating the DNS rebinding TOCTOU window.
	ip := net.ParseIP(hostname)
	if ip != nil {
		if err := validateIPAddress(ip); err != nil {
			return "", err
		}
	}

	return parsedURL.String(), nil
}

// ssrfSafeDialContext wraps a net.Dialer to validate resolved IPs at connection time,
// preventing DNS rebinding attacks. Every IP the system resolver returns is checked
// against blocked ranges before the TCP connection is established — the same resolution
// used for validation is the one used for the connection, eliminating the TOCTOU window
// that exists when validation and dialing resolve DNS independently. When
// requirePrivateEndpoint is true, every resolved IP must also be private/shared.
func ssrfSafeDialContext(base *net.Dialer, allowUnresolvable, requirePrivateEndpoint bool) func(ctx context.Context, network, addr string) (net.Conn, error) {
	return ssrfSafeDialContextWithResolver(base, allowUnresolvable, requirePrivateEndpoint, net.DefaultResolver, s3ConnectTimeout)
}

type ipResolver interface {
	LookupIPAddr(context.Context, string) ([]net.IPAddr, error)
}

func ssrfSafeDialContextWithResolver(
	base *net.Dialer,
	allowUnresolvable, requirePrivateEndpoint bool,
	resolver ipResolver,
	resolveAndDialTimeout time.Duration,
) func(ctx context.Context, network, addr string) (net.Conn, error) {
	return ssrfSafeDialContextWithResolverAndDialer(
		allowUnresolvable,
		requirePrivateEndpoint,
		resolver,
		base.DialContext,
		resolveAndDialTimeout,
	)
}

func ssrfSafeDialContextWithResolverAndDialer(
	allowUnresolvable, requirePrivateEndpoint bool,
	resolver ipResolver,
	dialContext func(context.Context, string, string) (net.Conn, error),
	resolveAndDialTimeout time.Duration,
) func(ctx context.Context, network, addr string) (net.Conn, error) {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, fmt.Errorf("invalid address %q: %w", addr, err)
		}

		dialCtx, cancel := context.WithTimeout(ctx, resolveAndDialTimeout)
		defer cancel()
		trustedForwardedHost, hasTrustedForward := corekubernetes.TrustedPortForwardEndpoint(dialCtx)
		allowLoopback := hasTrustedForward && strings.EqualFold(host, "localhost") && trustedForwardedHost == net.JoinHostPort(host, port)

		// Validate IP literals here as well because a redirect can change the request
		// host after the original endpoint has been validated.
		if ip := net.ParseIP(host); ip != nil {
			if err := validateResolvedIPs(host, []net.IPAddr{{IP: ip}}, requirePrivateEndpoint, allowLoopback); err != nil {
				return nil, err
			}
			return dialContext(dialCtx, network, addr)
		}

		ips, err := resolver.LookupIPAddr(dialCtx, host)
		if err != nil {
			if allowUnresolvable && !requirePrivateEndpoint {
				return dialContext(dialCtx, network, addr)
			}
			return nil, fmt.Errorf("endpoint hostname %q cannot be resolved: %w", host, err)
		}
		if err := validateResolvedIPs(host, ips, requirePrivateEndpoint, allowLoopback); err != nil {
			return nil, err
		}

		// Connect using the validated IPs directly — no second resolution.
		var lastErr error
		for _, ipAddr := range ips {
			conn, err := dialContext(dialCtx, network, net.JoinHostPort(ipAddr.IP.String(), port))
			if err == nil {
				return conn, nil
			}
			lastErr = err
		}
		return nil, lastErr
	}
}

// validateResolvedIPs validates every address returned for a hostname before any
// connection is attempted. A private-only endpoint rejects public destinations even
// when the hostname itself has a Kubernetes service suffix.
func validateResolvedIPs(host string, ips []net.IPAddr, requirePrivate, allowLoopbackForPortForward bool) error {
	if len(ips) == 0 {
		return fmt.Errorf("endpoint hostname %q resolved to no IP addresses", host)
	}

	for _, ipAddr := range ips {
		if allowLoopbackForPortForward && strings.EqualFold(host, "localhost") {
			if !ipAddr.IP.IsLoopback() {
				return fmt.Errorf("trusted port-forward localhost resolved to non-loopback IP %s", ipAddr.IP)
			}
			continue
		}
		if err := validateIPAddress(ipAddr.IP); err != nil {
			return fmt.Errorf("endpoint hostname %q resolves to blocked IP %s: %w", host, ipAddr.IP, err)
		}
		if requirePrivate && !isPrivateOrSharedIP(ipAddr.IP) {
			return fmt.Errorf("endpoint hostname %q resolves to non-private IP %s for in-cluster HTTP endpoint", host, ipAddr.IP)
		}
	}
	return nil
}

func isPrivateOrSharedIP(ip net.IP) bool {
	if ip.IsPrivate() {
		return true
	}

	// Preserve the existing allowance for RFC 6598 shared address space, which is
	// sometimes used for cluster service or pod networking.
	ipv4 := ip.To4()
	return ipv4 != nil && ipv4[0] == 100 && ipv4[1] >= 64 && ipv4[1] <= 127
}

type internalHostKind uint8

const (
	internalHostExternal internalHostKind = iota
	internalHostShort
	internalHostFull
)

func classifyInternalHost(hostname string) internalHostKind {
	serviceHostname, ok := corekubernetes.ParseServiceHostname(hostname)
	if !ok {
		return internalHostExternal
	}
	if serviceHostname.Full {
		return internalHostFull
	}
	return internalHostShort
}

// isInternalHost reports whether hostname is a suffix-qualified Kubernetes in-cluster
// service name. These legitimately use HTTP internally, so the HTTPS requirement is
// relaxed for them; all hostnames still undergo SSRF IP validation. Accept both the
// short <service>.<namespace>.svc form and the full
// <service>.<namespace>.svc.cluster.local form, while preventing overly-broad matches
// like "evil.cluster.local".
func isInternalHost(hostname string) bool {
	return classifyInternalHost(hostname) != internalHostExternal
}

// validateIPAddress blocks loopback, link-local, multicast, unspecified, and reserved ranges
// to prevent SSRF targeting the node or cloud metadata services (e.g. 169.254.169.254).
//
// RFC-1918 private ranges (10/8, 172.16/12, 192.168/16), Carrier-Grade NAT
// (100.64/10, RFC 6598), and IPv6 unique local addresses (fc00::/7) are permitted
// because MinIO and other S3-compatible stores commonly run on the same cluster
// using service or pod IPs in these ranges.
func validateIPAddress(ip net.IP) error {
	if ip.IsUnspecified() {
		return fmt.Errorf("endpoint IP %s is unspecified", ip)
	}
	if ip.IsMulticast() {
		return fmt.Errorf("endpoint IP %s is multicast", ip)
	}

	blocked := []struct {
		cidr string
		desc string
	}{
		{"0.0.0.0/8", "reserved 'this network' range (RFC 1122)"},
		{"169.254.0.0/16", "link-local range"},
		{"127.0.0.0/8", "loopback range"},
		{"240.0.0.0/4", "reserved for future use (RFC 1112)"},
		{"::1/128", "IPv6 loopback"},
		{"fe80::/10", "IPv6 link-local"},
	}

	for _, b := range blocked {
		_, network, err := net.ParseCIDR(b.cidr)
		if err != nil {
			continue
		}
		if network.Contains(ip) {
			return fmt.Errorf("endpoint IP %s is in blocked %s", ip, b.desc)
		}
	}
	return nil
}
