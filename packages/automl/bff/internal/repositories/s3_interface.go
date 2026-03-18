package repositories

import (
	"context"
	"io"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
)

// S3RepositoryInterface defines the contract for S3 repository operations
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
	GetS3Object(
		ctx context.Context,
		creds *S3Credentials,
		bucket string,
		key string,
	) (io.Reader, string, error)

	// GetS3CSVSchema retrieves the schema of a CSV file from S3 with inferred column types
	GetS3CSVSchema(
		ctx context.Context,
		creds *S3Credentials,
		bucket string,
		key string,
	) (CSVSchemaResult, error)
}
