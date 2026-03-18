package repositories

import (
	"context"
	"io"

	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
)

// S3RepositoryInterface defines the interface for S3 repository operations.
// This interface allows for dependency injection and mocking in tests.
type S3RepositoryInterface interface {
	// GetS3Credentials retrieves S3 credentials from a Kubernetes secret
	GetS3Credentials(
		ctx context.Context,
		client k8s.KubernetesClientInterface,
		namespace string,
		secretName string,
		identity *k8s.RequestIdentity,
	) (*S3Credentials, error)

	// GetS3Object retrieves an object from S3 and returns a reader for the content
	// along with the content type. Uses transfer manager for optimized downloads.
	GetS3Object(
		ctx context.Context,
		creds *S3Credentials,
		bucket string,
		key string,
	) (io.Reader, string, error)

	// UploadS3Object uploads an object to S3 using the transfer manager (same client/endpoint config as GetS3Object).
	// Body is read until EOF and uploaded to the given bucket and key. contentType is optional (defaults to application/octet-stream).
	UploadS3Object(
		ctx context.Context,
		creds *S3Credentials,
		bucket string,
		key string,
		body io.Reader,
		contentType string,
	) error
}
