package api

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?secretName=aws-secret-1&path=my-bucket/file.pdf",
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&path=my-bucket/file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_MissingPath(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_InvalidPathFormat_NoBucket(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&path=invalid-path-no-slash",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_InvalidPathFormat_EmptyBucket(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&path=/file.pdf",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_InvalidPathFormat_EmptyKey(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=aws-secret-1&path=my-bucket/",
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=non-existent-secret&path=my-bucket/file.pdf",
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
				"aws_access_key_id": []byte("AKIAIOSFODNN7EXAMPLE"),
				// Missing aws_secret_access_key, aws_region_name, endpoint_url
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=test-namespace&secretName=incomplete-secret&path=my-bucket/file.pdf",
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=non-existent&secretName=aws-secret-1&path=my-bucket/file.pdf",
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=restricted&secretName=aws-secret-1&path=my-bucket/file.pdf",
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/s3/file?namespace=restricted&secretName=aws-secret-1&path=my-bucket/file.pdf",
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
					"AWS_REGION_NAME":       []byte("us-east-1"),
					"ENDPOINT_URL":          []byte("https://s3.amazonaws.com"),
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
					"aws_region_name":       []byte("us-east-1"),
					"endpoint_url":          []byte("https://s3.amazonaws.com"),
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
					"Aws_Region_Name":       []byte("us-east-1"),
					"Endpoint_Url":          []byte("https://s3.amazonaws.com"),
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

			creds, err := s3Repo.GetS3Credentials(client, context.Background(), "test-namespace", tc.secret.Name, identity)

			assert.NoError(t, err)
			assert.NotNil(t, creds)
			assert.Equal(t, "AKIAIOSFODNN7EXAMPLE", creds.AccessKeyID)
			assert.Equal(t, "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", creds.SecretAccessKey)
			assert.Equal(t, "us-east-1", creds.Region)
			assert.Equal(t, "https://s3.amazonaws.com", creds.EndpointURL)
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
				"aws_access_key_id":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"aws_secret_access_key": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"aws_region_name":       []byte("us-east-1"),
				"endpoint_url":          []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(mockClient, context.Background(), "test-namespace", "aws-secret-1", identity)

	assert.NoError(t, err)
	assert.NotNil(t, creds)
	assert.Equal(t, "AKIAIOSFODNN7EXAMPLE", creds.AccessKeyID)
	assert.Equal(t, "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", creds.SecretAccessKey)
	assert.Equal(t, "us-east-1", creds.Region)
	assert.Equal(t, "https://s3.amazonaws.com", creds.EndpointURL)
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

	creds, err := s3Repo.GetS3Credentials(mockClient, context.Background(), "test-namespace", "non-existent", identity)

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
				"aws_secret_access_key": []byte("secret"),
				"aws_region_name":       []byte("us-east-1"),
				"endpoint_url":          []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(mockClient, context.Background(), "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "aws_access_key_id")
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
				"aws_access_key_id": []byte("AKIAIOSFODNN7EXAMPLE"),
				"aws_region_name":   []byte("us-east-1"),
				"endpoint_url":      []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(mockClient, context.Background(), "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "aws_secret_access_key")
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
				"aws_access_key_id":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"aws_secret_access_key": []byte("secret"),
				"endpoint_url":          []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(mockClient, context.Background(), "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "aws_region_name")
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
				"aws_access_key_id":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"aws_secret_access_key": []byte("secret"),
				"aws_region_name":       []byte("us-east-1"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(mockClient, context.Background(), "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "endpoint_url")
}

func TestS3Repository_GetS3Credentials_KubernetesError(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{
		err: fmt.Errorf("kubernetes error: unable to list secrets"),
	}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	s3Repo := repositories.NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(mockClient, context.Background(), "test-namespace", "aws-secret-1", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "kubernetes error")
}

// Helper functions to test case conversion
func TestCaseConversionHelpers(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
		fn       func(string) string
	}{
		{
			name:     "toLowerCase basic",
			input:    "AWS_ACCESS_KEY_ID",
			expected: "aws_access_key_id",
			fn:       func(s string) string { return strings.ToLower(s) },
		},
		{
			name:     "toUpperCase basic",
			input:    "aws_access_key_id",
			expected: "AWS_ACCESS_KEY_ID",
			fn:       func(s string) string { return strings.ToUpper(s) },
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.fn(tc.input)
			assert.Equal(t, tc.expected, result)
		})
	}
}
