package repositories

import (
	"context"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
)

// S3Credentials contains the credentials needed to connect to S3
type S3Credentials struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	EndpointURL     string
}

type S3Repository struct{}

func NewS3Repository() *S3Repository {
	return &S3Repository{}
}

// GetS3Credentials retrieves S3 credentials from a Kubernetes secret
func (r *S3Repository) GetS3Credentials(
	client k8s.KubernetesClientInterface,
	ctx context.Context,
	namespace string,
	secretName string,
	identity *k8s.RequestIdentity,
) (*S3Credentials, error) {
	// Fetch all secrets from the namespace
	secrets, err := client.GetSecrets(ctx, namespace, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secrets from namespace %s: %w", namespace, err)
	}

	// Find the secret by name
	var secret *corev1.Secret
	for i := range secrets {
		if secrets[i].Name == secretName {
			secret = &secrets[i]
			break
		}
	}

	if secret == nil {
		return nil, fmt.Errorf("secret '%s' not found in namespace '%s'", secretName, namespace)
	}

	// Extract S3 credentials from secret data (case-insensitive key matching)
	creds := &S3Credentials{}
	secretData := secret.Data

	// Helper to get value from secret data case-insensitively
	getValue := func(targetKeys ...string) string {
		// Check all keys in the secret against the target keys (case-insensitive)
		for secretKey, secretValue := range secretData {
			secretKeyLower := toLowerCase(secretKey)
			for _, targetKey := range targetKeys {
				if secretKeyLower == toLowerCase(targetKey) {
					return string(secretValue)
				}
			}
		}
		return ""
	}

	creds.AccessKeyID = getValue("aws_access_key_id", "AWS_ACCESS_KEY_ID")
	creds.SecretAccessKey = getValue("aws_secret_access_key", "AWS_SECRET_ACCESS_KEY")
	creds.Region = getValue("aws_region_name", "AWS_REGION_NAME", "aws_region", "AWS_REGION")
	creds.EndpointURL = getValue("endpoint_url", "ENDPOINT_URL")

	// Validate that all required fields are present
	if creds.AccessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: aws_access_key_id", secretName)
	}
	if creds.SecretAccessKey == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: aws_secret_access_key", secretName)
	}
	if creds.Region == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: aws_region_name", secretName)
	}
	if creds.EndpointURL == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: endpoint_url", secretName)
	}

	return creds, nil
}

// GetS3Object retrieves an object from S3 using transfer manager for optimized downloading
// and returns a reader for the content. Uses concurrent multipart downloads for large files.
func (r *S3Repository) GetS3Object(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) (io.ReadCloser, string, error) {
	// Create AWS config with credentials
	cfg := aws.Config{
		Region:      creds.Region,
		Credentials: credentials.NewStaticCredentialsProvider(creds.AccessKeyID, creds.SecretAccessKey, ""),
	}

	// Create S3 client
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(creds.EndpointURL)
		// Enable path-style addressing for S3-compatible services like MinIO
		o.UsePathStyle = true
	})

	// Create transfer manager for optimized downloads
	transferClient := transfermanager.New(s3Client)

	// Get the object using transfer manager
	// This automatically handles multipart downloads for large files with concurrency
	result, err := transferClient.GetObject(ctx, &transfermanager.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(o *transfermanager.Options) {
		// Configure for optimal streaming performance
		o.Concurrency = 10                  // 10 concurrent part downloads
		o.PartSizeBytes = 64 * 1024 * 1024  // 64MB parts for large files
		o.GetObjectBufferSize = 1024 * 1024 // 1MB buffer for streaming
		o.PartBodyMaxRetries = 3            // Retry failed parts up to 3 times
		o.DisableChecksumValidation = false // Enable checksum validation for data integrity
	})
	if err != nil {
		return nil, "", fmt.Errorf("error retrieving object from S3: %w", err)
	}

	// Get content type, default to application/octet-stream if not specified
	contentType := "application/octet-stream"
	if result.ContentType != nil {
		contentType = *result.ContentType
	}

	// Transfer manager's GetObject returns io.Reader, wrap it with NopCloser for io.ReadCloser
	return io.NopCloser(result.Body), contentType, nil
}

// Helper functions for case conversion
func toLowerCase(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			result[i] = c + ('a' - 'A')
		} else {
			result[i] = c
		}
	}
	return string(result)
}
