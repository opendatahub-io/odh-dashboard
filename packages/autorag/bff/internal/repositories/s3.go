package repositories

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
)

// S3Credentials contains the credentials needed to connect to S3
type S3Credentials struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	EndpointURL     string
	Bucket          string // Optional bucket name from secret (AWS_S3_BUCKET)
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
	// Fetch the specific secret
	secret, err := client.GetSecret(ctx, namespace, secretName, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secret '%s' from namespace %s: %w", secretName, namespace, err)
	}

	// Extract S3 credentials from secret data (case-insensitive key matching)
	creds := &S3Credentials{}
	secretData := secret.Data

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

// GetS3Object retrieves an object from S3 using transfer manager for optimized downloading
// and returns a reader for the content. Uses concurrent multipart downloads for large files.
func (r *S3Repository) GetS3Object(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) (io.Reader, string, error) {
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

	// Transfer manager's GetObject returns io.Reader; caller should type-assert to io.Closer if cleanup is needed
	return result.Body, contentType, nil
}
