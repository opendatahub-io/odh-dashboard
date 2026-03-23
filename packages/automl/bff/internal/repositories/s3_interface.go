package repositories

import (
	"context"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// S3RepositoryInterface defines the contract for S3 credential extraction from Kubernetes secrets.
type S3RepositoryInterface interface {
	GetS3Credentials(
		ctx context.Context,
		client k8s.KubernetesClientInterface,
		namespace string,
		secretName string,
		identity *k8s.RequestIdentity,
	) (*S3Credentials, error)

	GetS3CredentialsFromDSPA(
		ctx context.Context,
		client k8s.KubernetesClientInterface,
		namespace string,
		dspaStorage *models.DSPAObjectStorage,
		identity *k8s.RequestIdentity,
	) (*S3Credentials, error)
}
