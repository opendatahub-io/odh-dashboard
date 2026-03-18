package s3

// S3ClientFactory creates S3 clients from credentials.
type S3ClientFactory interface {
	CreateClient(creds *S3Credentials) (S3ClientInterface, error)
}

// RealClientFactory creates real AWS SDK-based S3 clients.
type RealClientFactory struct{}

// NewRealClientFactory creates a new real client factory.
func NewRealClientFactory() *RealClientFactory {
	return &RealClientFactory{}
}

// CreateClient creates a new S3 client with the given credentials.
func (f *RealClientFactory) CreateClient(creds *S3Credentials) (S3ClientInterface, error) {
	return NewRealS3Client(creds)
}
