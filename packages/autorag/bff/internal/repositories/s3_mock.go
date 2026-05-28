package repositories

import (
	"context"
	"io"

	cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
	cores3mocks "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3/mocks"
)

// MockS3Repository implements S3RepositoryInterface for testing.
type MockS3Repository struct {
	client cores3mocks.MockS3Client
}

func NewMockS3Repository() S3RepositoryInterface {
	return &MockS3Repository{}
}

func (m *MockS3Repository) GetObject(ctx context.Context, req S3RequestContext, key string) (io.ReadCloser, string, error) {
	return m.client.DownloadObject(ctx, cores3.S3ConnectionOptions{}, cores3.DownloadObjectInput{Bucket: "mock-bucket", Key: key})
}

func (m *MockS3Repository) UploadFile(_ context.Context, _ S3RequestContext, key string, body io.Reader, contentType string, _ int) (string, error) {
	return key, m.client.UploadObject(context.Background(), cores3.S3ConnectionOptions{}, cores3.UploadObjectInput{
		Bucket:      "mock-bucket",
		Key:         key,
		Body:        body,
		ContentType: contentType,
	})
}

func (m *MockS3Repository) ListObjects(ctx context.Context, req S3RequestContext, options cores3.ListObjectsOptions) (*cores3.S3ListObjectsResponse, error) {
	return m.client.ListObjects(ctx, cores3.S3ConnectionOptions{}, cores3.ListObjectsInput{
		Bucket:    "mock-bucket",
		Prefix:    options.Search,
		Delimiter: "/",
		Limit:     options.Limit,
	})
}

func (m *MockS3Repository) ObjectExists(ctx context.Context, req S3RequestContext, key string) (bool, error) {
	return m.client.ObjectExists(ctx, cores3.S3ConnectionOptions{}, cores3.ObjectExistsInput{Bucket: "mock-bucket", Key: key})
}

// Compile-time check.
var _ S3RepositoryInterface = (*MockS3Repository)(nil)
