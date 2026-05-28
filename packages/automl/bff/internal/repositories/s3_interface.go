package repositories

import (
	"context"
	"io"

	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"
	cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// S3RepositoryInterface defines the contract for S3 operations.
// All methods accept an S3RequestContext that encodes which credential source to use
// (explicit secret or DSPA auto-discovery) and the caller-supplied bucket hint.
// Credential resolution and bucket selection are handled internally.
type S3RepositoryInterface interface {
	GetObject(ctx context.Context, req S3RequestContext, key string) (io.ReadCloser, string, error)
	UploadObject(ctx context.Context, req S3RequestContext, key string, body io.Reader, contentType string) error
	UploadCSVFile(ctx context.Context, req S3RequestContext, key string, body io.Reader, rawContentType, filename string, maxAttempts int) (string, error)
	ListObjects(ctx context.Context, req S3RequestContext, options cores3.ListObjectsOptions) (*cores3.S3ListObjectsResponse, error)
	ObjectExists(ctx context.Context, req S3RequestContext, key string) (bool, error)
	GetCSVSchema(ctx context.Context, req S3RequestContext, key string) (helper.CSVSchemaResult, error)
}

// Compile-time check.
var _ S3RepositoryInterface = (*S3Repository)(nil)
