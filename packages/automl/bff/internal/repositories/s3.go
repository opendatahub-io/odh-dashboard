package repositories

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	s3int "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// secretKeyEntry stores an original-case key and its value from secret data.
type secretKeyEntry struct {
	originalKey string
	value       string
}

// newSecretLookup builds a deterministic, case-insensitive lookup function from
// Kubernetes secret data. The returned function:
//  1. Prefers an exact-case match if present.
//  2. Falls back to a single case-insensitive variant.
//  3. Returns an error if multiple case-variants collide (non-deterministic).
func newSecretLookup(secretData map[string][]byte) func(targetKeys ...string) (string, error) {
	// Build a normalized map: lowercased key → all original-case entries.
	normalized := make(map[string][]secretKeyEntry, len(secretData))
	for k, v := range secretData {
		lower := strings.ToLower(k)
		normalized[lower] = append(normalized[lower], secretKeyEntry{originalKey: k, value: string(v)})
	}

	return func(targetKeys ...string) (string, error) {
		for _, targetKey := range targetKeys {
			// 1. Prefer exact-case match.
			if val, ok := secretData[targetKey]; ok {
				return string(val), nil
			}

			// 2. Case-insensitive fallback.
			lower := strings.ToLower(targetKey)
			entries, ok := normalized[lower]
			if !ok || len(entries) == 0 {
				continue
			}

			// 3. Exactly one case-variant → return it.
			if len(entries) == 1 {
				return entries[0].value, nil
			}

			// 4. Multiple case-variants → ambiguous, return error.
			keys := make([]string, len(entries))
			for i, e := range entries {
				keys[i] = e.originalKey
			}
			slices.Sort(keys)
			return "", fmt.Errorf("%w %q: multiple case-variants found: %v", ErrAmbiguousSecretKey, targetKey, keys)
		}
		return "", nil
	}
}

// S3Credentials is a type alias for the s3 integration package's credentials type,
// re-exported so callers in the repositories package don't need an extra import.
type S3Credentials = s3int.S3Credentials

var ErrAmbiguousSecretKey = errors.New("ambiguous secret key")

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

	// Case-insensitive credential extraction with deterministic collision detection.
	// More lenient than the case-sensitive classification in secret.go to maximize
	// compatibility with existing secrets.
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
	endpointURL, err := getValue("AWS_S3_ENDPOINT")
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

	// Case-insensitive credential extraction with deterministic collision detection.
	// More lenient than the case-sensitive classification in secret.go to maximize
	// compatibility with existing secrets.
	getValue := newSecretLookup(secret.Data)

	accessKeyID, err := getValue(dspaStorage.AccessKeyField)
	if err != nil {
		return nil, fmt.Errorf("secret '%s': %w", dspaStorage.SecretName, err)
	}
	if accessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: %s",
			dspaStorage.SecretName, dspaStorage.AccessKeyField)
	}

	secretAccessKey, err := getValue(dspaStorage.SecretKeyField)
	if err != nil {
		return nil, fmt.Errorf("secret '%s': %w", dspaStorage.SecretName, err)
	}
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
