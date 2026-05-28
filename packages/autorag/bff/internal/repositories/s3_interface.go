package repositories

import (
	"context"
	"io"

	cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// S3RepositoryInterface defines the contract for S3 operations.
type S3RepositoryInterface interface {
	GetObject(ctx context.Context, req S3RequestContext, key string) (io.ReadCloser, string, error)
	UploadFile(ctx context.Context, req S3RequestContext, key string, body io.Reader, contentType string, maxAttempts int) (string, error)
	ListObjects(ctx context.Context, req S3RequestContext, options cores3.ListObjectsOptions) (*cores3.S3ListObjectsResponse, error)
	ObjectExists(ctx context.Context, req S3RequestContext, key string) (bool, error)
}

// Compile-time check.
var _ S3RepositoryInterface = (*S3Repository)(nil)
