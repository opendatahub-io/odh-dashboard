package s3

import (
	"log/slog"
	"os"
)

// S3ClientFactory creates S3 clients from credentials.
type S3ClientFactory interface {
	CreateClient(creds *S3Credentials) (S3ClientInterface, error)
}

const (
	DefaultTransferConcurrency      = 3
	DefaultTransferPartSizeBytes    = 8 * 1024 * 1024 // 8 MB
	DefaultTransferGetObjectBufSize = 256 * 1024      // 256 KB
	DefaultTransferPartMaxRetries   = 3
)

// S3ClientOptions holds configuration for S3 client behavior.
type S3ClientOptions struct {
	DevMode bool // Controls whether ALLOW_UNRESOLVED_S3_ENDPOINTS is honoured

	// InsecureSkipVerify skips TLS certificate verification for S3 endpoints.
	// Required for MinIO or other S3-compatible stores using self-signed certificates.
	// Controlled via S3_INSECURE_SKIP_VERIFY env var (default: true).
	InsecureSkipVerify bool

	// AllowInternalIPs permits connections to RFC-1918 private IP ranges
	// (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) and IPv6 unique local addresses.
	// Required when the S3-compatible store (e.g. MinIO) runs on the same cluster.
	// Controlled via S3_ALLOW_INTERNAL_IPS env var (default: true).
	AllowInternalIPs bool

	// AllowHTTP permits plain HTTP (non-TLS) S3 endpoint URLs.
	// Some MinIO deployments use HTTP internally within the cluster.
	// Controlled via S3_ALLOW_HTTP env var (default: true).
	AllowHTTP bool

	// Transfer manager tuning for GetObject. Zero values fall back to defaults.
	Concurrency        int
	PartSizeBytes      int64
	GetObjectBufSize   int64
	PartBodyMaxRetries int
}

func (o S3ClientOptions) withDefaults() S3ClientOptions {
	if o.Concurrency == 0 {
		o.Concurrency = DefaultTransferConcurrency
	}
	if o.PartSizeBytes == 0 {
		o.PartSizeBytes = DefaultTransferPartSizeBytes
	}
	if o.GetObjectBufSize == 0 {
		o.GetObjectBufSize = DefaultTransferGetObjectBufSize
	}
	if o.PartBodyMaxRetries == 0 {
		o.PartBodyMaxRetries = DefaultTransferPartMaxRetries
	}
	return o
}

// RealClientFactory creates real AWS SDK-based S3 clients.
type RealClientFactory struct {
	options S3ClientOptions
}

// NewRealClientFactory creates a factory.  Exits immediately if
// ALLOW_UNRESOLVED_S3_ENDPOINTS is set outside dev mode to prevent
// weakening SSRF protections in production.
func NewRealClientFactory(opts S3ClientOptions) *RealClientFactory {
	if !opts.DevMode && os.Getenv("ALLOW_UNRESOLVED_S3_ENDPOINTS") == "true" {
		slog.Error("ALLOW_UNRESOLVED_S3_ENDPOINTS is enabled but not in development mode",
			"error", "This environment variable bypasses critical SSRF protections and must not be used in production. "+
				"To use this variable for local testing, set -dev-mode flag.")
		os.Exit(1)
	}
	return &RealClientFactory{options: opts}
}

// CreateClient creates a new S3 client with the given credentials.
func (f *RealClientFactory) CreateClient(creds *S3Credentials) (S3ClientInterface, error) {
	return NewRealS3Client(creds, f.options)
}
