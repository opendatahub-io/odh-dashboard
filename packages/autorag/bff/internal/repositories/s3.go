package repositories

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/url"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
)

// S3Credentials contains the credentials needed to connect to S3
type S3Credentials struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	EndpointURL     string
	Bucket          string // Optional bucket name from secret (AWS_S3_BUCKET)
}

type S3Repository struct{}

func NewS3Repository(devMode bool) *S3Repository {
	// Production guard: prevent ALLOW_UNRESOLVED_S3_ENDPOINTS from being enabled in production
	// This environment variable weakens SSRF protections by allowing DNS resolution failures to "fail open"
	if !devMode && os.Getenv("ALLOW_UNRESOLVED_S3_ENDPOINTS") == "true" {
		slog.Error("ALLOW_UNRESOLVED_S3_ENDPOINTS is enabled but not in development mode",
			"error", "This environment variable bypasses critical SSRF protections and must not be used in production. "+
				"To use this variable for local testing, set -dev-mode flag.")
		os.Exit(1)
	}
	return &S3Repository{}
}

// validateAndNormalizeEndpoint validates the S3 endpoint URL to prevent SSRF attacks.
// It ensures the URL uses HTTPS, is properly formatted, and does not target private IP ranges.
// Returns the normalized URL string or an error if validation fails.
func validateAndNormalizeEndpoint(endpoint string) (string, error) {
	if endpoint == "" {
		return "", fmt.Errorf("endpoint URL cannot be empty")
	}

	// Parse the URL
	parsedURL, err := url.Parse(endpoint)
	if err != nil {
		return "", fmt.Errorf("invalid endpoint URL format: %w", err)
	}

	// Ensure scheme is HTTPS
	if parsedURL.Scheme != "https" {
		return "", fmt.Errorf("endpoint URL must use HTTPS scheme, got: %s", parsedURL.Scheme)
	}

	// Extract hostname (may be hostname or IP)
	hostname := parsedURL.Hostname()
	if hostname == "" {
		return "", fmt.Errorf("endpoint URL must have a valid hostname")
	}

	// Check if the hostname is an IP address
	ip := net.ParseIP(hostname)
	if ip != nil {
		// Direct IP address - validate it
		if err := validateIPAddress(ip); err != nil {
			return "", err
		}
	} else {
		// Hostname - resolve it and validate all IPs
		ips, err := net.LookupIP(hostname)
		if err != nil {
			// Check if permissive mode is enabled for unresolvable hostnames
			allowUnresolved := os.Getenv("ALLOW_UNRESOLVED_S3_ENDPOINTS") == "true"

			if allowUnresolved {
				// Non-production/testing mode: allow with warning
				slog.Warn("Unable to resolve S3 endpoint hostname, allowing it to proceed (ALLOW_UNRESOLVED_S3_ENDPOINTS=true)",
					"hostname", hostname,
					"error", err.Error())
			} else {
				// Production mode: treat DNS resolution failure as a security error
				return "", fmt.Errorf("endpoint hostname '%s' cannot be resolved: %w (this may indicate a DNS rebinding attempt or misconfiguration)", hostname, err)
			}
		} else {
			// Validate all resolved IPs
			for _, resolvedIP := range ips {
				if err := validateIPAddress(resolvedIP); err != nil {
					return "", fmt.Errorf("endpoint hostname '%s' resolves to blocked IP %s: %w", hostname, resolvedIP, err)
				}
			}
		}
	}

	// Return the normalized URL string
	return parsedURL.String(), nil
}

// validateIPAddress checks if an IP address is in a blocked range (private or link-local).
// Returns an error if the IP is blocked, nil otherwise.
func validateIPAddress(ip net.IP) error {
	// Define blocked IP ranges
	blockedRanges := []struct {
		cidr        string
		description string
	}{
		{"0.0.0.0/8", "reserved 'this network' range (RFC 1122)"},
		{"10.0.0.0/8", "RFC-1918 private range (10.0.0.0/8)"},
		{"172.16.0.0/12", "RFC-1918 private range (172.16.0.0/12)"},
		{"192.168.0.0/16", "RFC-1918 private range (192.168.0.0/16)"},
		{"169.254.0.0/16", "link-local range (169.254.0.0/16)"},
		{"127.0.0.0/8", "loopback range (127.0.0.0/8)"},
		{"240.0.0.0/4", "reserved for future use (RFC 1112)"},
		{"::1/128", "IPv6 loopback"},
		{"fe80::/10", "IPv6 link-local"},
		{"fc00::/7", "IPv6 unique local addresses"},
	}

	for _, blocked := range blockedRanges {
		_, network, err := net.ParseCIDR(blocked.cidr)
		if err != nil {
			// Should never happen with hardcoded CIDRs, but handle gracefully
			slog.Error("Failed to parse blocked CIDR", "cidr", blocked.cidr, "error", err)
			continue
		}

		if network.Contains(ip) {
			return fmt.Errorf("endpoint IP %s is in blocked %s", ip, blocked.description)
		}
	}

	return nil
}

// GetS3Credentials retrieves S3 credentials from a Kubernetes secret
func (r *S3Repository) GetS3Credentials(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	secretName string,
	identity *k8s.RequestIdentity,
) (*S3Credentials, error) {
	// Fetch the specific secret
	secret, err := client.GetSecret(ctx, namespace, secretName, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secret '%s' from namespace %s: %w", secretName, namespace, err)
	}

	// Extract S3 credentials from secret data (case-insensitive key matching)
	creds := &S3Credentials{}
	secretData := secret.Data

	// Helper to get value from secret data case-insensitively
	getValue := func(targetKeys ...string) string {
		// Check all keys in the secret against the target keys (case-insensitive)
		for secretKey, secretValue := range secretData {
			secretKeyLower := strings.ToLower(secretKey)
			for _, targetKey := range targetKeys {
				if secretKeyLower == strings.ToLower(targetKey) {
					return string(secretValue)
				}
			}
		}
		return ""
	}

	creds.AccessKeyID = getValue("AWS_ACCESS_KEY_ID")
	creds.SecretAccessKey = getValue("AWS_SECRET_ACCESS_KEY")
	creds.Region = getValue("AWS_DEFAULT_REGION")
	rawEndpoint := getValue("AWS_S3_ENDPOINT")
	creds.Bucket = getValue("AWS_S3_BUCKET") // Optional bucket name

	// Validate that all required fields are present
	if creds.AccessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_ACCESS_KEY_ID", secretName)
	}
	if creds.SecretAccessKey == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_SECRET_ACCESS_KEY", secretName)
	}
	if creds.Region == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_DEFAULT_REGION", secretName)
	}
	if rawEndpoint == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_S3_ENDPOINT", secretName)
	}

	// Validate and normalize the endpoint URL to prevent SSRF attacks
	validatedEndpoint, err := validateAndNormalizeEndpoint(rawEndpoint)
	if err != nil {
		return nil, fmt.Errorf("secret '%s' has invalid AWS_S3_ENDPOINT: %w", secretName, err)
	}
	creds.EndpointURL = validatedEndpoint

	return creds, nil
}

// GetS3Object retrieves an object from S3 using transfer manager for optimized downloading
// and returns a reader for the content. Uses concurrent multipart downloads for large files.
func (r *S3Repository) GetS3Object(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) (io.Reader, string, error) {
	// Revalidate the endpoint on each request to ensure SSRF protection
	validatedEndpoint, err := validateAndNormalizeEndpoint(creds.EndpointURL)
	if err != nil {
		return nil, "", fmt.Errorf("endpoint validation failed: %w", err)
	}

	// Create AWS config with credentials
	cfg := aws.Config{
		Region:      creds.Region,
		Credentials: credentials.NewStaticCredentialsProvider(creds.AccessKeyID, creds.SecretAccessKey, ""),
	}

	// Create S3 client
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(validatedEndpoint)
		// Enable path-style addressing for S3-compatible services like MinIO
		o.UsePathStyle = true
	})

	// Create transfer manager for optimized downloads
	transferClient := transfermanager.New(s3Client)

	// Get the object using transfer manager
	// This automatically handles multipart downloads for large files with concurrency
	result, err := transferClient.GetObject(ctx, &transfermanager.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(o *transfermanager.Options) {
		// Configure for optimal streaming performance
		o.Concurrency = 10                  // 10 concurrent part downloads
		o.PartSizeBytes = 64 * 1024 * 1024  // 64MB parts for large files
		o.GetObjectBufferSize = 1024 * 1024 // 1MB buffer for streaming
		o.PartBodyMaxRetries = 3            // Retry failed parts up to 3 times
		o.DisableChecksumValidation = false // Enable checksum validation for data integrity
	})
	if err != nil {
		return nil, "", fmt.Errorf("error retrieving object from S3: %w", err)
	}

	// Get content type, default to application/octet-stream if not specified
	contentType := "application/octet-stream"
	if result.ContentType != nil {
		contentType = *result.ContentType
	}

	// Transfer manager's GetObject returns io.Reader; caller should type-assert to io.Closer if cleanup is needed
	return result.Body, contentType, nil
}
