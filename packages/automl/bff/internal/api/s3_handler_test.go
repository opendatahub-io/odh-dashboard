package api

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
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
			s3Repo := repositories.NewS3Repository(true)
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
	s3Repo := repositories.NewS3Repository(true)

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
	s3Repo := repositories.NewS3Repository(true)

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
	s3Repo := repositories.NewS3Repository(true)

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
	s3Repo := repositories.NewS3Repository(true)

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
	s3Repo := repositories.NewS3Repository(true)

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
	s3Repo := repositories.NewS3Repository(true)

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
	s3Repo := repositories.NewS3Repository(true)

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
	s3Repo := repositories.NewS3Repository(true)

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

func TestS3Repository_GetS3Credentials_RejectsHTTP(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "insecure-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("http://s3.amazonaws.com"), // HTTP not HTTPS
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "insecure-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "HTTPS")
}

func TestS3Repository_GetS3Credentials_RejectsPrivateIP_10(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "private-ip-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://10.0.0.1:9000"), // Private IP (RFC-1918)
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "private-ip-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "RFC-1918")
}

func TestS3Repository_GetS3Credentials_RejectsPrivateIP_172(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "private-ip-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://172.16.0.1:9000"), // Private IP (RFC-1918)
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "private-ip-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "RFC-1918")
}

func TestS3Repository_GetS3Credentials_RejectsPrivateIP_192(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "private-ip-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://192.168.1.1:9000"), // Private IP (RFC-1918)
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "private-ip-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "RFC-1918")
}

func TestS3Repository_GetS3Credentials_RejectsLoopback(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "loopback-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://127.0.0.1:9000"), // Loopback address
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "loopback-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "loopback")
}

func TestS3Repository_GetS3Credentials_RejectsLinkLocal(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "linklocal-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://169.254.169.254"), // AWS metadata service (link-local)
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "linklocal-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "link-local")
}

func TestS3Repository_GetS3Credentials_RejectsInvalidURL(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "invalid-url-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("not-a-url"), // Invalid URL
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "invalid-url-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "invalid AWS_S3_ENDPOINT")
}

func TestS3Repository_GetS3Credentials_RejectsThisNetwork_0_0_0_0(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "this-network-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://0.0.0.0:9000"), // 0.0.0.0/8 "This Network"
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "this-network-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "this network")
}

func TestS3Repository_GetS3Credentials_RejectsThisNetwork_0_0_0_1(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "this-network-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://0.0.0.1:9000"), // 0.0.0.0/8 "This Network"
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "this-network-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "this network")
}

func TestS3Repository_GetS3Credentials_RejectsReservedFutureUse(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "reserved-future-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://240.0.0.1:9000"), // 240.0.0.0/4 reserved for future use
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "reserved-future-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "reserved for future use")
}

func TestS3Repository_GetS3Credentials_RejectsIPv6Loopback(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "ipv6-loopback-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://[::1]:9000"), // IPv6 loopback
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "ipv6-loopback-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "IPv6 loopback")
}

func TestS3Repository_GetS3Credentials_RejectsIPv6LinkLocal(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "ipv6-linklocal-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://[fe80::1]:9000"), // IPv6 link-local
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "ipv6-linklocal-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "IPv6 link-local")
}

func TestS3Repository_GetS3Credentials_RejectsIPv6UniqueLocal(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "ipv6-ula-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://[fc00::1]:9000"), // IPv6 unique local addresses
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "ipv6-ula-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "IPv6 unique local")
}

func TestS3Repository_GetS3Credentials_AcceptsValidHTTPSURL(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "valid-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.us-east-1.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository(true)

	creds, err := s3Repo.GetS3Credentials(context.Background(), mockClient, "test-namespace", "valid-secret", identity)

	assert.NoError(t, err)
	assert.NotNil(t, creds)
	assert.Equal(t, "https://s3.us-east-1.amazonaws.com", creds.EndpointURL)
}

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
