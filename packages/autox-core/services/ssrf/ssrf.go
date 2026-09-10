package ssrf

import (
	"context"
	"fmt"
	"net"
)

// SafeDialContext resolves hostnames once, validates every result, and dials
// the validated addresses directly to prevent DNS rebinding between checks.
func SafeDialContext(base *net.Dialer, allowUnresolvable bool) func(context.Context, string, string) (net.Conn, error) {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, fmt.Errorf("invalid address %q: %w", addr, err)
		}

		if ip := net.ParseIP(host); ip != nil {
			if err := ValidateIP(ip); err != nil {
				return nil, err
			}
			return base.DialContext(ctx, network, addr)
		}

		ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
		if err != nil {
			if allowUnresolvable {
				return base.DialContext(ctx, network, addr)
			}
			return nil, fmt.Errorf("endpoint hostname %q cannot be resolved: %w", host, err)
		}

		for _, ipAddr := range ips {
			if err := ValidateIP(ipAddr.IP); err != nil {
				return nil, fmt.Errorf("endpoint hostname %q resolves to blocked IP %s: %w", host, ipAddr.IP, err)
			}
		}

		var lastErr error
		for _, ipAddr := range ips {
			conn, err := base.DialContext(ctx, network, net.JoinHostPort(ipAddr.IP.String(), port))
			if err == nil {
				return conn, nil
			}
			lastErr = err
		}
		return nil, lastErr
	}
}

// ValidateIP blocks address classes that must not be reachable through a
// user-supplied endpoint. RFC-1918 and cluster-private addresses remain allowed.
func ValidateIP(ip net.IP) error {
	if ip.IsUnspecified() {
		return fmt.Errorf("endpoint IP %s is unspecified", ip)
	}
	if ip.IsMulticast() {
		return fmt.Errorf("endpoint IP %s is multicast", ip)
	}

	for _, blocked := range []struct {
		cidr string
		desc string
	}{
		{"0.0.0.0/8", "reserved 'this network' range (RFC 1122)"},
		{"169.254.0.0/16", "link-local range"},
		{"127.0.0.0/8", "loopback range"},
		{"240.0.0.0/4", "reserved for future use (RFC 1112)"},
		{"::1/128", "IPv6 loopback"},
		{"fe80::/10", "IPv6 link-local"},
	} {
		_, network, err := net.ParseCIDR(blocked.cidr)
		if err == nil && network.Contains(ip) {
			return fmt.Errorf("endpoint IP %s is in blocked %s", ip, blocked.desc)
		}
	}
	return nil
}
