package repositories

import (
	"context"
	"fmt"
	"strings"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	s3int "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// S3Credentials is a type alias for the s3 integration package's credentials type,
// re-exported so callers in the repositories package don't need an extra import.
type S3Credentials = s3int.S3Credentials

type S3Repository struct{}

func NewS3Repository() *S3Repository {
	return &S3Repository{}
}

// GetS3Credentials retrieves S3 credentials from a Kubernetes secret using
// conventional AWS_* field names. Endpoint validation is deferred to client
// creation (NewRealS3Client) so that SSRF checks live in one place.
func (r *S3Repository) GetS3Credentials(
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

	secretData := secret.Data

	getValue := func(targetKeys ...string) string {
		for secretKey, secretValue := range secretData {
			secretKeyLower := strings.ToLower(secretKey)
			for _, targetKey := range targetKeys {
				if secretKeyLower == strings.ToLower(targetKey) {
					return string(secretValue)
				}
			}
		}
		return ""
	}

	creds := &S3Credentials{
		AccessKeyID:     getValue("AWS_ACCESS_KEY_ID"),
		SecretAccessKey: getValue("AWS_SECRET_ACCESS_KEY"),
		Region:          getValue("AWS_DEFAULT_REGION"),
		EndpointURL:     getValue("AWS_S3_ENDPOINT"),
		Bucket:          getValue("AWS_S3_BUCKET"),
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

// GetS3CredentialsFromDSPA retrieves S3 credentials from the Kubernetes secret
// referenced by a DSPAObjectStorage config, using the field names the DSPA spec
// specifies rather than the conventional AWS_* names. The endpoint URL, bucket,
// and region come from the DSPA spec and are not expected in the secret.
// Endpoint validation is deferred to client creation (NewRealS3Client).
func (r *S3Repository) GetS3CredentialsFromDSPA(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	dspaStorage *models.DSPAObjectStorage,
	identity *k8s.RequestIdentity,
) (*S3Credentials, error) {
	if dspaStorage.SecretName == "" {
		return nil, fmt.Errorf("DSPA spec missing secret name: SecretName is required")
	}
	if dspaStorage.EndpointURL == "" {
		return nil, fmt.Errorf("DSPA spec missing a valid endpoint (scheme + host are required)")
	}

	secret, err := client.GetSecret(ctx, namespace, dspaStorage.SecretName, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secret '%s' from namespace %s: %w",
			dspaStorage.SecretName, namespace, err)
	}

	getValue := func(targetKey string) string {
		targetLower := strings.ToLower(targetKey)
		for secretKey, secretValue := range secret.Data {
			if strings.ToLower(secretKey) == targetLower {
				return string(secretValue)
			}
		}
		return ""
	}

	accessKeyID := getValue(dspaStorage.AccessKeyField)
	if accessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: %s",
			dspaStorage.SecretName, dspaStorage.AccessKeyField)
	}

	secretAccessKey := getValue(dspaStorage.SecretKeyField)
	if secretAccessKey == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: %s",
			dspaStorage.SecretName, dspaStorage.SecretKeyField)
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
