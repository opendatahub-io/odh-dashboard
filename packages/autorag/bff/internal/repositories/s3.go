package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"

	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	s3client "github.com/opendatahub-io/autorag-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// S3Credentials is a type alias for the s3 client package's S3Credentials,
// re-exported so the interface can reference it without a package qualifier.
type S3Credentials = s3client.S3Credentials

var ErrMissingRequiredField = errors.New("missing required field")

type S3Repository struct{}

func NewS3Repository() *S3Repository {
	return &S3Repository{}
}

// GetS3Credentials retrieves S3 credentials from a Kubernetes secret
func (r *S3Repository) GetS3Credentials(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	secretName string,
	identity *k8s.RequestIdentity,
) (*s3client.S3Credentials, error) {
	// Fetch the specific secret
	secret, err := client.GetSecret(ctx, namespace, secretName, identity)
	if err != nil {
		return nil, err
	}

	// Extract S3 credentials from secret data (case-insensitive key matching)
	creds := &s3client.S3Credentials{}
	secretData := secret.Data

	// TODO [ PR-Feedback: AI ] R1 - Gustavo + Daniel:
	//   Replace O(n*m) closure with a pre-built normalized map.
	//   Current approach iterates all secret keys for each lookup and has non-deterministic
	//   behavior with duplicate keys. Simpler and faster:
	//     normalizedData := make(map[string]string, len(secretData))
	//     for k, v := range secretData { normalizedData[strings.ToLower(k)] = string(v) }
	//     getValue := func(key string) string { return normalizedData[strings.ToLower(key)] }
	// Helper to get value from secret data case-insensitively
	getValue := func(targetKeys ...string) string {
		// Check all keys in the secret against the target keys (case-insensitive)
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

	creds.AccessKeyID = getValue("AWS_ACCESS_KEY_ID")
	creds.SecretAccessKey = getValue("AWS_SECRET_ACCESS_KEY")
	creds.Region = getValue("AWS_DEFAULT_REGION")
	creds.EndpointURL = getValue("AWS_S3_ENDPOINT")
	creds.Bucket = getValue("AWS_S3_BUCKET") // Optional bucket name

	// Validate that all required fields are present
	if creds.AccessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' %w: AWS_ACCESS_KEY_ID", secretName, ErrMissingRequiredField)
	}
	if creds.SecretAccessKey == "" {
		return nil, fmt.Errorf("secret '%s' %w: AWS_SECRET_ACCESS_KEY", secretName, ErrMissingRequiredField)
	}
	if creds.Region == "" {
		return nil, fmt.Errorf("secret '%s' %w: AWS_DEFAULT_REGION", secretName, ErrMissingRequiredField)
	}
	if creds.EndpointURL == "" {
		return nil, fmt.Errorf("secret '%s' %w: AWS_S3_ENDPOINT", secretName, ErrMissingRequiredField)
	}

	return creds, nil
}

// GetS3CredentialsFromDSPA retrieves S3 credentials from the Kubernetes secret referenced by
// a DSPAObjectStorage config, using the field names the DSPA spec specifies rather than the
// conventional AWS_* names. The endpoint URL, bucket, and region come from the DSPA spec
// and are carried in the dspaStorage struct — they are not expected to be in the secret.
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
		region = "us-east-1" // MinIO and other compatible stores ignore region; SDK requires a value
	}

	return &S3Credentials{
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
		EndpointURL:     dspaStorage.EndpointURL,
		Bucket:          dspaStorage.Bucket,
		Region:          region,
	}, nil
}
