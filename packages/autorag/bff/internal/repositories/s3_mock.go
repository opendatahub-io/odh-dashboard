package repositories

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
)

// MockS3Repository is a mock implementation of S3RepositoryInterface for testing
type MockS3Repository struct{}

// NewMockS3Repository creates a new mock S3 repository
func NewMockS3Repository() S3RepositoryInterface {
	return &MockS3Repository{}
}

// GetS3Credentials returns mock S3 credentials from a Kubernetes secret
func (r *MockS3Repository) GetS3Credentials(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	secretName string,
	identity *k8s.RequestIdentity,
) (*S3Credentials, error) {
	// Fetch the secret from Kubernetes (still using real K8s client to validate secret existence)
	secret, err := client.GetSecret(ctx, namespace, secretName, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secret '%s' from namespace %s: %w", secretName, namespace, err)
	}

	// Extract S3 credentials from secret data (case-insensitive key matching)
	creds := &S3Credentials{}
	secretData := secret.Data

	// Helper to get value from secret data case-insensitively
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

	creds.AccessKeyID = getValue("AWS_ACCESS_KEY_ID")
	creds.SecretAccessKey = getValue("AWS_SECRET_ACCESS_KEY")
	creds.Region = getValue("AWS_DEFAULT_REGION")
	rawEndpoint := getValue("AWS_S3_ENDPOINT")
	creds.Bucket = getValue("AWS_S3_BUCKET") // Optional bucket name

	// Validate required fields
	if creds.AccessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_ACCESS_KEY_ID", secretName)
	}
	if creds.SecretAccessKey == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_SECRET_ACCESS_KEY", secretName)
	}
	if creds.Region == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_DEFAULT_REGION", secretName)
	}
	if rawEndpoint == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_S3_ENDPOINT", secretName)
	}

	// For mock implementation, skip SSRF validation since we're not actually connecting to S3
	// Just store the endpoint as-is for test fixtures
	creds.EndpointURL = rawEndpoint

	return creds, nil
}

// GetS3Object returns mock file data for testing
func (r *MockS3Repository) GetS3Object(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) (io.Reader, string, error) {
	// Simulate file not found for non-existent files
	// This allows tests to verify 404 handling without actual S3
	if strings.Contains(key, "non-existent") {
		return nil, "", &types.NoSuchKey{}
	}

	// Return mock PDF content for .pdf files
	if strings.HasSuffix(key, ".pdf") {
		mockContent := []byte("%PDF-1.4\n%Mock PDF file for testing\n%%EOF")
		return bytes.NewReader(mockContent), "application/pdf", nil
	}

	// Return mock CSV content for .csv files
	if strings.HasSuffix(key, ".csv") {
		mockContent := []byte("column1,column2,column3\nvalue1,value2,value3\n")
		return bytes.NewReader(mockContent), "text/csv", nil
	}

	// Default: return generic mock content
	mockContent := []byte("Mock file content for testing")
	return bytes.NewReader(mockContent), "application/octet-stream", nil
}
