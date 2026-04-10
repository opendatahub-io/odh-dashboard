package repositories

import (
	"context"
	"fmt"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// MockS3Repository is a mock implementation of S3RepositoryInterface for testing.
// It still performs real Kubernetes secret lookups (via the injected mock K8s client)
// but skips SSRF endpoint validation, allowing test fixtures to use local endpoints.
type MockS3Repository struct{}

func NewMockS3Repository() S3RepositoryInterface {
	return &MockS3Repository{}
}

func (r *MockS3Repository) GetS3Credentials(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	secretName string,
	identity *k8s.RequestIdentity,
) (*S3Credentials, error) {
	secret, err := client.GetSecret(ctx, namespace, secretName, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secret '%s' from namespace %s: %w", secretName, namespace, err)
	}

	getValue := newSecretLookup(secret.Data)

	accessKeyID, err := getValue("AWS_ACCESS_KEY_ID")
	if err != nil {
		return nil, fmt.Errorf("secret '%s': %w", secretName, err)
	}
	secretAccessKey, err := getValue("AWS_SECRET_ACCESS_KEY")
	if err != nil {
		return nil, fmt.Errorf("secret '%s': %w", secretName, err)
	}
	region, err := getValue("AWS_DEFAULT_REGION")
	if err != nil {
		return nil, fmt.Errorf("secret '%s': %w", secretName, err)
	}
	endpointURL, err := getValue("AWS_S3_ENDPOINT") // not validated — mock only
	if err != nil {
		return nil, fmt.Errorf("secret '%s': %w", secretName, err)
	}
	bucket, err := getValue("AWS_S3_BUCKET")
	if err != nil {
		return nil, fmt.Errorf("secret '%s': %w", secretName, err)
	}

	creds := &S3Credentials{
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
		Region:          region,
		EndpointURL:     endpointURL,
		Bucket:          bucket,
	}

	if creds.AccessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_ACCESS_KEY_ID", secretName)
	}
	if creds.SecretAccessKey == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_SECRET_ACCESS_KEY", secretName)
	}
	if creds.Region == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_DEFAULT_REGION", secretName)
	}
	if creds.EndpointURL == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_S3_ENDPOINT", secretName)
	}

	return creds, nil
}

func (r *MockS3Repository) GetS3CredentialsFromDSPA(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	dspaStorage *models.DSPAObjectStorage,
	identity *k8s.RequestIdentity,
) (*S3Credentials, error) {
	if dspaStorage == nil {
		return nil, fmt.Errorf("dspaStorage must not be nil")
	}
	if dspaStorage.SecretName == "" {
		return nil, fmt.Errorf("DSPA spec missing secret name: SecretName is required")
	}
	if dspaStorage.EndpointURL == "" {
		return nil, fmt.Errorf("DSPA spec missing a valid endpoint (scheme + host are required)")
	}

	secret, err := client.GetSecret(ctx, namespace, dspaStorage.SecretName, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secret '%s' from namespace %s: %w", dspaStorage.SecretName, namespace, err)
	}

	getValue := newSecretLookup(secret.Data)

	accessKeyID, err := getValue(dspaStorage.AccessKeyField)
	if err != nil {
		return nil, fmt.Errorf("secret '%s': %w", dspaStorage.SecretName, err)
	}
	if accessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: %s", dspaStorage.SecretName, dspaStorage.AccessKeyField)
	}
	secretAccessKey, err := getValue(dspaStorage.SecretKeyField)
	if err != nil {
		return nil, fmt.Errorf("secret '%s': %w", dspaStorage.SecretName, err)
	}
	if secretAccessKey == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: %s", dspaStorage.SecretName, dspaStorage.SecretKeyField)
	}

	region := dspaStorage.Region
	if region == "" {
		region = "us-east-1"
	}

	return &S3Credentials{
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
		EndpointURL:     dspaStorage.EndpointURL,
		Bucket:          dspaStorage.Bucket,
		Region:          region,
	}, nil
}
