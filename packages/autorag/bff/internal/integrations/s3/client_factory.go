package s3

// S3ClientFactory creates S3 clients from credentials.
type S3ClientFactory interface {
	CreateClient(creds *S3Credentials) (S3ClientInterface, error)
}

// S3ClientOptions holds configuration for S3 client behavior.
type S3ClientOptions struct {
	DevMode bool // Controls whether ALLOW_UNRESOLVED_S3_ENDPOINTS is honored during endpoint validation
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
