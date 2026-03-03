package api

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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
	return false, nil
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
	// Create mock secrets with all required S3 keys
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"aws_access_key_id":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"aws_secret_access_key": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
				"aws_default_region":    []byte("us-east-1"),
				"aws_s3_endpoint":       []byte("https://s3.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-2",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"aws_access_key_id":     []byte("AKIAIOSFODNN7EXAMPLE2"),
				"aws_secret_access_key": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY2"),
				"aws_default_region":    []byte("us-west-2"),
				"aws_s3_endpoint":       []byte("https://s3.us-west-2.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "incomplete-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
			},
			Data: map[string][]byte{
				"aws_access_key_id": []byte("INCOMPLETE"),
				// Missing other required keys
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "other-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-4"),
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
		"/api/v1/secrets?resource=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2) // Only 2 secrets have all required S3 keys
	assert.Equal(t, "uid-1", envelope.Data[0].UUID)
	assert.Equal(t, "s3-secret-1", envelope.Data[0].Name)
	assert.Equal(t, "s3", envelope.Data[0].Type)
	assert.Equal(t, []string{"aws_access_key_id", "aws_default_region", "aws_s3_endpoint", "aws_secret_access_key"}, envelope.Data[0].AvailableKeys)
	assert.Equal(t, "uid-2", envelope.Data[1].UUID)
	assert.Equal(t, "s3-secret-2", envelope.Data[1].Name)
	assert.Equal(t, "s3", envelope.Data[1].Type)
	assert.Equal(t, []string{"aws_access_key_id", "aws_default_region", "aws_s3_endpoint", "aws_secret_access_key"}, envelope.Data[1].AvailableKeys)
}

func TestGetSecretsHandler_TypeStorage_CaseInsensitive(t *testing.T) {
	// Test that storage key matching is case-insensitive
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
		"/api/v1/secrets?resource=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 3) // All 3 secrets should match (case-insensitive)
	assert.Equal(t, "s3", envelope.Data[0].Type)
	assert.Equal(t, []string{"AWS_ACCESS_KEY_ID", "AWS_DEFAULT_REGION", "AWS_S3_ENDPOINT", "AWS_SECRET_ACCESS_KEY"}, envelope.Data[0].AvailableKeys)
	assert.Equal(t, "s3", envelope.Data[1].Type)
	assert.Equal(t, []string{"aws_access_key_id", "aws_default_region", "aws_s3_endpoint", "aws_secret_access_key"}, envelope.Data[1].AvailableKeys)
	assert.Equal(t, "s3", envelope.Data[2].Type)
	assert.Equal(t, []string{"Aws_Access_Key_Id", "Aws_Default_Region", "Aws_S3_Endpoint", "Aws_Secret_Access_Key"}, envelope.Data[2].AvailableKeys)
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
				"aws_access_key_id":     []byte("key"),
				"aws_secret_access_key": []byte("secret"),
				"aws_default_region":    []byte("us-east-1"),
				"aws_s3_endpoint":       []byte("https://s3.amazonaws.com"),
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
		"/api/v1/secrets?resource=test-namespace",
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
	assert.Equal(t, []string{"aws_access_key_id", "aws_default_region", "aws_s3_endpoint", "aws_secret_access_key"}, envelope.Data[0].AvailableKeys)
	assert.Equal(t, "uid-lls", envelope.Data[1].UUID)
	assert.Equal(t, "lls-secret", envelope.Data[1].Name)
	assert.Equal(t, "lls", envelope.Data[1].Type)
	assert.Equal(t, []string{"LLAMA_STACK_CLIENT_API_KEY", "LLAMA_STACK_CLIENT_BASE_URL"}, envelope.Data[1].AvailableKeys)
	assert.Equal(t, "uid-2", envelope.Data[2].UUID)
	assert.Equal(t, "other-secret", envelope.Data[2].Name)
	assert.Equal(t, "", envelope.Data[2].Type)
	assert.Equal(t, []string{"password"}, envelope.Data[2].AvailableKeys)
	assert.Equal(t, "uid-3", envelope.Data[3].UUID)
	assert.Equal(t, "database-secret", envelope.Data[3].Name)
	assert.Equal(t, "", envelope.Data[3].Type)
	assert.Equal(t, []string{"db_connection"}, envelope.Data[3].AvailableKeys)
}

func TestGetSecretsHandler_TypeLls_Success(t *testing.T) {
	// Create mock secrets with all required LLS keys
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
				"llama_stack_client_api_key":  []byte("sk-test-api-key-456"), // lowercase
				"llama_stack_client_base_url": []byte("https://llama-stack-2.example.com"),
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
		"/api/v1/secrets?resource=test-namespace&type=lls",
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
	assert.Equal(t, []string{"LLAMA_STACK_CLIENT_API_KEY", "LLAMA_STACK_CLIENT_BASE_URL"}, envelope.Data[0].AvailableKeys)
	assert.Equal(t, "uid-lls-2", envelope.Data[1].UUID)
	assert.Equal(t, "lls-secret-2", envelope.Data[1].Name)
	assert.Equal(t, "lls", envelope.Data[1].Type)
	assert.Equal(t, []string{"llama_stack_client_api_key", "llama_stack_client_base_url"}, envelope.Data[1].AvailableKeys)
}

func TestGetSecretsHandler_TypeLls_CaseInsensitive(t *testing.T) {
	// Test that LLS key matching is case-insensitive
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
		"/api/v1/secrets?resource=test-namespace&type=lls",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 3) // All 3 secrets should match (case-insensitive)
	assert.Equal(t, "lls", envelope.Data[0].Type)
	assert.Equal(t, []string{"LLAMA_STACK_CLIENT_API_KEY", "LLAMA_STACK_CLIENT_BASE_URL"}, envelope.Data[0].AvailableKeys)
	assert.Equal(t, "lls", envelope.Data[1].Type)
	assert.Equal(t, []string{"llama_stack_client_api_key", "llama_stack_client_base_url"}, envelope.Data[1].AvailableKeys)
	assert.Equal(t, "lls", envelope.Data[2].Type)
	assert.Equal(t, []string{"Llama_Stack_Client_Api_Key", "Llama_Stack_Client_Base_Url"}, envelope.Data[2].AvailableKeys)
}

func TestGetSecretsHandler_TypeLls_EmptyList(t *testing.T) {
	// Create mock secrets without all required LLS keys
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
		"/api/v1/secrets?resource=test-namespace&type=lls",
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/secrets?resource=test-namespace&type=invalid",
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
				"aws_access_key_id": []byte("key"),
				// Missing aws_secret_access_key, aws_default_region, aws_s3_endpoint
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
		"/api/v1/secrets?resource=test-namespace&type=storage",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.NotNil(t, envelope.Data, "Data should not be nil, it should be an empty array")
	assert.Empty(t, envelope.Data) // No secrets have all required S3 keys
}

func TestGetSecretsHandler_MissingResourceParameter(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[HTTPError](
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/secrets?resource=test-namespace",
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/secrets?resource=non-existent",
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/secrets?resource=restricted",
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

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/secrets?resource=restricted",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	// Unauthorized errors should return 401 status code
	assert.Equal(t, http.StatusUnauthorized, res.StatusCode)
}

func TestGetSecretsHandler_AvailableKeys_Sorted(t *testing.T) {
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
		"/api/v1/secrets?resource=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)

	// Verify keys are sorted alphabetically
	expectedKeys := []string{"apple_key", "banana_key", "middle_key", "zebra_key"}
	assert.Equal(t, expectedKeys, envelope.Data[0].AvailableKeys, "Keys should be sorted alphabetically")
}

func TestGetSecretsHandler_AvailableKeys_EmptySecret(t *testing.T) {
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
		"/api/v1/secrets?resource=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)

	// Verify empty secret returns empty array
	assert.Equal(t, []string{}, envelope.Data[0].AvailableKeys, "Empty secret should return empty array of keys")
}

func TestGetSecretsHandler_AvailableKeys_DataAndStringData(t *testing.T) {
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
		"/api/v1/secrets?resource=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)

	// Verify all keys from both Data and StringData are included and sorted
	expectedKeys := []string{"data_key_1", "data_key_2", "string_key_1", "string_key_2"}
	assert.Equal(t, expectedKeys, envelope.Data[0].AvailableKeys, "Should include keys from both Data and StringData, sorted alphabetically")
}
