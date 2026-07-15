package s3

import (
	"fmt"
	"net"
	"net/url"
	"strings"
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
// credentials would be transmitted in cleartext. HTTP is permitted for in-cluster
// endpoints (*.svc.cluster.local) since traffic stays within the cluster network.
// All hostnames — including in-cluster — are resolved and checked against blocked
// IP ranges to guard against ExternalName service CNAME bypasses.
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

	ip := net.ParseIP(hostname)
	if ip != nil {
		if err := validateIPAddress(ip); err != nil {
			return "", err
		}
	} else {
		ips, err := net.LookupIP(hostname)
		if err != nil {
			if p.cfg.AllowUnresolvableEndpoint {
				// SECURITY: Bypassing DNS resolution weakens SSRF protection and
				// introduces TOCTOU risk. Only acceptable in development/testing.
				return parsedURL.String(), nil
			}
			return "", fmt.Errorf("endpoint hostname %q cannot be resolved: %w", hostname, err)
		}
		for _, resolvedIP := range ips {
			if err := validateIPAddress(resolvedIP); err != nil {
				return "", fmt.Errorf("endpoint hostname %q resolves to blocked IP %s: %w", hostname, resolvedIP, err)
			}
		}
	}

	return parsedURL.String(), nil
}

// isInternalHost reports whether hostname is a Kubernetes in-cluster service FQDN.
// These legitimately use HTTP internally and resolve to private IPs, so HTTP scheme
// and SSRF IP validation is relaxed for them.
// Requires exactly <service>.<namespace>.svc.cluster.local (5 dot-separated labels),
// preventing overly-broad matches like "evil.cluster.local".
func isInternalHost(hostname string) bool {
	parts := strings.Split(hostname, ".")
	if len(parts) != 5 {
		return false
	}
	if parts[2] != "svc" || parts[3] != "cluster" || parts[4] != "local" {
		return false
	}
	return parts[0] != "" && parts[1] != ""
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
