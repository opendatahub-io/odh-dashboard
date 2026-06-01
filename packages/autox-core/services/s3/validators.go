package s3

import (
	"fmt"
	"net"
	"net/url"
	"strings"
)

// validateAndNormalizeEndpoint validates the S3 endpoint URL to prevent SSRF attacks.
//
// HTTPS is required for external endpoints. HTTP is permitted for in-cluster
// endpoints (*.svc.cluster.local) since traffic stays within the cluster network.
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

	// In-cluster endpoints skip DNS resolution and IP validation.
	if isInCluster {
		return parsedURL.String(), nil
	}

	ip := net.ParseIP(hostname)
	if ip != nil {
		if err := validateIPAddress(ip); err != nil {
			return "", err
		}
	} else {
		ips, err := net.LookupIP(hostname)
		if err != nil {
			if p.cfg.AllowUnresolvedEndpoint {
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
// Requires exactly <service>.<namespace>.svc.cluster.local (5 dot-separated labels).
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

// validateIPAddress blocks loopback, link-local, and reserved ranges.
// Private RFC-1918 ranges are permitted (MinIO runs on cluster service IPs).
func validateIPAddress(ip net.IP) error {
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
