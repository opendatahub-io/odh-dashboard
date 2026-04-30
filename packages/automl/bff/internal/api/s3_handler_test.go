package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"net/url"
	"testing"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	psmocks "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver/psmocks"
	s3int "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3"
	s3mocks "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3/s3mocks"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
		"/api/v1/s3/files/file.pdf?secretName=aws-secret-1&bucket=my-bucket",
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
		"/api/v1/s3/files/file.pdf?namespace=test-namespace&bucket=my-bucket",
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
		"/api/v1/s3/files/file.pdf?namespace=test-namespace&secretName=aws-secret-1",
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
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestGetS3FileHandler_SecretNotFound(t *testing.T) {
	// Mock client returns empty secrets list
	mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{}}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/files/file.pdf?namespace=test-namespace&secretName=non-existent-secret&bucket=my-bucket",
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
				// Missing AWS_SECRET_ACCESS_KEY, AWS_S3_ENDPOINT
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/files/file.pdf?namespace=test-namespace&secretName=incomplete-secret&bucket=my-bucket",
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
		"/api/v1/s3/files/file.pdf?namespace=non-existent&secretName=aws-secret-1&bucket=my-bucket",
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
		"/api/v1/s3/files/file.pdf?namespace=restricted&secretName=aws-secret-1&bucket=my-bucket",
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
		"/api/v1/s3/files/file.pdf?namespace=restricted&secretName=aws-secret-1&bucket=my-bucket",
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

// Tests for view=schema on GetS3FileHandler

func TestGetS3FileHandler_ViewSchema_MissingNamespace(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/files/data.csv?view=schema&secretName=aws-secret-1&bucket=my-bucket",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_ViewSchema_MissingSecretName(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/files/data.csv?view=schema&namespace=test-namespace&bucket=my-bucket",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_ViewSchema_SecretNotFound(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{}}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"GET",
		"/api/v1/s3/files/data.csv?view=schema&namespace=test-namespace&secretName=non-existent-secret&bucket=my-bucket",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestGetS3FileHandler_ViewSchema_MissingBucket(t *testing.T) {
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
		"/api/v1/s3/files/data.csv?view=schema&namespace=test-namespace&secretName=aws-secret-1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetS3FileHandler_ViewSchema_IncludesParseWarnings(t *testing.T) {
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

	result, res, err := setupApiTest[map[string]interface{}](
		"GET",
		"/api/v1/s3/files/data.csv?view=schema&namespace=default&secretName=test-secret&bucket=my-bucket",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)

	assert.NotNil(t, result)
	data, ok := result["data"].(map[string]interface{})
	assert.True(t, ok, "Response should have 'data' field")
	assert.NotNil(t, data)

	parseWarnings, ok := data["parse_warnings"]
	assert.True(t, ok, "Response data should have 'parse_warnings' field")
	assert.NotNil(t, parseWarnings)

	parseWarningsFloat, ok := parseWarnings.(float64)
	assert.True(t, ok, "parse_warnings should be a number")
	assert.Equal(t, float64(0), parseWarningsFloat, "Mock data should have 0 parse warnings")

	columns, ok := data["columns"]
	assert.True(t, ok, "Response data should have 'columns' field")
	assert.NotNil(t, columns)
	columnsSlice, ok := columns.([]interface{})
	assert.True(t, ok, "columns should be a JSON array")
	require.Len(t, columnsSlice, 5)
	expected := []struct {
		name string
		typ  string
	}{
		{"id", "integer"},
		{"name", "string"},
		{"score", "double"},
		{"is_active", "bool"},
		{"created_at", "timestamp"},
	}
	for i, exp := range expected {
		col, ok := columnsSlice[i].(map[string]interface{})
		assert.True(t, ok, "column %d should be an object", i)
		assert.Equal(t, exp.name, col["name"], "column %d name", i)
		assert.Equal(t, exp.typ, col["type"], "column %d type (inference)", i)
	}
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
	req := buildDSPARequest("GET", "/api/v1/s3/files/test.pdf", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FileHandler(rr, req, httprouter.Params{{Key: "key", Value: "test.pdf"}})

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

	req := buildDSPARequest("GET", "/api/v1/s3/files/test.pdf", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FileHandler(rr, req, httprouter.Params{{Key: "key", Value: "test.pdf"}})

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
	req := buildDSPARequest("GET", "/api/v1/s3/files/test.pdf?bucket=caller-bucket", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FileHandler(rr, req, httprouter.Params{{Key: "key", Value: "test.pdf"}})

	// The DSPA bucket is used — request should succeed (200, not 400)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetS3FileHandler_ViewSchema_DSPAPath_Success(t *testing.T) {
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

	req := buildDSPARequest("GET", "/api/v1/s3/files/data.csv?view=schema", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FileHandler(rr, req, httprouter.Params{{Key: "key", Value: "data.csv"}})

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetS3FileHandler_ViewSchema_DSPAPath_EmptyBucket_Returns503(t *testing.T) {
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

	req := buildDSPARequest("GET", "/api/v1/s3/files/data.csv?view=schema", dspaStorage, "default", identity)

	app := newS3TestApp(factory)
	rr := httptest.NewRecorder()
	app.GetS3FileHandler(rr, req, httprouter.Params{{Key: "key", Value: "data.csv"}})

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

type keyCollisionS3Client struct {
	s3mocks.MockS3Client
	existingKeys map[string]bool
	uploadedKey  string
}

func newKeyCollisionS3Client(existingKeys ...string) *keyCollisionS3Client {
	existing := make(map[string]bool, len(existingKeys))
	for _, key := range existingKeys {
		existing[key] = true
	}
	return &keyCollisionS3Client{existingKeys: existing}
}

func (c *keyCollisionS3Client) ObjectExists(_ context.Context, _ string, key string) (bool, error) {
	return c.existingKeys[key], nil
}

func (c *keyCollisionS3Client) UploadObject(_ context.Context, _ string, key string, body io.Reader, _ string) error {
	if c.existingKeys[key] {
		return s3int.ErrObjectAlreadyExists
	}
	c.uploadedKey = key
	c.existingKeys[key] = true
	_, err := io.Copy(io.Discard, body)
	return err
}

// s3AccessDeniedError mimics AWS SDK AccessDenied for errors.As + ErrorCode classification in PostS3FileHandler.
type s3AccessDeniedError struct{}

func (s3AccessDeniedError) Error() string     { return "AccessDenied" }
func (s3AccessDeniedError) ErrorCode() string { return "AccessDenied" }

type uploadAccessDeniedClient struct{ s3mocks.MockS3Client }

func (*uploadAccessDeniedClient) ObjectExists(context.Context, string, string) (bool, error) {
	return false, nil
}

func (*uploadAccessDeniedClient) UploadObject(context.Context, string, string, io.Reader, string) error {
	return s3AccessDeniedError{}
}

type uploadGenericErrClient struct{ s3mocks.MockS3Client }

func (*uploadGenericErrClient) ObjectExists(context.Context, string, string) (bool, error) {
	return false, nil
}

func (*uploadGenericErrClient) UploadObject(context.Context, string, string, io.Reader, string) error {
	return fmt.Errorf("generic s3 failure")
}

type alwaysExistsS3Client struct{ s3mocks.MockS3Client }

func (*alwaysExistsS3Client) ObjectExists(context.Context, string, string) (bool, error) {
	return true, nil
}

func (*alwaysExistsS3Client) UploadObject(context.Context, string, string, io.Reader, string) error {
	return s3int.ErrObjectAlreadyExists
}

type firstUploadCaptureClient struct {
	s3mocks.MockS3Client
	uploaded []byte
}

func (c *firstUploadCaptureClient) ObjectExists(context.Context, string, string) (bool, error) {
	return false, nil
}

func (c *firstUploadCaptureClient) UploadObject(_ context.Context, _ string, _ string, body io.Reader, _ string) error {
	var err error
	c.uploaded, err = io.ReadAll(body)
	return err
}

// s3HandlerTestAppOptions configures test-only App fields (e.g. PostS3FileHandler upload caps).
type s3HandlerTestAppOptions struct {
	S3PostMaxFilePartBytes     int64
	S3PostMaxRequestBodyBytes  int64
	S3PostMaxCollisionAttempts int
}

// newS3HandlerTestApp creates a lightweight App wired with K8s and S3 mock factories,
// for testing S3 handler logic in isolation.
func newS3HandlerTestApp(
	k8Factory kubernetes.KubernetesClientFactory,
	s3Factory s3int.S3ClientFactory,
	opts *s3HandlerTestAppOptions,
) *App {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := &App{
		config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal, MockPipelineServerClient: true},
		logger:                  logger,
		kubernetesClientFactory: k8Factory,
		s3ClientFactory:         s3Factory,
		repositories:            repositories.NewRepositories(logger),
	}
	if opts != nil {
		app.s3PostMaxFilePartBytes = opts.S3PostMaxFilePartBytes
		app.s3PostMaxRequestBodyBytes = opts.S3PostMaxRequestBodyBytes
		app.s3PostMaxCollisionAttempts = opts.S3PostMaxCollisionAttempts
	}
	return app
}

// setupS3ApiTestWithBody sends a request through the full middleware chain (Routes) and returns
// the raw response recorder. Pass body http.NoBody and contentType "" when there is no body.
// mutateReq can adjust the built request (e.g. force chunked encoding).
func setupS3ApiTestWithBody(
	method, requestURL string,
	body io.Reader,
	contentType string,
	k8Factory kubernetes.KubernetesClientFactory,
	s3Factory s3int.S3ClientFactory,
	identity *kubernetes.RequestIdentity,
	opts *s3HandlerTestAppOptions,
	mutateReq func(*http.Request),
) *httptest.ResponseRecorder {
	req, err := http.NewRequest(method, requestURL, body)
	if err != nil {
		panic(err)
	}
	if identity != nil && identity.UserID != "" {
		req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if mutateReq != nil {
		mutateReq(req)
	}

	app := newS3HandlerTestApp(k8Factory, s3Factory, opts)

	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	return rr
}

// --- PostS3FileHandler tests ---

func TestPostS3FileHandler_MissingNamespace(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/files/file.csv?secretName=aws-secret-1&bucket=my-bucket",
		[]byte("test"),
		"file.csv",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_MissingSecretName(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/files/file.csv?namespace=test-namespace&bucket=my-bucket",
		[]byte("test"),
		"file.csv",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_MissingBucket(t *testing.T) {
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
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/files/file.csv?namespace=test-namespace&secretName=aws-secret-1",
		[]byte("test"),
		"file.csv",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_SecretNotFound(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{}}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/files/file.csv?namespace=test-namespace&secretName=non-existent&bucket=my-bucket",
		[]byte("test"),
		"file.csv",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestPostS3FileHandler_NoFilePart(t *testing.T) {
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
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com")},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[integrations.HTTPError](
		"POST",
		"/api/v1/s3/files/file.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		map[string]string{},
		factory,
		identity,
	)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_MultipartWithoutFilePart(t *testing.T) {
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
			},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	if err := w.WriteField("other", "value"); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/file.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		&buf,
		w.FormDataContentType(),
		factory,
		s3mocks.NewMockClientFactory(),
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestPostS3FileHandler_NamespaceNotFound(t *testing.T) {
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

	res, err := setupApiTestPostMultipart(
		"/api/v1/s3/files/file.csv?namespace=non-existent&secretName=aws-secret-1&bucket=my-bucket",
		[]byte("test"),
		"file.csv",
		factory,
		identity,
	)
	assert.NoError(t, err)
	defer res.Body.Close()
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestPostS3FileHandler_FilePartExceedsMaxBytes_Returns413(t *testing.T) {
	t.Parallel()
	const testMax int64 = 64
	filePayload := bytes.Repeat([]byte("x"), int(testMax+10))

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
			},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	body, contentType := buildMultipartFileUpload(t, "file", "blob.csv", filePayload)

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/blob.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		factory,
		s3mocks.NewMockClientFactory(),
		identity,
		&s3HandlerTestAppOptions{S3PostMaxFilePartBytes: testMax},
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()
	assert.Equal(t, http.StatusRequestEntityTooLarge, res.StatusCode)
}

func TestPostS3FileHandler_FilePartUnderMaxBytes_Created(t *testing.T) {
	t.Parallel()
	const testMax int64 = 256
	filePayload := bytes.Repeat([]byte("y"), 100)

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
			},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	body, contentType := buildMultipartFileUpload(t, "file", "small.csv", filePayload)

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/small.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		factory,
		s3mocks.NewMockClientFactory(),
		identity,
		&s3HandlerTestAppOptions{S3PostMaxFilePartBytes: testMax},
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()
	assert.Equal(t, http.StatusCreated, res.StatusCode)
}

func TestPostS3FileHandler_TotalRequestBodyExceedsCap_Returns413(t *testing.T) {
	t.Parallel()
	const maxBody int64 = 4096

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
			},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	junk, err := mw.CreateFormField("junk")
	assert.NoError(t, err)
	_, err = junk.Write(bytes.Repeat([]byte("z"), 10000))
	assert.NoError(t, err)
	fp, err := mw.CreateFormFile("file", "late.csv")
	assert.NoError(t, err)
	_, err = fp.Write([]byte("ok"))
	assert.NoError(t, err)
	assert.NoError(t, mw.Close())

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/late.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		bytes.NewReader(buf.Bytes()),
		mw.FormDataContentType(),
		factory,
		s3mocks.NewMockClientFactory(),
		identity,
		&s3HandlerTestAppOptions{S3PostMaxRequestBodyBytes: maxBody},
		func(r *http.Request) {
			r.ContentLength = -1
		},
	)
	res := rr.Result()
	defer res.Body.Close()
	assert.Equal(t, http.StatusRequestEntityTooLarge, res.StatusCode)
}

func TestPostS3FileHandler_ResolvesCollidingKeyWithNumericSuffix(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	collisionClient := newKeyCollisionS3Client("file.csv")
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(collisionClient)
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "file.csv", []byte("content"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/file.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusCreated, res.StatusCode)
	assert.Equal(t, "file-1.csv", collisionClient.uploadedKey)

	var responseBody map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &responseBody)
	assert.NoError(t, err)
	assert.Equal(t, true, responseBody["uploaded"])
	assert.Equal(t, "file-1.csv", responseBody["key"])
}

func TestPostS3FileHandler_ResolvesCollidingNumericSuffix(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
	collisionClient := newKeyCollisionS3Client("file-5.csv")
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(collisionClient)
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "file-5.csv", []byte("content"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/file-5.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusCreated, res.StatusCode)
	assert.Equal(t, "file-6.csv", collisionClient.uploadedKey)
}

func TestPostS3FileHandler_UploadObjectAccessDenied_Returns403(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&uploadAccessDeniedClient{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "a.csv", []byte("h1,h2\n1,2\n"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/a.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusForbidden, res.StatusCode)
	var env ErrorEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	require.NotNil(t, env.Error)
	assert.Equal(t, "403", env.Error.Code)
	assert.Contains(t, env.Error.Message, "access denied")
}

func TestPostS3FileHandler_UploadObjectGenericError_Returns500(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&uploadGenericErrClient{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "a.csv", []byte("x"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/a.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusInternalServerError, res.StatusCode)
	var env ErrorEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	require.NotNil(t, env.Error)
	assert.Equal(t, "500", env.Error.Code)
}

func TestPostS3FileHandler_ChunkedBodyExceedsMax_Returns413(t *testing.T) {
	t.Parallel()
	const maxBody int64 = 4096

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
			},
		},
	}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	junk, err := mw.CreateFormField("junk")
	require.NoError(t, err)
	_, err = junk.Write(bytes.Repeat([]byte("z"), 10000))
	require.NoError(t, err)
	fp, err := mw.CreateFormFile("file", "late.csv")
	require.NoError(t, err)
	_, err = fp.Write([]byte("ok"))
	require.NoError(t, err)
	require.NoError(t, mw.Close())

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/late.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		bytes.NewReader(buf.Bytes()),
		mw.FormDataContentType(),
		factory,
		s3mocks.NewMockClientFactory(),
		identity,
		&s3HandlerTestAppOptions{S3PostMaxRequestBodyBytes: maxBody},
		func(r *http.Request) {
			r.ContentLength = -1
			r.TransferEncoding = []string{"chunked"}
		},
	)
	res := rr.Result()
	defer res.Body.Close()
	assert.Equal(t, http.StatusRequestEntityTooLarge, res.StatusCode)
}

func TestPostS3FileHandler_TwoFileParts_UsesFirstPartOnly(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	capture := &firstUploadCaptureClient{}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(capture)
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	p1, err := mw.CreateFormFile("file", "first.csv")
	require.NoError(t, err)
	_, err = p1.Write([]byte("first-content"))
	require.NoError(t, err)
	p2, err := mw.CreateFormFile("file", "second.csv")
	require.NoError(t, err)
	_, err = p2.Write([]byte("second-content-ignored"))
	require.NoError(t, err)
	require.NoError(t, mw.Close())

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/out.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		&buf,
		mw.FormDataContentType(),
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusCreated, res.StatusCode)
	assert.Equal(t, []byte("first-content"), capture.uploaded)
}

func TestPostS3FileHandler_CollisionResolutionExhausted_Returns409(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&alwaysExistsS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "a.csv", []byte("x"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/a.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		&s3HandlerTestAppOptions{S3PostMaxCollisionAttempts: 5},
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusConflict, res.StatusCode)
	var env ErrorEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	require.NotNil(t, env.Error)
	assert.Equal(t, "409", env.Error.Code)
	assert.Contains(t, env.Error.Message, "unable to find unique filename")
	assert.Contains(t, env.Error.Message, "5 attempts")
}

func TestResolveNonCollidingS3Key_PreservesDirectoryPrefix(t *testing.T) {
	t.Parallel()
	client := newKeyCollisionS3Client("folder/sub/file.csv", "folder/sub/file-1.csv")
	key, err := resolveNonCollidingS3Key(context.Background(), client, "my-bucket", "folder/sub/file.csv", 10)
	assert.NoError(t, err)
	assert.Equal(t, "folder/sub/file-2.csv", key)
}

func TestResolveNonCollidingS3Key_DirectoryTrailingSlash(t *testing.T) {
	t.Parallel()
	// Key "path/to/" has empty filename; first free candidate is "path/to/-1".
	client := newKeyCollisionS3Client("path/to/")
	key, err := resolveNonCollidingS3Key(context.Background(), client, "my-bucket", "path/to/", 10)
	assert.NoError(t, err)
	assert.Equal(t, "path/to/-1", key)
}

// headRaceS3Client simulates HeadObject showing a free key while PutObject hits a conditional conflict (concurrent writer).
type headRaceS3Client struct{ s3mocks.MockS3Client }

func (headRaceS3Client) ObjectExists(context.Context, string, string) (bool, error) {
	return false, nil
}

func (headRaceS3Client) UploadObject(context.Context, string, string, io.Reader, string) error {
	return s3int.ErrObjectAlreadyExists
}

func TestPostS3FileHandler_PutConflictAfterHeadReturns409(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&headRaceS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "race.csv", []byte("a,b\n"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/race.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusConflict, res.StatusCode)
	var env ErrorEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	require.NotNil(t, env.Error)
	assert.Equal(t, "409", env.Error.Code)
	assert.Contains(t, env.Error.Message, "upload conflict")
}

func buildMultipartFileUpload(t *testing.T, fieldName, fileName string, contents []byte) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile(fieldName, fileName)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = part.Write(contents); err != nil {
		t.Fatal(err)
	}
	if err = writer.Close(); err != nil {
		t.Fatal(err)
	}
	return &buf, writer.FormDataContentType()
}

func mockS3Secret(name, namespace string) corev1.Secret {
	return corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			UID:       types.UID("uid-1"),
		},
		Data: map[string][]byte{
			"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
			"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
			"AWS_DEFAULT_REGION":    []byte("us-east-1"),
			"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
		},
	}
}

// ---------------------------------------------------------------------------
// isS3ConnectivityError tests
// ---------------------------------------------------------------------------

func TestIsS3ConnectivityError(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "context.DeadlineExceeded",
			err:  context.DeadlineExceeded,
			want: true,
		},
		{
			name: "wrapped context.DeadlineExceeded",
			err:  fmt.Errorf("s3 call failed: %w", context.DeadlineExceeded),
			want: true,
		},
		{
			name: "net.Error timeout",
			err:  &net.DNSError{IsTimeout: true, Name: "s3.example.com", Err: "i/o timeout"},
			want: true,
		},
		{
			name: "net.OpError dial connection refused",
			err:  &net.OpError{Op: "dial", Net: "tcp", Err: fmt.Errorf("connection refused")},
			want: true,
		},
		{
			name: "net.OpError write (not connectivity)",
			err:  &net.OpError{Op: "write", Net: "tcp", Err: fmt.Errorf("connection reset by peer")},
			want: false,
		},
		{
			name: "net.DNSError no such host",
			err:  &net.DNSError{Err: "no such host", Name: "s3.airgapped.local"},
			want: true,
		},
		{
			name: "wrapped net.OpError dial",
			err:  fmt.Errorf("s3 call failed: %w", &net.OpError{Op: "dial", Net: "tcp", Err: fmt.Errorf("connection refused")}),
			want: true,
		},
		{
			name: "wrapped net.DNSError",
			err:  fmt.Errorf("lookup failed: %w", &net.DNSError{Err: "no such host", Name: "s3.example.com"}),
			want: true,
		},
		{
			name: "wrapped timeout error",
			err:  fmt.Errorf("request failed: %w", &net.DNSError{IsTimeout: true, Name: "s3.example.com", Err: "i/o timeout"}),
			want: true,
		},
		{
			name: "net.ErrClosed",
			err:  net.ErrClosed,
			want: true,
		},
		{
			name: "wrapped net.ErrClosed",
			err:  fmt.Errorf("http2: client conn not usable: %w", net.ErrClosed),
			want: true,
		},
		{
			name: "generic error",
			err:  fmt.Errorf("something went wrong"),
			want: false,
		},
		{
			name: "nil error",
			err:  nil,
			want: false,
		},
		{
			name: "access denied error (not connectivity)",
			err:  s3AccessDeniedError{},
			want: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tt.want, isS3ConnectivityError(tt.err))
		})
	}
}

func TestS3ConnectivityErrorMessage(t *testing.T) {
	t.Parallel()
	msg := s3ConnectivityErrorMessage("my-test-bucket")
	assert.Contains(t, msg, "my-test-bucket")
	assert.Contains(t, msg, "Unable to connect")
	assert.Contains(t, msg, "air-gapped")
	assert.Contains(t, msg, "S3 endpoint URL")
}

// ---------------------------------------------------------------------------
// Handler-level S3 connectivity error tests
// ---------------------------------------------------------------------------

// connectivityErrorS3Client returns a net.OpError for all operations,
// simulating an unreachable S3 endpoint.
type connectivityErrorS3Client struct {
	s3mocks.MockS3Client
}

func (c *connectivityErrorS3Client) GetObject(_ context.Context, _, _ string) (io.ReadCloser, string, error) {
	return nil, "", &net.OpError{Op: "dial", Net: "tcp", Err: fmt.Errorf("i/o timeout")}
}

func (c *connectivityErrorS3Client) ListObjects(_ context.Context, _ string, _ s3int.ListObjectsOptions) (*models.S3ListObjectsResponse, error) {
	return nil, &net.OpError{Op: "dial", Net: "tcp", Err: fmt.Errorf("i/o timeout")}
}

func (c *connectivityErrorS3Client) ObjectExists(_ context.Context, _ string, _ string) (bool, error) {
	return false, &net.OpError{Op: "dial", Net: "tcp", Err: fmt.Errorf("i/o timeout")}
}

func (c *connectivityErrorS3Client) UploadObject(_ context.Context, _ string, _ string, _ io.Reader, _ string) error {
	return &net.OpError{Op: "dial", Net: "tcp", Err: fmt.Errorf("i/o timeout")}
}

func (c *connectivityErrorS3Client) GetCSVSchema(_ context.Context, _, _ string) (s3int.CSVSchemaResult, error) {
	return s3int.CSVSchemaResult{}, &net.OpError{Op: "dial", Net: "tcp", Err: fmt.Errorf("i/o timeout")}
}

func TestGetS3FileHandler_ViewSchema_ConnectivityError_Returns503(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&connectivityErrorS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	rr := setupS3ApiTestWithBody(
		http.MethodGet,
		"/api/v1/s3/files/file.csv?view=schema&namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		http.NoBody,
		"",
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusServiceUnavailable, res.StatusCode)
	var env ErrorEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	require.NotNil(t, env.Error)
	assert.Equal(t, "503", env.Error.Code)
	assert.Contains(t, env.Error.Message, "my-bucket")
	assert.Contains(t, env.Error.Message, "Unable to connect")
}

func TestGetS3FileHandler_ConnectivityError_Returns503(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&connectivityErrorS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	rr := setupS3ApiTestWithBody(
		http.MethodGet,
		"/api/v1/s3/files/file.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		http.NoBody,
		"",
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusServiceUnavailable, res.StatusCode)
	var env ErrorEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	require.NotNil(t, env.Error)
	assert.Equal(t, "503", env.Error.Code)
	assert.Contains(t, env.Error.Message, "my-bucket")
	assert.Contains(t, env.Error.Message, "Unable to connect")
}

func TestGetS3FilesHandler_ConnectivityError_Returns503(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&connectivityErrorS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	rr := setupS3ApiTestWithBody(
		http.MethodGet,
		"/api/v1/s3/files?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		http.NoBody,
		"",
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusServiceUnavailable, res.StatusCode)
	var env ErrorEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	require.NotNil(t, env.Error)
	assert.Equal(t, "503", env.Error.Code)
	assert.Contains(t, env.Error.Message, "my-bucket")
	assert.Contains(t, env.Error.Message, "air-gapped")
}

func TestPostS3FileHandler_ConnectivityError_OnResolveKey_Returns503(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&connectivityErrorS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "data.csv", []byte("a,b\n1,2\n"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/data.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusServiceUnavailable, res.StatusCode)
	var env ErrorEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	require.NotNil(t, env.Error)
	assert.Equal(t, "503", env.Error.Code)
	assert.Contains(t, env.Error.Message, "my-bucket")
}

// connectivityErrorOnUploadS3Client returns connectivity errors only on upload,
// simulating an endpoint reachable for HEAD but failing on PUT.
type connectivityErrorOnUploadS3Client struct {
	s3mocks.MockS3Client
}

func (c *connectivityErrorOnUploadS3Client) ObjectExists(_ context.Context, _ string, _ string) (bool, error) {
	return false, nil
}

func (c *connectivityErrorOnUploadS3Client) UploadObject(_ context.Context, _ string, _ string, _ io.Reader, _ string) error {
	return &net.OpError{Op: "dial", Net: "tcp", Err: fmt.Errorf("connection refused")}
}

func TestPostS3FileHandler_ConnectivityError_OnUpload_Returns503(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(&connectivityErrorOnUploadS3Client{})
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "data.csv", []byte("a,b\n1,2\n"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/data.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusServiceUnavailable, res.StatusCode)
	var env ErrorEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	require.NotNil(t, env.Error)
	assert.Equal(t, "503", env.Error.Code)
	assert.Contains(t, env.Error.Message, "Unable to connect")
}

func TestResolveCsvMultipartContentType_MalformedContentTypeHeader(t *testing.T) {
	t.Parallel()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="file"; filename="x.csv"`)
	h.Set("Content-Type", `text/csv; foo="unclosed`)
	part, err := mw.CreatePart(h)
	require.NoError(t, err)
	_, err = part.Write([]byte("a"))
	require.NoError(t, err)
	require.NoError(t, mw.Close())
	_, params, err := mime.ParseMediaType(mw.FormDataContentType())
	require.NoError(t, err)
	mr := multipart.NewReader(bytes.NewReader(buf.Bytes()), params["boundary"])
	p, err := mr.NextPart()
	require.NoError(t, err)

	_, err = resolveCsvMultipartContentType(p)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid Content-Type")
}

func TestResolveCsvMultipartContentType_EmptyFilenameAndNoContentType(t *testing.T) {
	t.Parallel()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="file"; filename=""`)
	part, err := mw.CreatePart(h)
	require.NoError(t, err)
	_, err = part.Write([]byte("a,b\n"))
	require.NoError(t, err)
	require.NoError(t, mw.Close())
	_, params, err := mime.ParseMediaType(mw.FormDataContentType())
	require.NoError(t, err)
	mr := multipart.NewReader(bytes.NewReader(buf.Bytes()), params["boundary"])
	p, err := mr.NextPart()
	require.NoError(t, err)

	_, err = resolveCsvMultipartContentType(p)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "only CSV files are supported")
}

func TestSanitizeS3ResponseContentType(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"empty", "", "application/octet-stream"},
		{"whitespace only", "   ", "application/octet-stream"},
		{"csv", "text/csv", "text/csv"},
		{"csv charset", "text/csv; charset=utf-8", "text/csv"},
		{"csv upper", "TEXT/CSV; Charset=UTF-8", "text/csv"},
		{"json", "application/json", "application/json"},
		{"json charset", "application/json; charset=utf-8", "application/json"},
		{"json upper", "APPLICATION/JSON", "application/json"},
		{"pdf", "application/pdf", "application/octet-stream"},
		{"plain", "text/plain", "application/octet-stream"},
		{"invalid", "not a mime type", "application/octet-stream"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tt.want, sanitizeS3ResponseContentType(tt.in))
		})
	}
}

func TestPostS3FileHandler_RejectsNonCsvContentType(t *testing.T) {
	t.Parallel()
	mockSecrets := []corev1.Secret{mockS3Secret("aws-secret-1", "test-namespace")}
	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="file"; filename="train.csv"`)
	h.Set("Content-Type", "text/plain")
	part, err := mw.CreatePart(h)
	assert.NoError(t, err)
	_, err = part.Write([]byte("a,b\n1,2\n"))
	assert.NoError(t, err)
	assert.NoError(t, mw.Close())

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/train.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		&buf,
		mw.FormDataContentType(),
		factory,
		s3mocks.NewMockClientFactory(),
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

// ---------------------------------------------------------------------------
// Metadata timeout tests
// ---------------------------------------------------------------------------

// deadlineCapturingS3Client records the context passed to each S3 operation
// so tests can verify that handlers set appropriate deadlines.
type deadlineCapturingS3Client struct {
	s3mocks.MockS3Client
	capturedCtx context.Context
}

func (c *deadlineCapturingS3Client) ListObjects(ctx context.Context, bucket string, options s3int.ListObjectsOptions) (*models.S3ListObjectsResponse, error) {
	c.capturedCtx = ctx
	return c.MockS3Client.ListObjects(ctx, bucket, options)
}

func (c *deadlineCapturingS3Client) GetCSVSchema(ctx context.Context, bucket, key string) (s3int.CSVSchemaResult, error) {
	c.capturedCtx = ctx
	return c.MockS3Client.GetCSVSchema(ctx, bucket, key)
}

func (c *deadlineCapturingS3Client) GetObject(ctx context.Context, bucket, key string) (io.ReadCloser, string, error) {
	c.capturedCtx = ctx
	return c.MockS3Client.GetObject(ctx, bucket, key)
}

func (c *deadlineCapturingS3Client) ObjectExists(ctx context.Context, bucket, key string) (bool, error) {
	c.capturedCtx = ctx
	return c.MockS3Client.ObjectExists(ctx, bucket, key)
}

func TestGetS3FilesHandler_SetsMetadataTimeout(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	capturingClient := &deadlineCapturingS3Client{}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(capturingClient)
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	rr := setupS3ApiTestWithBody(
		http.MethodGet,
		"/api/v1/s3/files?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		http.NoBody,
		"",
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)

	// Verify the handler set a deadline on the context passed to ListObjects.
	require.NotNil(t, capturingClient.capturedCtx, "ListObjects should have been called")
	deadline, hasDeadline := capturingClient.capturedCtx.Deadline()
	assert.True(t, hasDeadline, "context passed to ListObjects should have a deadline from s3MetadataTimeout")
	assert.WithinDuration(t, time.Now().Add(s3MetadataTimeout), deadline, 5*time.Second,
		"deadline should be approximately s3MetadataTimeout from request time")
}

func TestGetS3FileHandler_ViewSchema_SetsMetadataTimeout(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	capturingClient := &deadlineCapturingS3Client{}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(capturingClient)
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	rr := setupS3ApiTestWithBody(
		http.MethodGet,
		"/api/v1/s3/files/data.csv?view=schema&namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		http.NoBody,
		"",
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)

	// Verify the handler set a deadline on the context passed to GetCSVSchema.
	require.NotNil(t, capturingClient.capturedCtx, "GetCSVSchema should have been called")
	deadline, hasDeadline := capturingClient.capturedCtx.Deadline()
	assert.True(t, hasDeadline, "context passed to GetCSVSchema should have a deadline from s3MetadataTimeout")
	assert.WithinDuration(t, time.Now().Add(s3MetadataTimeout), deadline, 5*time.Second,
		"deadline should be approximately s3MetadataTimeout from request time")
}

// TestGetS3FileHandler_DoesNotSetMetadataTimeout verifies that file-transfer
// handlers do NOT impose the metadata timeout — large downloads need an
// unbounded response window.
func TestGetS3FileHandler_DoesNotSetMetadataTimeout(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	capturingClient := &deadlineCapturingS3Client{}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(capturingClient)
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	rr := setupS3ApiTestWithBody(
		http.MethodGet,
		"/api/v1/s3/files/README.md?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		http.NoBody,
		"",
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)

	// The file-transfer handler should NOT set its own deadline.
	require.NotNil(t, capturingClient.capturedCtx, "GetObject should have been called")
	_, hasDeadline := capturingClient.capturedCtx.Deadline()
	assert.False(t, hasDeadline, "context passed to GetObject should NOT have a handler-imposed deadline")
}

func TestGetS3FileHandler_FileNamedSchema_ReturnsFileContents(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	rr := setupS3ApiTestWithBody(
		http.MethodGet,
		"/api/v1/s3/files/"+url.PathEscape("inafolder/schema")+"?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		http.NoBody,
		"",
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.NotEqual(t, "application/json", res.Header.Get("Content-Type"),
		"file named 'schema' without view=schema should stream file contents, not return JSON schema")
}

func TestGetS3FileHandler_UnknownView_Returns400(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	s3Factory := s3mocks.NewMockClientFactory()
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	rr := setupS3ApiTestWithBody(
		http.MethodGet,
		"/api/v1/s3/files/data.csv?view=unknown&namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		http.NoBody,
		"",
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	var env ErrorEnvelope
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &env))
	require.NotNil(t, env.Error)
	assert.Contains(t, env.Error.Message, "unsupported view")
}

func TestPostS3FileHandler_SetsMetadataTimeoutForResolveKey(t *testing.T) {
	t.Parallel()
	secret := mockS3Secret("aws-secret-1", "test-namespace")
	k8sFactory := &mockKubernetesClientFactoryForSecrets{client: &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}}
	capturingClient := &deadlineCapturingS3Client{}
	s3Factory := s3mocks.NewMockClientFactory()
	s3Factory.SetMockClient(capturingClient)
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}
	body, contentType := buildMultipartFileUpload(t, "file", "data.csv", []byte("a,b\n1,2\n"))

	rr := setupS3ApiTestWithBody(
		http.MethodPost,
		"/api/v1/s3/files/data.csv?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket",
		body,
		contentType,
		k8sFactory,
		s3Factory,
		identity,
		nil,
		nil,
	)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusCreated, res.StatusCode)

	// Verify the handler set a deadline on the context passed to ObjectExists
	// (called by resolveNonCollidingS3Key).
	require.NotNil(t, capturingClient.capturedCtx, "ObjectExists should have been called")
	deadline, hasDeadline := capturingClient.capturedCtx.Deadline()
	assert.True(t, hasDeadline, "context passed to ObjectExists should have a deadline from s3MetadataTimeout")
	assert.WithinDuration(t, time.Now().Add(s3MetadataTimeout), deadline, 5*time.Second,
		"deadline should be approximately s3MetadataTimeout from request time")
}

// ---------------------------------------------------------------------------
// preserveRawPath + url.PathUnescape integration
// ---------------------------------------------------------------------------

// keyCaptureS3Client records the key passed to GetObject so tests can assert
// that the preserveRawPath middleware + url.PathUnescape pipeline decodes
// percent-encoded S3 keys exactly once.
type keyCaptureS3Client struct {
	s3mocks.MockS3Client
	capturedKey string
}

func (c *keyCaptureS3Client) GetObject(ctx context.Context, bucket, key string) (io.ReadCloser, string, error) {
	c.capturedKey = key
	return c.MockS3Client.GetObject(ctx, bucket, key)
}

func TestPreserveRawPath_S3KeyDecoding(t *testing.T) {
	tests := []struct {
		name        string
		encodedKey  string
		expectedKey string
	}{
		{
			name:        "slash encoded as %2F",
			encodedKey:  "docs%2Ffile.pdf",
			expectedKey: "docs/file.pdf",
		},
		{
			name:        "space encoded as %20",
			encodedKey:  "my%20file.csv",
			expectedKey: "my file.csv",
		},
		{
			name:        "plain key without encoding",
			encodedKey:  "simple.csv",
			expectedKey: "simple.csv",
		},
		{
			name:        "multiple encoded segments",
			encodedKey:  "path%2Fto%2Fdeep%2Ffile.csv",
			expectedKey: "path/to/deep/file.csv",
		},
		{
			name:        "double-encoded %252F preserves literal percent-2F",
			encodedKey:  "docs%252Ffile.csv",
			expectedKey: "docs%2Ffile.csv",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			secret := mockS3Secret("aws-secret-1", "test-namespace")
			k8sClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{secret}}
			k8sFactory := &mockKubernetesClientFactoryForSecrets{client: k8sClient}
			capture := &keyCaptureS3Client{}
			s3Factory := s3mocks.NewMockClientFactory()
			s3Factory.SetMockClient(capture)
			identity := &kubernetes.RequestIdentity{UserID: "test-user"}

			reqURL := "/api/v1/s3/files/" + tt.encodedKey + "?namespace=test-namespace&secretName=aws-secret-1&bucket=my-bucket"
			rr := setupS3ApiTestWithBody(
				http.MethodGet, reqURL,
				http.NoBody, "",
				k8sFactory, s3Factory,
				identity, nil, nil,
			)

			assert.Equal(t, http.StatusOK, rr.Code, "handler should succeed for key %q", tt.encodedKey)
			assert.Equal(t, tt.expectedKey, capture.capturedKey,
				"key should be decoded exactly once: %q → %q", tt.encodedKey, tt.expectedKey)
		})
	}
}
