package repositories

import (
	"context"
	"fmt"
	"net"
	"net/url"

	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// resolveOGXCredentials fetches the named secret from Kubernetes and extracts the OGX
// base URL and API key using case-insensitive key lookups.
// Returns (baseURL, apiKey, error). When the factory is in mock mode the caller can
// pass empty strings back to CreateClient — so this function always does a real secret
// lookup; mock switching is handled at the factory level.
func resolveOGXCredentials(ctx context.Context, k8sService *corek8s.K8sService, namespace, secretName string) (string, string, error) {
	secret, err := k8sService.GetSecret(ctx, namespace, secretName)
	if err != nil {
		return "", "", fmt.Errorf("failed to get secret %q: %w", secretName, err)
	}
	if secret == nil {
		return "", "", fmt.Errorf("secret %q not found in namespace %q", secretName, namespace)
	}

	baseURL, err := corek8s.LookupSecretValue(secret.Data, "ogx_client_base_url")
	if err != nil {
		return "", "", fmt.Errorf("invalid secret %q: %w", secretName, err)
	}
	if baseURL == "" {
		return "", "", fmt.Errorf("secret %q is missing or has empty value for required key: ogx_client_base_url", secretName)
	}

	apiKey, err := corek8s.LookupSecretValue(secret.Data, "ogx_client_api_key")
	if err != nil {
		return "", "", fmt.Errorf("invalid secret %q: %w", secretName, err)
	}
	// apiKey may be empty string — only the key presence is required (checked via LookupSecretValue returning no error).
	// If LookupSecretValue returns ("", nil) the key is absent; we must distinguish absent from present-but-empty.
	if _, keyPresent := secret.Data["ogx_client_api_key"]; !keyPresent {
		// Case-insensitive fallback: check if any case variant exists
		if apiKey == "" {
			// key not found by any variant — reject
			return "", "", fmt.Errorf("secret %q is missing required key: ogx_client_api_key", secretName)
		}
	}

	if err := isValidOGXURL(baseURL); err != nil {
		return "", "", fmt.Errorf("invalid ogx_client_base_url in secret %q: %w", secretName, err)
	}

	return baseURL, apiKey, nil
}

// validateOGXIP checks an IP address against the SSRF blocklist.
// Loopback (127.x, ::1), link-local (169.254.x — cloud metadata), and unspecified (0.0.0.0) are blocked.
// Private ranges (10.x, 172.16.x, 192.168.x) are intentionally allowed for cluster-internal services.
func validateOGXIP(ip net.IP) error {
	if ip.IsLoopback() {
		return fmt.Errorf("loopback addresses are not allowed")
	}
	if ip.IsLinkLocalUnicast() {
		return fmt.Errorf("link-local addresses are not allowed")
	}
	if ip.IsUnspecified() {
		return fmt.Errorf("unspecified addresses are not allowed")
	}
	return nil
}

// isValidOGXURL validates a URL extracted from a Kubernetes secret to prevent SSRF attacks.
// Only http and https schemes are allowed. For IP literals, the IP is checked directly.
// For DNS hostnames, all resolved A/AAAA records are validated against the same blocklist.
// Private IP ranges (10.x, 172.16.x, 192.168.x) are intentionally allowed because OGX
// services typically run as cluster-internal services with private IPs.
func isValidOGXURL(rawURL string) error {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return fmt.Errorf("invalid URL scheme %q: only http and https are allowed", parsedURL.Scheme)
	}

	host := parsedURL.Hostname()
	if host == "" {
		return fmt.Errorf("URL must contain a host")
	}

	// Check IP literals directly
	if ip := net.ParseIP(host); ip != nil {
		return validateOGXIP(ip)
	}

	// Resolve DNS hostnames and validate all resulting IPs.
	// If DNS resolution fails, allow it through — the hostname may only be resolvable
	// inside the cluster (e.g., svc.cluster.local). The HTTP client will fail with a
	// connection error later, which is handled as a 502 Bad Gateway.
	ips, err := net.LookupIP(host)
	if err == nil {
		for _, ip := range ips {
			if err := validateOGXIP(ip); err != nil {
				return fmt.Errorf("hostname %q resolves to blocked address: %w", host, err)
			}
		}
	}

	return nil
}
