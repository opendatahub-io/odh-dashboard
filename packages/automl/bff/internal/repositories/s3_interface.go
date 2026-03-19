package repositories

import (
	"context"
	"io"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
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

	// GetS3CredentialsFromDSPA retrieves S3 credentials using the field names and
	// endpoint coordinates from a DSPipelineApplication spec, rather than the
	// conventional AWS_* field names.
	GetS3CredentialsFromDSPA(
		ctx context.Context,
		client k8s.KubernetesClientInterface,
		namespace string,
		dspaStorage *models.DSPAObjectStorage,
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
