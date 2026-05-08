package s3

import "crypto/x509"

// S3ClientFactory creates S3 clients from credentials.
type S3ClientFactory interface {
	CreateClient(creds *S3Credentials) (S3ClientInterface, error)
}

// Default transfer manager settings — conservative to avoid memory pressure
// when streaming S3 objects to HTTP responses.
const (
	DefaultTransferConcurrency      = 3
	DefaultTransferPartSizeBytes    = 8 * 1024 * 1024 // 8 MB
	DefaultTransferGetObjectBufSize = 256 * 1024      // 256 KB
	DefaultTransferPartMaxRetries   = 3
)

// S3ClientOptions holds configuration for S3 client behavior.
type S3ClientOptions struct {
	DevMode bool // Controls whether ALLOW_UNRESOLVED_S3_ENDPOINTS is honored during endpoint validation

	// RootCAs is the CA certificate pool used to verify S3 endpoint TLS certificates.
	// In production the RHOAI operator mounts cluster and custom CA bundles into the
	// pod (e.g. odh-trusted-ca-bundle, service-ca.crt) and passes them via
	// --bundle-paths. When non-nil this pool is used instead of the system default,
	// allowing connections to MinIO or other S3-compatible stores that use
	// self-signed or cluster-issued certificates without skipping verification.
	// When nil the system CA pool is used (suitable for public S3 endpoints).
	RootCAs *x509.CertPool

	// Transfer manager tuning for GetObject downloads.
	// Zero values fall back to the conservative defaults above.
	Concurrency        int   // Number of concurrent part downloads
	PartSizeBytes      int64 // Size of each download part in bytes
	GetObjectBufSize   int64 // Buffer size for streaming reads
	PartBodyMaxRetries int   // Max retries per failed part
}

// withDefaults returns a copy with zero-value fields replaced by defaults.
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

// NewRealClientFactory creates a new real client factory with the given options.
func NewRealClientFactory(opts S3ClientOptions) *RealClientFactory {
	return &RealClientFactory{options: opts}
}

// CreateClient creates a new S3 client with the given credentials.
func (f *RealClientFactory) CreateClient(creds *S3Credentials) (S3ClientInterface, error) {
	return NewRealS3Client(creds, f.options)
}
