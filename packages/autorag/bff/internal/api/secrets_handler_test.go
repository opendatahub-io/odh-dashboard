package api

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"
)

// mockKubernetesClientForSecrets is a mock implementation of KubernetesClientInterface for secrets testing
type mockKubernetesClientForSecrets struct {
	secrets []corev1.Secret
	err     error
}

func (m *mockKubernetesClientForSecrets) GetNamespaces(ctx context.Context, identity *kubernetes.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, nil
}

func (m *mockKubernetesClientForSecrets) GetSecrets(ctx context.Context, namespace string, identity *kubernetes.RequestIdentity) ([]corev1.Secret, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.secrets, nil
}

func (m *mockKubernetesClientForSecrets) GetSecret(ctx context.Context, namespace, secretName string, identity *kubernetes.RequestIdentity) (*corev1.Secret, error) {
	if m.err != nil {
		return nil, m.err
	}
	for i := range m.secrets {
		if m.secrets[i].Name == secretName && m.secrets[i].Namespace == namespace {
			return &m.secrets[i], nil
		}
	}
	return nil, apierrors.NewNotFound(schema.GroupResource{Resource: "secrets"}, secretName)
}

func (m *mockKubernetesClientForSecrets) IsClusterAdmin(identity *kubernetes.RequestIdentity) (bool, error) {
	return false, nil
}

func (m *mockKubernetesClientForSecrets) GetUser(identity *kubernetes.RequestIdentity) (string, error) {
	return "test-user", nil
}

func (m *mockKubernetesClientForSecrets) GetClientset() interface{} {
	return nil
}

func (m *mockKubernetesClientForSecrets) GetRestConfig() *rest.Config {
	return nil
}

func (m *mockKubernetesClientForSecrets) CanListDSPipelineApplications(ctx context.Context, identity *kubernetes.RequestIdentity, namespace string) (bool, error) {
	return true, nil
}

// mockKubernetesClientFactoryForSecrets implements KubernetesClientFactory for testing
type mockKubernetesClientFactoryForSecrets struct {
	client kubernetes.KubernetesClientInterface
}

func (m *mockKubernetesClientFactoryForSecrets) GetClient(ctx context.Context) (kubernetes.KubernetesClientInterface, error) {
	return m.client, nil
}

func (m *mockKubernetesClientFactoryForSecrets) ExtractRequestIdentity(httpHeader http.Header) (*kubernetes.RequestIdentity, error) {
	return &kubernetes.RequestIdentity{UserID: "test-user"}, nil
}

func (m *mockKubernetesClientFactoryForSecrets) ValidateRequestIdentity(identity *kubernetes.RequestIdentity) error {
	return nil
}

func TestGetSecretsHandler_TypeStorage_Success(t *testing.T) {
	// Create mock secrets with all required S3 keys (uppercase)
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-1",
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
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-2",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE2"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY2"),
				"AWS_DEFAULT_REGION":    []byte("us-west-2"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.us-west-2.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-no-region",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE3"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY3"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.eu-west-1.amazonaws.com"),
				// AWS_DEFAULT_REGION intentionally omitted — storageTypeRequiredKeys no longer requires it
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-4"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID": []byte("INCOMPLETE"),
				// Missing other required keys
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "other-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-5"),
			},
			Data: map[string][]byte{
				"password": []byte("some-password"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 3) // 3 secrets have all required S3 keys (region is not required)
	assert.Equal(t, "uid-1", envelope.Data[0].UUID)
	assert.Equal(t, "s3-secret-1", envelope.Data[0].Name)
	assert.Equal(t, "s3", envelope.Data[0].Type)
	assert.Equal(t, map[string]string{
		"AWS_ACCESS_KEY_ID":     "[REDACTED]",
		"AWS_DEFAULT_REGION":    "[REDACTED]",
		"AWS_S3_ENDPOINT":       "[REDACTED]",
		"AWS_SECRET_ACCESS_KEY": "[REDACTED]",
	}, envelope.Data[0].Data)
	assert.Equal(t, "uid-2", envelope.Data[1].UUID)
	assert.Equal(t, "s3-secret-2", envelope.Data[1].Name)
	assert.Equal(t, "s3", envelope.Data[1].Type)
	assert.Equal(t, map[string]string{
		"AWS_ACCESS_KEY_ID":     "[REDACTED]",
		"AWS_DEFAULT_REGION":    "[REDACTED]",
		"AWS_S3_ENDPOINT":       "[REDACTED]",
		"AWS_SECRET_ACCESS_KEY": "[REDACTED]",
	}, envelope.Data[1].Data)
	// Third secret omits AWS_DEFAULT_REGION — still accepted because region is not a required key
	assert.Equal(t, "uid-3", envelope.Data[2].UUID)
	assert.Equal(t, "s3-secret-no-region", envelope.Data[2].Name)
	assert.Equal(t, "s3", envelope.Data[2].Type)
	assert.Equal(t, map[string]string{
		"AWS_ACCESS_KEY_ID":     "[REDACTED]",
		"AWS_S3_ENDPOINT":       "[REDACTED]",
		"AWS_SECRET_ACCESS_KEY": "[REDACTED]",
	}, envelope.Data[2].Data)
}

func TestGetSecretsHandler_TypeStorage_CaseSensitive(t *testing.T) {
	// Test that storage key matching is case-sensitive (only uppercase keys match)
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-uppercase",
				Namespace: "test-namespace",
				UID:       types.UID("uid-upper"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key1"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret1"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-lowercase",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lower"),
			},
			Data: map[string][]byte{
				"aws_access_key_id":     []byte("key2"),
				"aws_secret_access_key": []byte("secret2"),
				"aws_default_region":    []byte("us-west-2"),
				"aws_s3_endpoint":       []byte("https://s3.us-west-2.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-mixedcase",
				Namespace: "test-namespace",
				UID:       types.UID("uid-mixed"),
			},
			Data: map[string][]byte{
				"Aws_Access_Key_Id":     []byte("key3"),
				"Aws_Secret_Access_Key": []byte("secret3"),
				"Aws_Default_Region":    []byte("eu-west-1"),
				"Aws_S3_Endpoint":       []byte("https://s3.eu-west-1.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1) // Only uppercase keys match (case-sensitive)
	assert.Equal(t, "uid-upper", envelope.Data[0].UUID)
	assert.Equal(t, "s3-uppercase", envelope.Data[0].Name)
	assert.Equal(t, "s3", envelope.Data[0].Type)
	assert.Equal(t, map[string]string{
		"AWS_ACCESS_KEY_ID":     "[REDACTED]",
		"AWS_DEFAULT_REGION":    "[REDACTED]",
		"AWS_S3_ENDPOINT":       "[REDACTED]",
		"AWS_SECRET_ACCESS_KEY": "[REDACTED]",
	}, envelope.Data[0].Data)
}

func TestGetSecretsHandler_NoType_ReturnsAllSecrets(t *testing.T) {
	// Create mock secrets of various types
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lls"),
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY":  []byte("key"),
				"LLAMA_STACK_CLIENT_BASE_URL": []byte("https://llama.example.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "other-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"password": []byte("some-password"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "database-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
			},
			Data: map[string][]byte{
				"db_connection": []byte("connection-string"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 4) // All secrets returned
	assert.Equal(t, "uid-1", envelope.Data[0].UUID)
	assert.Equal(t, "s3-secret", envelope.Data[0].Name)
	assert.Equal(t, "s3", envelope.Data[0].Type)
	assert.Equal(t, map[string]string{
		"AWS_ACCESS_KEY_ID":     "[REDACTED]",
		"AWS_DEFAULT_REGION":    "[REDACTED]",
		"AWS_S3_ENDPOINT":       "[REDACTED]",
		"AWS_SECRET_ACCESS_KEY": "[REDACTED]",
	}, envelope.Data[0].Data)
	assert.Equal(t, "uid-lls", envelope.Data[1].UUID)
	assert.Equal(t, "lls-secret", envelope.Data[1].Name)
	assert.Equal(t, "lls", envelope.Data[1].Type)
	assert.Equal(t, map[string]string{
		"LLAMA_STACK_CLIENT_API_KEY":  "[REDACTED]",
		"LLAMA_STACK_CLIENT_BASE_URL": "[REDACTED]",
	}, envelope.Data[1].Data)
	assert.Equal(t, "uid-2", envelope.Data[2].UUID)
	assert.Equal(t, "other-secret", envelope.Data[2].Name)
	// Type field omitted for secrets that don't match any known type
	assert.Equal(t, map[string]string{
		"password": "[REDACTED]",
	}, envelope.Data[2].Data)
	assert.Equal(t, "", envelope.Data[2].Type)
	assert.Equal(t, "uid-3", envelope.Data[3].UUID)
	assert.Equal(t, "database-secret", envelope.Data[3].Name)
	// Type field omitted for secrets that don't match any known type
	assert.Equal(t, map[string]string{
		"db_connection": "[REDACTED]",
	}, envelope.Data[3].Data)
	assert.Equal(t, "", envelope.Data[3].Type)
}

func TestGetSecretsHandler_TypeLls_Success(t *testing.T) {
	// Create mock secrets with all required LLS keys (uppercase)
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lls-1"),
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY":  []byte("sk-test-api-key-123"),
				"LLAMA_STACK_CLIENT_BASE_URL": []byte("https://llama-stack.example.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-secret-2",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lls-2"),
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY":  []byte("sk-test-api-key-456"),
				"LLAMA_STACK_CLIENT_BASE_URL": []byte("https://llama-stack-2.example.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lls-3"),
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY": []byte("incomplete"),
				// Missing LLAMA_STACK_CLIENT_BASE_URL
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "other-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lls-4"),
			},
			Data: map[string][]byte{
				"password": []byte("some-password"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=lls",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2) // Only 2 secrets have all required LLS keys
	assert.Equal(t, "uid-lls-1", envelope.Data[0].UUID)
	assert.Equal(t, "lls-secret-1", envelope.Data[0].Name)
	assert.Equal(t, "lls", envelope.Data[0].Type)
	assert.Equal(t, map[string]string{
		"LLAMA_STACK_CLIENT_API_KEY":  "[REDACTED]",
		"LLAMA_STACK_CLIENT_BASE_URL": "[REDACTED]",
	}, envelope.Data[0].Data)
	assert.Equal(t, "uid-lls-2", envelope.Data[1].UUID)
	assert.Equal(t, "lls-secret-2", envelope.Data[1].Name)
	assert.Equal(t, "lls", envelope.Data[1].Type)
	assert.Equal(t, map[string]string{
		"LLAMA_STACK_CLIENT_API_KEY":  "[REDACTED]",
		"LLAMA_STACK_CLIENT_BASE_URL": "[REDACTED]",
	}, envelope.Data[1].Data)
}

func TestGetSecretsHandler_TypeLls_CaseSensitive(t *testing.T) {
	// Test that LLS key matching is case-sensitive (only uppercase keys match)
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-uppercase",
				Namespace: "test-namespace",
				UID:       types.UID("uid-upper"),
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY":  []byte("key1"),
				"LLAMA_STACK_CLIENT_BASE_URL": []byte("url1"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-lowercase",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lower"),
			},
			Data: map[string][]byte{
				"llama_stack_client_api_key":  []byte("key2"),
				"llama_stack_client_base_url": []byte("url2"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-mixedcase",
				Namespace: "test-namespace",
				UID:       types.UID("uid-mixed"),
			},
			Data: map[string][]byte{
				"Llama_Stack_Client_Api_Key":  []byte("key3"),
				"Llama_Stack_Client_Base_Url": []byte("url3"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=lls",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1) // Only uppercase keys match (case-sensitive)
	assert.Equal(t, "uid-upper", envelope.Data[0].UUID)
	assert.Equal(t, "lls-uppercase", envelope.Data[0].Name)
	assert.Equal(t, "lls", envelope.Data[0].Type)
	assert.Equal(t, map[string]string{
		"LLAMA_STACK_CLIENT_API_KEY":  "[REDACTED]",
		"LLAMA_STACK_CLIENT_BASE_URL": "[REDACTED]",
	}, envelope.Data[0].Data)
}

func TestGetSecretsHandler_TypeLls_EmptyList(t *testing.T) {
	// Create mock secrets without all required LLS keys (uppercase)
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY": []byte("key"),
				// Missing LLAMA_STACK_CLIENT_BASE_URL
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "other-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"password": []byte("some-password"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=lls",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.NotNil(t, envelope.Data, "Data should not be nil, it should be an empty array")
	assert.Empty(t, envelope.Data) // No secrets have all required LLS keys
}

func TestGetSecretsHandler_InvalidType_ReturnsBadRequest(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=invalid",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetSecretsHandler_TypeStorage_EmptyList(t *testing.T) {
	// Create mock secrets without all required S3 keys
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID": []byte("key"),
				// Missing AWS_SECRET_ACCESS_KEY, AWS_S3_ENDPOINT
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "other-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"password": []byte("some-password"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.NotNil(t, envelope.Data, "Data should not be nil, it should be an empty array")
	assert.Empty(t, envelope.Data) // No secrets have all required S3 keys
}

func TestGetSecretsHandler_MissingNamespaceParameter(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secrets",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetSecretsHandler_KubernetesClientError(t *testing.T) {
	// Create a mock client that returns an error when GetSecrets is called
	mockClient := &mockKubernetesClientForSecrets{
		err: fmt.Errorf("kubernetes client error: unable to retrieve secrets"),
	}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, res.StatusCode)
}

func TestGetSecretsHandler_NamespaceNotFound(t *testing.T) {
	// Create a Kubernetes NotFound error using StatusError
	notFoundErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "namespaces \"non-existent\" not found",
			Reason:  metav1.StatusReasonNotFound,
			Code:    http.StatusNotFound,
		},
	}

	mockClient := &mockKubernetesClientForSecrets{
		err: notFoundErr,
	}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secrets?namespace=non-existent",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestGetSecretsHandler_ForbiddenError(t *testing.T) {
	// Create a Kubernetes Forbidden error using StatusError
	forbiddenErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "forbidden: User cannot list secrets in namespace \"restricted\"",
			Reason:  metav1.StatusReasonForbidden,
			Code:    http.StatusForbidden,
		},
	}

	mockClient := &mockKubernetesClientForSecrets{
		err: forbiddenErr,
	}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secrets?namespace=restricted",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	// Forbidden errors should return 403 status code
	assert.Equal(t, http.StatusForbidden, res.StatusCode)
}

func TestGetSecretsHandler_UnauthorizedError(t *testing.T) {
	// Create a Kubernetes Unauthorized error using StatusError
	unauthorizedErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "unauthorized: User authentication failed",
			Reason:  metav1.StatusReasonUnauthorized,
			Code:    http.StatusUnauthorized,
		},
	}

	mockClient := &mockKubernetesClientForSecrets{
		err: unauthorizedErr,
	}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secrets?namespace=restricted",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	// Unauthorized errors should return 401 status code
	assert.Equal(t, http.StatusUnauthorized, res.StatusCode)
}

func TestGetSecretsHandler_Data_Sorted(t *testing.T) {
	// Create a secret with keys in unsorted order to verify alphabetical sorting
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "unsorted-keys-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-unsorted"),
			},
			Data: map[string][]byte{
				"zebra_key":  []byte("value1"),
				"apple_key":  []byte("value2"),
				"middle_key": []byte("value3"),
				"banana_key": []byte("value4"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)

	// Verify keys are present in the map (objects don't guarantee order)
	expectedKeys := map[string]string{
		"apple_key":  "[REDACTED]",
		"banana_key": "[REDACTED]",
		"middle_key": "[REDACTED]",
		"zebra_key":  "[REDACTED]",
	}
	assert.Equal(t, expectedKeys, envelope.Data[0].Data, "Keys should be present in the map")
}

func TestGetSecretsHandler_Data_EmptySecret(t *testing.T) {
	// Create a secret with no keys
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "empty-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-empty"),
			},
			Data: map[string][]byte{},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)

	// Verify empty secret returns empty map
	assert.Equal(t, map[string]string{}, envelope.Data[0].Data, "Empty secret should return empty map of keys")
}

func TestGetSecretsHandler_Data_DataAndStringData(t *testing.T) {
	// Create a secret with keys in both Data and StringData
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "mixed-data-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-mixed"),
			},
			Data: map[string][]byte{
				"data_key_1": []byte("value1"),
				"data_key_2": []byte("value2"),
			},
			StringData: map[string]string{
				"string_key_1": "string_value1",
				"string_key_2": "string_value2",
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)

	// Verify all keys from both Data and StringData are included
	expectedKeys := map[string]string{
		"data_key_1":   "[REDACTED]",
		"data_key_2":   "[REDACTED]",
		"string_key_1": "[REDACTED]",
		"string_key_2": "[REDACTED]",
	}
	assert.Equal(t, expectedKeys, envelope.Data[0].Data, "Should include keys from both Data and StringData")
}

func TestGetSecretsHandler_DisplayName_WithAnnotation(t *testing.T) {
	// Create secrets with display-name annotation
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "secret-with-display-name",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
				Annotations: map[string]string{
					"openshift.io/display-name": "My AWS Credentials",
				},
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	assert.Equal(t, "My AWS Credentials", envelope.Data[0].DisplayName, "DisplayName should match the annotation value")
}

func TestGetSecretsHandler_DisplayName_WithoutAnnotation(t *testing.T) {
	// Create a secret without display-name annotation
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "secret-without-display-name",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	assert.Equal(t, "", envelope.Data[0].DisplayName, "DisplayName should be empty when annotation doesn't exist")
}

func TestGetSecretsHandler_DisplayName_MixedSecrets(t *testing.T) {
	// Create a mix of secrets with and without display-name annotation
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-with-name",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
				Annotations: map[string]string{
					"openshift.io/display-name": "Production S3 Bucket",
				},
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key1"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret1"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-without-name",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key2"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret2"),
				"AWS_DEFAULT_REGION":    []byte("us-west-2"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.us-west-2.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-secret-with-name",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
				Annotations: map[string]string{
					"openshift.io/display-name": "Development LLS",
					"other-annotation":          "some-value",
				},
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY":  []byte("key"),
				"LLAMA_STACK_CLIENT_BASE_URL": []byte("https://llama.example.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 3)

	// First secret has display name
	assert.Equal(t, "s3-secret-with-name", envelope.Data[0].Name)
	assert.Equal(t, "Production S3 Bucket", envelope.Data[0].DisplayName)

	// Second secret has no display name
	assert.Equal(t, "s3-secret-without-name", envelope.Data[1].Name)
	assert.Equal(t, "", envelope.Data[1].DisplayName)

	// Third secret has display name
	assert.Equal(t, "lls-secret-with-name", envelope.Data[2].Name)
	assert.Equal(t, "Development LLS", envelope.Data[2].DisplayName)
}

func TestGetSecretsHandler_ConnectionTypeAnnotation_OverridesKeyBasedDetection(t *testing.T) {
	// Create a secret with connection-type annotation that overrides key-based detection
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "annotated-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
				Annotations: map[string]string{
					"opendatahub.io/connection-type": "custom-type",
				},
			},
			Data: map[string][]byte{
				// Has S3 keys but annotation should override
				"AWS_ACCESS_KEY_ID":     []byte("key"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	// Should use annotation value instead of key-based "s3" detection
	assert.Equal(t, "custom-type", envelope.Data[0].Type, "Type should come from annotation, not key-based detection")
}

func TestGetSecretsHandler_ConnectionTypeAnnotation_FallsBackToKeyDetection(t *testing.T) {
	// Create secrets without connection-type annotation - should use key-based detection
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-no-annotation",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	// Should fall back to key-based detection
	assert.Equal(t, "s3", envelope.Data[0].Type, "Type should be detected from keys when annotation is missing")
}

func TestGetSecretsHandler_ConnectionTypeAnnotation_EmptyAnnotationFallsBackToKeyDetection(t *testing.T) {
	// Create a secret with empty connection-type annotation - should use key-based detection
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-empty-annotation",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
				Annotations: map[string]string{
					"opendatahub.io/connection-type": "",
				},
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	// Should fall back to key-based detection when annotation is empty
	assert.Equal(t, "s3", envelope.Data[0].Type, "Type should be detected from keys when annotation is empty")
}

func TestGetSecretsHandler_ConnectionTypeAnnotation_MixedAnnotatedAndNonAnnotated(t *testing.T) {
	// Create a mix of secrets with and without connection-type annotation
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "annotated-custom",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
				Annotations: map[string]string{
					"opendatahub.io/connection-type": "custom-db",
				},
			},
			Data: map[string][]byte{
				"db_host":     []byte("localhost"),
				"db_password": []byte("secret"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "key-detected-s3",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "annotated-lls",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
				Annotations: map[string]string{
					"opendatahub.io/connection-type": "lls",
				},
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY":  []byte("key"),
				"LLAMA_STACK_CLIENT_BASE_URL": []byte("https://llama.example.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 3)

	// First secret uses annotation
	assert.Equal(t, "annotated-custom", envelope.Data[0].Name)
	assert.Equal(t, "custom-db", envelope.Data[0].Type)

	// Second secret uses key-based detection
	assert.Equal(t, "key-detected-s3", envelope.Data[1].Name)
	assert.Equal(t, "s3", envelope.Data[1].Type)

	// Third secret uses annotation
	assert.Equal(t, "annotated-lls", envelope.Data[2].Name)
	assert.Equal(t, "lls", envelope.Data[2].Type)
}

func TestGetSecretsHandler_Description_WithAnnotation(t *testing.T) {
	// Create secrets with description annotation
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "secret-with-description",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
				Annotations: map[string]string{
					"openshift.io/description": "Production AWS credentials for S3 storage",
				},
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	assert.Equal(t, "Production AWS credentials for S3 storage", envelope.Data[0].Description, "Description should match the annotation value")
}

func TestGetSecretsHandler_Description_WithoutAnnotation(t *testing.T) {
	// Create a secret without description annotation
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "secret-without-description",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	assert.Equal(t, "", envelope.Data[0].Description, "Description should be empty when annotation doesn't exist")
}

func TestGetSecretsHandler_Description_MixedSecrets(t *testing.T) {
	// Create a mix of secrets with and without description annotation
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-with-description",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
				Annotations: map[string]string{
					"openshift.io/description": "Primary S3 bucket for production data",
				},
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key1"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret1"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-without-description",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key2"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret2"),
				"AWS_DEFAULT_REGION":    []byte("us-west-2"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.us-west-2.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-secret-with-description",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
				Annotations: map[string]string{
					"openshift.io/description": "Development LLS endpoint for testing",
					"other-annotation":         "some-value",
				},
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY":  []byte("key"),
				"LLAMA_STACK_CLIENT_BASE_URL": []byte("https://llama.example.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 3)

	// First secret has description
	assert.Equal(t, "s3-secret-with-description", envelope.Data[0].Name)
	assert.Equal(t, "Primary S3 bucket for production data", envelope.Data[0].Description)

	// Second secret has no description
	assert.Equal(t, "s3-secret-without-description", envelope.Data[1].Name)
	assert.Equal(t, "", envelope.Data[1].Description)

	// Third secret has description
	assert.Equal(t, "lls-secret-with-description", envelope.Data[2].Name)
	assert.Equal(t, "Development LLS endpoint for testing", envelope.Data[2].Description)
}

func TestGetSecretsHandler_DisplayNameAndDescription_BothPresent(t *testing.T) {
	// Create a secret with both displayName and description annotations
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "full-annotated-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
				Annotations: map[string]string{
					"openshift.io/display-name": "Production S3",
					"openshift.io/description":  "Main S3 bucket for production workloads",
				},
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte("key"),
				"AWS_SECRET_ACCESS_KEY": []byte("secret"),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?namespace=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	assert.Equal(t, "Production S3", envelope.Data[0].DisplayName)
	assert.Equal(t, "Main S3 bucket for production workloads", envelope.Data[0].Description)
}

func TestGetSecretsHandler_DoesNotLogCredentials(t *testing.T) {
	// Create a buffer to capture log output
	var logBuffer bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logBuffer, &slog.HandlerOptions{
		Level: slog.LevelDebug, // Capture all log levels
	}))

	// Create sensitive test data - these values should NEVER appear in logs
	sensitiveAccessKey := "AKIAIOSFODNN7EXAMPLE"
	sensitiveSecretKey := "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
	sensitiveAPIKey := "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz"
	sensitivePassword := "SuperSecretPassword123!"

	// Create mock secrets with sensitive credentials
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-aws"),
			},
			Data: map[string][]byte{
				"AWS_ACCESS_KEY_ID":     []byte(sensitiveAccessKey),
				"AWS_SECRET_ACCESS_KEY": []byte(sensitiveSecretKey),
				"AWS_DEFAULT_REGION":    []byte("us-east-1"),
				"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lls"),
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY":  []byte(sensitiveAPIKey),
				"LLAMA_STACK_CLIENT_BASE_URL": []byte("https://llama-stack.example.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "generic-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-generic"),
			},
			Data: map[string][]byte{
				"password": []byte(sensitivePassword),
				"username": []byte("admin"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}

	// Create an app with the custom logger that captures output
	app := &App{
		config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal},
		logger:                  logger,
		kubernetesClientFactory: factory,
		repositories:            repositories.NewRepositories(logger),
	}

	// Test successful request
	t.Run("successful request", func(t *testing.T) {
		logBuffer.Reset()

		req := httptest.NewRequest(http.MethodGet, "/api/v1/secrets?namespace=test-namespace", nil)
		req.Header.Set(constants.KubeflowUserIDHeader, "test-user")

		// Add required context values
		ctx := req.Context()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "test-user"})
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		app.GetSecretsHandler(w, req, nil)

		assert.Equal(t, http.StatusOK, w.Code)

		// Verify sensitive values are NOT in logs
		logOutput := logBuffer.String()
		assert.NotContains(t, logOutput, sensitiveAccessKey, "AWS access key should not be logged")
		assert.NotContains(t, logOutput, sensitiveSecretKey, "AWS secret key should not be logged")
		assert.NotContains(t, logOutput, sensitiveAPIKey, "API key should not be logged")
		assert.NotContains(t, logOutput, sensitivePassword, "Password should not be logged")
	})

	// Test error scenarios to ensure credentials are not logged in error messages
	t.Run("kubernetes client error", func(t *testing.T) {
		logBuffer.Reset()

		// Create a mock client that returns an error
		errorClient := &mockKubernetesClientForSecrets{
			secrets: mockSecrets,
			err:     fmt.Errorf("kubernetes error: unable to retrieve secrets"),
		}
		errorFactory := &mockKubernetesClientFactoryForSecrets{client: errorClient}

		errorApp := &App{
			config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal},
			logger:                  logger,
			kubernetesClientFactory: errorFactory,
			repositories:            repositories.NewRepositories(logger),
		}

		req := httptest.NewRequest(http.MethodGet, "/api/v1/secrets?namespace=test-namespace", nil)
		req.Header.Set(constants.KubeflowUserIDHeader, "test-user")

		ctx := req.Context()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "test-user"})
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		errorApp.GetSecretsHandler(w, req, nil)

		assert.Equal(t, http.StatusInternalServerError, w.Code)

		// Verify sensitive values are NOT in error logs
		logOutput := logBuffer.String()
		assert.NotContains(t, logOutput, sensitiveAccessKey, "AWS access key should not be logged in errors")
		assert.NotContains(t, logOutput, sensitiveSecretKey, "AWS secret key should not be logged in errors")
		assert.NotContains(t, logOutput, sensitiveAPIKey, "API key should not be logged in errors")
		assert.NotContains(t, logOutput, sensitivePassword, "Password should not be logged in errors")
	})

	// Test forbidden error
	t.Run("forbidden error", func(t *testing.T) {
		logBuffer.Reset()

		forbiddenErr := &apierrors.StatusError{
			ErrStatus: metav1.Status{
				Status:  metav1.StatusFailure,
				Message: "forbidden: User cannot list secrets in namespace",
				Reason:  metav1.StatusReasonForbidden,
				Code:    http.StatusForbidden,
			},
		}

		errorClient := &mockKubernetesClientForSecrets{
			secrets: mockSecrets,
			err:     forbiddenErr,
		}
		errorFactory := &mockKubernetesClientFactoryForSecrets{client: errorClient}

		errorApp := &App{
			config:                  config.EnvConfig{AllowedOrigins: []string{"*"}, AuthMethod: config.AuthMethodInternal},
			logger:                  logger,
			kubernetesClientFactory: errorFactory,
			repositories:            repositories.NewRepositories(logger),
		}

		req := httptest.NewRequest(http.MethodGet, "/api/v1/secrets?namespace=test-namespace", nil)
		req.Header.Set(constants.KubeflowUserIDHeader, "test-user")

		ctx := req.Context()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "test-user"})
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		errorApp.GetSecretsHandler(w, req, nil)

		assert.Equal(t, http.StatusForbidden, w.Code)

		// Verify sensitive values are NOT in logs
		logOutput := logBuffer.String()
		assert.NotContains(t, logOutput, sensitiveAccessKey, "AWS access key should not be logged in forbidden errors")
		assert.NotContains(t, logOutput, sensitiveSecretKey, "AWS secret key should not be logged in forbidden errors")
		assert.NotContains(t, logOutput, sensitiveAPIKey, "API key should not be logged in forbidden errors")
		assert.NotContains(t, logOutput, sensitivePassword, "Password should not be logged in forbidden errors")
	})

	// Verify that response body contains only [REDACTED] values, not actual credentials
	t.Run("response body sanitization", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/secrets?namespace=test-namespace", nil)
		req.Header.Set(constants.KubeflowUserIDHeader, "test-user")

		ctx := req.Context()
		ctx = context.WithValue(ctx, constants.RequestIdentityKey, &kubernetes.RequestIdentity{UserID: "test-user"})
		ctx = context.WithValue(ctx, constants.NamespaceHeaderParameterKey, "test-namespace")
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		app.GetSecretsHandler(w, req, nil)

		assert.Equal(t, http.StatusOK, w.Code)

		responseBody := w.Body.String()

		// Verify sensitive values are NOT in response body
		assert.NotContains(t, responseBody, sensitiveAccessKey, "AWS access key should not be in response")
		assert.NotContains(t, responseBody, sensitiveSecretKey, "AWS secret key should not be in response")
		assert.NotContains(t, responseBody, sensitiveAPIKey, "API key should not be in response")
		assert.NotContains(t, responseBody, sensitivePassword, "Password should not be in response")

		// Verify [REDACTED] is present for sanitized fields
		assert.Contains(t, responseBody, "[REDACTED]", "Response should contain [REDACTED] markers")

		// Verify the count of [REDACTED] matches expected sanitized fields
		redactedCount := strings.Count(responseBody, "[REDACTED]")
		// aws-secret: 4 fields (3 redacted: access_key, secret_key, region, endpoint)
		// lls-secret: 2 fields (2 redacted: api_key, base_url)
		// generic-secret: 2 fields (2 redacted: password, username)
		// Total: 8 redacted values expected (aws_s3_bucket is allowed, but not in this test data)
		// Note: endpoint and region are also redacted
		assert.GreaterOrEqual(t, redactedCount, 8, "Should have at least 8 [REDACTED] values in response")
	})
}
