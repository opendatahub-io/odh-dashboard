package api

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	psmocks "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver/psmocks"
	s3mocks "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3/s3mocks"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

func TestGetS3FileHandler_MissingNamespace(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_MissingSecretName(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_MissingBucket(t *testing.T) {
	// Secret without AWS_S3_BUCKET, and no bucket query param provided
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
				// No AWS_S3_BUCKET
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_MissingKey(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_SecretNotFound(t *testing.T) {
	// Mock client returns empty secrets list
	mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{}}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=non-existent-secret&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestGetS3FileHandler_SecretMissingRequiredFields(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID": []byte("AKIAIOSFODNN7EXAMPLE"),
				// Missing AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, AWS_S3_ENDPOINT
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=incomplete-secret&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_NamespaceNotFound(t *testing.T) {
	// Create a Kubernetes NotFound error
	notFoundErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "namespaces \"non-existent\" not found",
			Reason:  metav1.StatusReasonNotFound,
			Code:    http.StatusNotFound,
		},
	}

	mockClient := &mockKubernetesClientForSecrets{err: notFoundErr}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=non-existent&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestGetS3FileHandler_ForbiddenError(t *testing.T) {
	// Create a Kubernetes Forbidden error
	forbiddenErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "forbidden: User cannot list secrets in namespace \"restricted\"",
			Reason:  metav1.StatusReasonForbidden,
			Code:    http.StatusForbidden,
		},
	}

	mockClient := &mockKubernetesClientForSecrets{err: forbiddenErr}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=restricted&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusForbidden, res.StatusCode)
}

func TestGetS3FileHandler_UnauthorizedError(t *testing.T) {
	// Create a Kubernetes Unauthorized error
	unauthorizedErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "unauthorized: User authentication failed",
			Reason:  metav1.StatusReasonUnauthorized,
			Code:    http.StatusUnauthorized,
		},
	}

	mockClient := &mockKubernetesClientForSecrets{err: unauthorizedErr}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=restricted&secretName=aws-secret-1&bucket=my-bucket&key=file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, res.StatusCode)
}

func TestGetS3FileHandler_CaseInsensitiveCredentials(t *testing.T) {
	// Test that credentials with different cases are handled correctly
	testCases := []struct {
		name   string
		secret corev1.Secret
	}{
		{
			name: "Uppercase keys",
			secret: corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "aws-secret-uppercase",
					Namespace: "test-namespace",
					UID:       types.UID("uid-upper"),
				},
				Data: map[string][]byte{
					"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
					"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
					"AWS_DEFAULT_REGION":    []byte("us-east-1"),
					"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
					"AWS_S3_BUCKET":         []byte("test-bucket"),
				},
			},
		},
		{
			name: "Lowercase keys",
			secret: corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "aws-secret-lowercase",
					Namespace: "test-namespace",
					UID:       types.UID("uid-lower"),
				},
				Data: map[string][]byte{
					"aws_access_key_id":     []byte("AKIAIOSFODNN7EXAMPLE"),
					"aws_secret_access_key": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
					"aws_default_region":    []byte("us-east-1"),
					"aws_s3_endpoint":       []byte("https://s3.amazonaws.com"),
					"aws_s3_bucket":         []byte("test-bucket"),
				},
			},
		},
		{
			name: "Mixed case keys",
			secret: corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "aws-secret-mixed",
					Namespace: "test-namespace",
					UID:       types.UID("uid-mixed"),
				},
				Data: map[string][]byte{
					"Aws_Access_Key_Id":     []byte("AKIAIOSFODNN7EXAMPLE"),
					"Aws_Secret_Access_Key": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
					"Aws_Default_Region":    []byte("us-east-1"),
					"Aws_S3_Endpoint":       []byte("https://s3.amazonaws.com"),
					"Aws_S3_Bucket":         []byte("test-bucket"),
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{tc.secret}}
			factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
			identity := &kubernetes.RequestIdentity{UserID: "test-user"}

			// Since we can't easily mock S3, just test that we get credentials properly
			// The actual S3 call would fail, but we can verify credentials extraction works
			s3Repo := repositories.NewS3Repository()
			client, _ := factory.GetClient(context.Background())

			creds, err := s3Repo.GetS3Credentials(context.Background(), client, "test-namespace", tc.secret.Name, identity)

			assert.NoError(t, err)
			assert.NotNil(t, creds)
			assert.Equal(t, "AKIAIOSFODNN7EXAMPLE", creds.AccessKeyID)
			assert.Equal(t, "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", creds.SecretAccessKey)
			assert.Equal(t, "us-east-1", creds.Region)
			assert.Equal(t, "https://s3.amazonaws.com", creds.EndpointURL)
			assert.Equal(t, "test-bucket", creds.Bucket)
		})
	}
}

func TestS3Repository_GetS3Credentials_Success(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
				"AWS_S3_BUCKET":         []byte("my-bucket"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "aws-secret-1", identity)

	assert.NoError(t, err)
	assert.NotNil(t, creds)
	assert.Equal(t, "AKIAIOSFODNN7EXAMPLE", creds.AccessKeyID)
	assert.Equal(t, "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", creds.SecretAccessKey)
	assert.Equal(t, "us-east-1", creds.Region)
	assert.Equal(t, "https://s3.amazonaws.com", creds.EndpointURL)
	assert.Equal(t, "my-bucket", creds.Bucket)
}

func TestS3Repository_GetS3Credentials_SecretNotFound(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "other-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"key": []byte("value"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "non-existent", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "not found")
}

func TestS3Repository_GetS3Credentials_MissingAccessKeyID(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "AWS_ACCESS_KEY_ID")
}

func TestS3Repository_GetS3Credentials_MissingSecretAccessKey(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":  []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_DEFAULT_REGION": []byte("us-east-1"),
				"AWS_S3_ENDPOINT":    []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "AWS_SECRET_ACCESS_KEY")
}

func TestS3Repository_GetS3Credentials_MissingRegion(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "AWS_DEFAULT_REGION")
}

func TestS3Repository_GetS3Credentials_MissingEndpointURL(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "AWS_S3_ENDPOINT")
}

func TestS3Repository_GetS3Credentials_KubernetesError(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{
		err: fmt.Errorf("kubernetes error: unable to list secrets"),
	}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "aws-secret-1", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "kubernetes error")
}

func TestS3Repository_GetS3Credentials_WithoutBucket(t *testing.T) {
	// Test that bucket field is empty when AWS_S3_BUCKET is not in the secret
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-no-bucket",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
				// No AWS_S3_BUCKET
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "aws-secret-no-bucket", identity)

	assert.NoError(t, err)
	assert.NotNil(t, creds)
	assert.Equal(t, "AKIAIOSFODNN7EXAMPLE", creds.AccessKeyID)
	assert.Equal(t, "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", creds.SecretAccessKey)
	assert.Equal(t, "us-east-1", creds.Region)
	assert.Equal(t, "https://s3.amazonaws.com", creds.EndpointURL)
	assert.Equal(t, "", creds.Bucket) // Bucket should be empty when not in secret
}

// Tests for GetS3FileSchemaHandler

func TestGetS3FileSchemaHandler_MissingNamespace(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file/schema?secretName=aws-secret-1&bucket=my-bucket&key=data.csv",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileSchemaHandler_MissingSecretName(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file/schema?namespace=test-namespace&bucket=my-bucket&key=data.csv",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileSchemaHandler_MissingKey(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file/schema?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileSchemaHandler_SecretNotFound(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{}}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file/schema?namespace=test-namespace&secretName=non-existent-secret&bucket=my-bucket&key=data.csv",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestGetS3FileSchemaHandler_MissingBucket(t *testing.T) {
	// Secret without AWS_S3_BUCKET, and no bucket query param provided
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
				// No AWS_S3_BUCKET
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/file/schema?namespace=test-namespace&secretName=aws-secret-1&key=data.csv",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

// Tests for SSRF protection in S3 endpoint validation

func TestGetS3FileSchemaHandler_IncludesParseWarnings(t *testing.T) {
	// Create a mock secret with valid S3 credentials
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-secret",
				Namespace: "default",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	// Make request to get CSV schema
	result, res, err := setupApiTest[map[string]interface{}](
		"GET",
		"/api/v1/s3/file/schema?namespace=default&secretName=test-secret&bucket=my-bucket&key=data.csv",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)

	// Verify response structure includes parse_warnings
	assert.NotNil(t, result)
	data, ok := result["data"].(map[string]interface{})
	assert.True(t, ok, "Response should have 'data' field")
	assert.NotNil(t, data)

	// Verify parse_warnings field exists
	parseWarnings, ok := data["parse_warnings"]
	assert.True(t, ok, "Response data should have 'parse_warnings' field")
	assert.NotNil(t, parseWarnings)

	// For mock data, parse_warnings should be 0
	parseWarningsFloat, ok := parseWarnings.(float64)
	assert.True(t, ok, "parse_warnings should be a number")
	assert.Equal(t, float64(0), parseWarningsFloat, "Mock data should have 0 parse warnings")

	// Verify columns field still exists
	columns, ok := data["columns"]
	assert.True(t, ok, "Response data should have 'columns' field")
	assert.NotNil(t, columns)
}

func TestS3Repository_GetS3CredentialsFromDSPA_Success(t *testing.T) {
	// Verifies that GetS3CredentialsFromDSPA uses the field names from DSPAObjectStorage
	// rather than hardcoded AWS_* names, and takes endpoint/region from the struct.
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "dspa-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-dspa"),
			},
			Data: map[string][]byte{
				"accesskey": []byte("MINIOACCESSKEY"),
				"secretkey": []byte("MINIOSECRETKEY"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	dspaStorage := &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		AccessKeyField: "accesskey",
		SecretKeyField: "secretkey",
		EndpointURL:    "https://s3.amazonaws.com",
		Bucket:         "pipeline-artifacts",
		Region:         "us-east-1",
	}

	creds, err := s3Repo.GetS3CredentialsFromDSPA(context.Background(), mockClient, "test-namespace", dspaStorage, identity)

	assert.NoError(t, err)
	assert.NotNil(t, creds)
	assert.Equal(t, "MINIOACCESSKEY", creds.AccessKeyID)
	assert.Equal(t, "MINIOSECRETKEY", creds.SecretAccessKey)
	assert.Equal(t, "https://s3.amazonaws.com", creds.EndpointURL)
	assert.Equal(t, "pipeline-artifacts", creds.Bucket)
	assert.Equal(t, "us-east-1", creds.Region)
}

func TestS3Repository_GetS3CredentialsFromDSPA_DefaultsRegion(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{Name: "dspa-secret", Namespace: "test-namespace"},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("KEY"),
				"AWS_SECRET_ACCESS_KEY": []byte("SECRET"),
			},
		},
	}

	s3Repo := repositories.NewS3Repository()
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	dspaStorage := &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		AccessKeyField: "AWS_ACCESS_KEY_ID",
		SecretKeyField: "AWS_SECRET_ACCESS_KEY",
		EndpointURL:    "https://s3.amazonaws.com",
		Region:         "", // deliberately empty — should default to us-east-1
	}

	creds, err := s3Repo.GetS3CredentialsFromDSPA(context.Background(), &mockKubernetesClientForSecrets{secrets: mockSecrets}, "test-namespace", dspaStorage, identity)

	assert.NoError(t, err)
	assert.Equal(t, "us-east-1", creds.Region)
}

func TestS3Repository_GetS3CredentialsFromDSPA_MissingEndpoint(t *testing.T) {
	s3Repo := repositories.NewS3Repository()
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	dspaStorage := &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		AccessKeyField: "AWS_ACCESS_KEY_ID",
		SecretKeyField: "AWS_SECRET_ACCESS_KEY",
		EndpointURL:    "", // missing endpoint
	}

	_, err := s3Repo.GetS3CredentialsFromDSPA(context.Background(), &mockKubernetesClientForSecrets{}, "test-namespace", dspaStorage, identity)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "endpoint")
}

// newS3TestApp creates a minimal App for directly invoking S3 handlers with injected context.
// Tests that use this helper bypass the route middleware and inject context values themselves.
func newS3TestApp(k8Factory kubernetes.KubernetesClientFactory) *App {
	logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{}))
	return &App{
		config:                      config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal, MockPipelineServerClient: true},
		logger:                      logger,
		kubernetesClientFactory:     k8Factory,
		pipelineServerClientFactory: psmocks.NewMockClientFactory(),
		s3ClientFactory:             s3mocks.NewMockClientFactory(),
		repositories:                repositories.NewRepositories(logger),
	}
}

// buildDSPARequest builds an HTTP request with namespace, identity, and DSPAObjectStorage
// already injected into the context, simulating what AttachPipelineServerClient would inject
// in a production environment.
func buildDSPARequest(method, url string, dspaStorage *models.DSPAObjectStorage, namespace string, identity *kubernetes.RequestIdentity) *http.Request {
	req, _ := http.NewRequest(method, url, http.NoBody)
	ctx := req.Context()
	ctx = context.WithValue(ctx, constants.RequestIdentityKey, identity)
	ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, namespace)
	ctx = context.WithValue(ctx, constants.DSPAObjectStorageKey, dspaStorage)
	return req.WithContext(ctx)
}

func TestGetS3FileHandler_DSPAPath_Success(t *testing.T) {
	// Secret containing S3 credentials referenced by the DSPA spec
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "dspa-secret",
				Namespace: "default",
				UID:       types.UID("uid-dspa"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			},
		},
	}

	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: mockSecrets}}

	dspaStorage := &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		AccessKeyField: "AWS_ACCESS_KEY_ID",
		SecretKeyField: "AWS_SECRET_ACCESS_KEY",
		EndpointURL:    "https://s3.amazonaws.com",
		Bucket:         "dspa-bucket",
		Region:         "us-east-1",
	}

	// No secretName in URL — should use DSPA path
	req := buildDSPARequest("GET", "/api/v1/s3/file?key=test.pdf", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FileHandler(rr, req, nil)

	// Mock S3 returns content for .pdf files — expect 200
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetS3FileHandler_DSPAPath_EmptyBucket_Returns503(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	// Secret must exist so GetS3CredentialsFromDSPA succeeds before the bucket check
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{Name: "dspa-secret", Namespace: "default", UID: types.UID("uid-dspa")},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			},
		},
	}
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: mockSecrets}}

	// DSPA config with no bucket configured — handler should fast-fail with 400
	dspaStorage := &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		AccessKeyField: "AWS_ACCESS_KEY_ID",
		SecretKeyField: "AWS_SECRET_ACCESS_KEY",
		EndpointURL:    "https://s3.amazonaws.com",
		Bucket:         "", // no bucket
		Region:         "us-east-1",
	}

	req := buildDSPARequest("GET", "/api/v1/s3/file?key=test.pdf", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FileHandler(rr, req, nil)

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
}

func TestGetS3FileHandler_DSPAPath_BucketOverriddenByDSPA(t *testing.T) {
	// Verifies that a caller-supplied bucket is ignored on the DSPA path
	// (DSPA bucket always wins — oracle-free design)
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "dspa-secret",
				Namespace: "default",
				UID:       types.UID("uid-dspa"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			},
		},
	}

	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: mockSecrets}}

	dspaStorage := &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		AccessKeyField: "AWS_ACCESS_KEY_ID",
		SecretKeyField: "AWS_SECRET_ACCESS_KEY",
		EndpointURL:    "https://s3.amazonaws.com",
		Bucket:         "dspa-bucket",
		Region:         "us-east-1",
	}

	// Caller passes a different bucket — it should be silently ignored
	req := buildDSPARequest("GET", "/api/v1/s3/file?bucket=caller-bucket&key=test.pdf", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FileHandler(rr, req, nil)

	// The DSPA bucket is used — request should succeed (200, not 400)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetS3FileSchemaHandler_DSPAPath_Success(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "dspa-secret",
				Namespace: "default",
				UID:       types.UID("uid-dspa"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			},
		},
	}

	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: mockSecrets}}

	dspaStorage := &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		AccessKeyField: "AWS_ACCESS_KEY_ID",
		SecretKeyField: "AWS_SECRET_ACCESS_KEY",
		EndpointURL:    "https://s3.amazonaws.com",
		Bucket:         "dspa-bucket",
		Region:         "us-east-1",
	}

	req := buildDSPARequest("GET", "/api/v1/s3/file/schema?key=data.csv", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FileSchemaHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetS3FileSchemaHandler_DSPAPath_EmptyBucket_Returns503(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{Name: "dspa-secret", Namespace: "default", UID: types.UID("uid-dspa")},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			},
		},
	}
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: mockSecrets}}

	dspaStorage := &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		AccessKeyField: "AWS_ACCESS_KEY_ID",
		SecretKeyField: "AWS_SECRET_ACCESS_KEY",
		EndpointURL:    "https://s3.amazonaws.com",
		Bucket:         "",
		Region:         "us-east-1",
	}

	req := buildDSPARequest("GET", "/api/v1/s3/file/schema?key=data.csv", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FileSchemaHandler(rr, req, nil)

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
}

// ---------------------------------------------------------------------------
// GetS3FilesHandler tests
// ---------------------------------------------------------------------------

func TestGetS3FilesHandler_MissingNamespace(t *testing.T) {
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{}}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/files?secretName=aws-secret-1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FilesHandler_MissingSecretName_NoContext_Returns400(t *testing.T) {
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{}}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/files?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FilesHandler_WithSecretName_Success(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{Name: "aws-secret-1", Namespace: "test-namespace", UID: types.UID("uid-1")},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
				"AWS_S3_BUCKET":         []byte("my-bucket"),
			},
		},
	}
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: mockSecrets}}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	body, res, err := setupApiTest[S3FilesEnvelope](
		"GET",
		"/api/v1/s3/files?namespace=test-namespace&secretName=aws-secret-1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.NotNil(t, body.Data.Contents)
}

func TestGetS3FilesHandler_InvalidPathEmpty_Returns400(t *testing.T) {
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{}}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/files?namespace=test-namespace&secretName=aws-secret-1&path=",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FilesHandler_InvalidSearchWithSlash_Returns400(t *testing.T) {
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{}}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/files?namespace=test-namespace&secretName=aws-secret-1&search=foo/bar",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FilesHandler_InvalidLimit_Returns400(t *testing.T) {
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{}}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/files?namespace=test-namespace&secretName=aws-secret-1&limit=0",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FilesHandler_MissingBucket_Returns400(t *testing.T) {
	// Secret has no AWS_S3_BUCKET and no bucket query param
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{Name: "aws-secret-1", Namespace: "test-namespace", UID: types.UID("uid-1")},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
				// No AWS_S3_BUCKET
			},
		},
	}
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: mockSecrets}}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	body, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/s3/files?namespace=test-namespace&secretName=aws-secret-1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	assert.Contains(t, body.Error.Message, "bucket")
}

func TestGetS3FilesHandler_DSPAPath_Success(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{Name: "dspa-secret", Namespace: "default", UID: types.UID("uid-dspa")},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			},
		},
	}
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: mockSecrets}}

	dspaStorage := &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		AccessKeyField: "AWS_ACCESS_KEY_ID",
		SecretKeyField: "AWS_SECRET_ACCESS_KEY",
		EndpointURL:    "https://s3.amazonaws.com",
		Bucket:         "dspa-bucket",
		Region:         "us-east-1",
	}

	req := buildDSPARequest("GET", "/api/v1/s3/files", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FilesHandler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetS3FilesHandler_DSPAPath_EmptyBucket_Returns503(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{Name: "dspa-secret", Namespace: "default", UID: types.UID("uid-dspa")},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			},
		},
	}
	factory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: mockSecrets}}

	dspaStorage := &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		AccessKeyField: "AWS_ACCESS_KEY_ID",
		SecretKeyField: "AWS_SECRET_ACCESS_KEY",
		EndpointURL:    "https://s3.amazonaws.com",
		Bucket:         "",
		Region:         "us-east-1",
	}

	req := buildDSPARequest("GET", "/api/v1/s3/files", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FilesHandler(rr, req, nil)

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
}
