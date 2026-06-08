// Package ssrf provides URL and hostname validation to prevent Server-Side Request Forgery attacks.
package ssrf

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"time"
)

// ErrSSRFBlocked is returned when a request is blocked by SSRF validation.
var ErrSSRFBlocked = errors.New("ssrf: request blocked")

var privateRanges = func() []*net.IPNet {
	// RFC 1918 (IPv4) + RFC 4193 (IPv6 unique-local)
	cidrs := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"fc00::/7",
	}
	nets := make([]*net.IPNet, len(cidrs))
	for i, cidr := range cidrs {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			panic(fmt.Sprintf("invalid CIDR %q: %v", cidr, err))
		}
		nets[i] = network
	}
	return nets
}()

// IsPrivateIP reports whether ip falls within a loopback, link-local, unspecified, multicast, or private range.
func IsPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() || ip.IsMulticast() || ip.IsLinkLocalMulticast() {
		return true
	}
	for _, n := range privateRanges {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

// ValidateHostname resolves a hostname and checks that none of the resolved IPs
// are private addresses. This prevents DNS rebinding attacks.
func ValidateHostname(ctx context.Context, hostname string, logger *slog.Logger) error {
	ips, err := net.DefaultResolver.LookupIP(ctx, "ip", hostname)
	if err != nil {
		return fmt.Errorf("failed to resolve hostname %s: %w", hostname, err)
	}

	if len(ips) == 0 {
		return fmt.Errorf("hostname %s resolved to no IP addresses", hostname)
	}

	for _, ip := range ips {
		if IsPrivateIP(ip) {
			return fmt.Errorf("%w: %s resolves to private IP %s", ErrSSRFBlocked, hostname, ip.String())
		}
	}

	logger.Debug("SSRF validation passed", slog.String("hostname", hostname))
	return nil
}

// NewRedirectValidator returns a function suitable for use as an httputil.ReverseProxy
// ModifyResponse callback. It inspects 3xx responses and validates that the Location
// header does not point to a private IP address, preventing redirect-based SSRF.
func NewRedirectValidator(logger *slog.Logger) func(*http.Response) error {
	return func(resp *http.Response) error {
		if resp.StatusCode < 300 || resp.StatusCode >= 400 {
			return nil
		}
		location := resp.Header.Get("Location")
		if location == "" {
			return nil
		}
		parsed, err := url.Parse(location)
		if err != nil {
			return fmt.Errorf("redirect target has invalid URL: %w", err)
		}
		hostname := parsed.Hostname()
		if hostname == "" {
			return nil
		}
		return ValidateHostname(resp.Request.Context(), hostname, logger)
	}
}

func resolveHost(ctx context.Context, host string) ([]net.IPAddr, error) {
	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve %s: %w", host, err)
	}
	if len(ips) == 0 {
		return nil, fmt.Errorf("hostname %s resolved to no addresses", host)
	}
	return ips, nil
}

func validateResolvedIPs(host string, ips []net.IPAddr) error {
	for _, ip := range ips {
		if IsPrivateIP(ip.IP) {
			return fmt.Errorf("%w: %s resolves to private IP %s", ErrSSRFBlocked, host, ip.IP)
		}
	}
	return nil
}

// SafeDialContext returns a DialContext function that resolves the hostname once,
// validates that none of the resolved IPs are private, then connects directly to a
// validated IP. This eliminates the TOCTOU gap of resolve-then-connect and prevents
// DNS rebinding attacks.
//
// Hosts listed in allowedHosts bypass the private-IP check but still go through
// resolve-then-connect-by-IP, so they retain DNS-rebinding protection.
func SafeDialContext(logger *slog.Logger, allowedHosts ...string) func(ctx context.Context, network, addr string) (net.Conn, error) {
	allowed := make(map[string]bool, len(allowedHosts))
	for _, h := range allowedHosts {
		allowed[h] = true
	}

	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, fmt.Errorf("invalid address %q: %w", addr, err)
		}

		ips, err := resolveHost(ctx, host)
		if err != nil {
			return nil, err
		}

		if !allowed[host] {
			if err := validateResolvedIPs(host, ips); err != nil {
				return nil, err
			}
		}

		logger.Debug("SSRF dial validation passed", slog.String("host", host), slog.Int("resolved_ips", len(ips)))

		dialer := &net.Dialer{Timeout: 30 * time.Second}
		return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].IP.String(), port))
	}
}
