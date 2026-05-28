package repositories

import (
	"context"
	"io"
	"strings"

	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"
	cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
	cores3mocks "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3/mocks"
)

// MockS3Repository implements S3RepositoryInterface for testing.
// It skips credential resolution and delegates S3 operations to MockS3Client.
type MockS3Repository struct {
	client cores3mocks.MockS3Client
}

func NewMockS3Repository() S3RepositoryInterface {
	return &MockS3Repository{}
}

func (m *MockS3Repository) GetObject(ctx context.Context, req S3RequestContext, key string) (io.ReadCloser, string, error) {
	return m.client.DownloadObject(ctx, cores3.S3ConnectionOptions{}, cores3.DownloadObjectInput{Bucket: "mock-bucket", Key: key})
}

func (m *MockS3Repository) UploadObject(ctx context.Context, req S3RequestContext, key string, body io.Reader, contentType string) error {
	return m.client.UploadObject(ctx, cores3.S3ConnectionOptions{}, cores3.UploadObjectInput{Bucket: "mock-bucket", Key: key, Body: body, ContentType: contentType})
}

func (m *MockS3Repository) ListObjects(ctx context.Context, req S3RequestContext, options cores3.ListObjectsOptions) (*cores3.S3ListObjectsResponse, error) {
	return m.client.ListObjects(ctx, cores3.S3ConnectionOptions{}, cores3.ListObjectsInput{Bucket: "mock-bucket", Prefix: options.Search, Delimiter: "/", Limit: options.Limit, ContinuationToken: options.Next})
}

func (m *MockS3Repository) ObjectExists(ctx context.Context, req S3RequestContext, key string) (bool, error) {
	return m.client.ObjectExists(ctx, cores3.S3ConnectionOptions{}, cores3.ObjectExistsInput{Bucket: "mock-bucket", Key: key})
}

func (m *MockS3Repository) UploadCSVFile(_ context.Context, _ S3RequestContext, key string, body io.Reader, rawContentType, filename string, _ int) (string, error) {
	if _, err := ValidateCsvUpload(rawContentType, filename); err != nil {
		return "", err
	}
	if err := m.client.UploadObject(context.Background(), cores3.S3ConnectionOptions{}, cores3.UploadObjectInput{Bucket: "mock-bucket", Key: key, Body: body, ContentType: "text/csv"}); err != nil {
		return "", err
	}
	return key, nil
}

func (m *MockS3Repository) GetCSVSchema(ctx context.Context, req S3RequestContext, key string) (helper.CSVSchemaResult, error) {
	if !strings.HasSuffix(strings.ToLower(key), ".csv") {
		return helper.CSVSchemaResult{}, nil
	}
	return helper.CSVSchemaResult{
		Columns: []helper.ColumnSchema{
			{Name: "id", Type: "integer", TaskType: "regression"},
			{Name: "value", Type: "double", TaskType: "regression"},
			{Name: "label", Type: "string", TaskType: "multiclass"},
		},
	}, nil
}

// Compile-time check.
var _ S3RepositoryInterface = (*MockS3Repository)(nil)
