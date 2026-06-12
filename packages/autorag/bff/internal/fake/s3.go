package fake

import (
	"context"
	"io"
	"strings"

	s3svc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// S3Client is a fake implementation of s3.Client for local development and testing.
type S3Client struct{}

var _ s3svc.Client = (*S3Client)(nil)

func (c *S3Client) GetObject(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.GetObjectInput) (io.ReadCloser, string, error) {
	return io.NopCloser(strings.NewReader("")), "application/octet-stream", nil
}

func (c *S3Client) DownloadObject(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.DownloadObjectInput) (io.ReadCloser, string, error) {
	return io.NopCloser(strings.NewReader("")), "application/octet-stream", nil
}

func (c *S3Client) UploadObject(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.UploadObjectInput) error {
	return nil
}

func (c *S3Client) ListObjects(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.ListObjectsInput) (*s3svc.ListObjectsResponse, error) {
	return &s3svc.ListObjectsResponse{}, nil
}

func (c *S3Client) ObjectExists(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.ObjectExistsInput) (bool, error) {
	return false, nil
}
