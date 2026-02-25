package api

import (
	"context"
	"net/http"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
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
				"aws_region_name":       []byte("us-east-1"),
				"endpoint_url":          []byte("https://s3.amazonaws.com"),
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
				"aws_region_name":       []byte("us-west-2"),
				"endpoint_url":          []byte("https://s3.us-west-2.amazonaws.com"),
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
	assert.Equal(t, "uid-2", envelope.Data[1].UUID)
	assert.Equal(t, "s3-secret-2", envelope.Data[1].Name)
	assert.Equal(t, "s3", envelope.Data[1].Type)
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
				"AWS_REGION_NAME":       []byte("us-east-1"),
				"ENDPOINT_URL":          []byte("https://s3.amazonaws.com"),
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
				"aws_region_name":       []byte("us-west-2"),
				"endpoint_url":          []byte("https://s3.us-west-2.amazonaws.com"),
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
				"Aws_Region_Name":       []byte("eu-west-1"),
				"Endpoint_Url":          []byte("https://s3.eu-west-1.amazonaws.com"),
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
	assert.Equal(t, "s3", envelope.Data[1].Type)
	assert.Equal(t, "s3", envelope.Data[2].Type)
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
				"aws_region_name":       []byte("us-east-1"),
				"endpoint_url":          []byte("https://s3.amazonaws.com"),
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
	assert.Equal(t, "uid-lls", envelope.Data[1].UUID)
	assert.Equal(t, "lls-secret", envelope.Data[1].Name)
	assert.Equal(t, "lls", envelope.Data[1].Type)
	assert.Equal(t, "uid-2", envelope.Data[2].UUID)
	assert.Equal(t, "other-secret", envelope.Data[2].Name)
	assert.Equal(t, "", envelope.Data[2].Type)
	assert.Equal(t, "uid-3", envelope.Data[3].UUID)
	assert.Equal(t, "database-secret", envelope.Data[3].Name)
	assert.Equal(t, "", envelope.Data[3].Type)
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
	assert.Equal(t, "uid-lls-2", envelope.Data[1].UUID)
	assert.Equal(t, "lls-secret-2", envelope.Data[1].Name)
	assert.Equal(t, "lls", envelope.Data[1].Type)
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
	assert.Equal(t, "lls", envelope.Data[1].Type)
	assert.Equal(t, "lls", envelope.Data[2].Type)
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
	assert.Len(t, envelope.Data, 0)
}

func TestGetSecretsHandler_TypeLls_WithPagination(t *testing.T) {
	// Create mock secrets with all required LLS keys
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lls-1"),
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY":  []byte("key1"),
				"LLAMA_STACK_CLIENT_BASE_URL": []byte("url1"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-secret-2",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lls-2"),
			},
			Data: map[string][]byte{
				"llama_stack_client_api_key":  []byte("key2"),
				"llama_stack_client_base_url": []byte("url2"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "lls-secret-3",
				Namespace: "test-namespace",
				UID:       types.UID("uid-lls-3"),
			},
			Data: map[string][]byte{
				"LLAMA_STACK_CLIENT_API_KEY":  []byte("key3"),
				"LLAMA_STACK_CLIENT_BASE_URL": []byte("url3"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	// Test with limit
	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?resource=test-namespace&type=lls&limit=2",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2)
	assert.Equal(t, "lls", envelope.Data[0].Type)
	assert.Equal(t, "lls", envelope.Data[1].Type)

	// Test with offset
	envelope, res, err = setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?resource=test-namespace&type=lls&offset=1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2)
	assert.Equal(t, "uid-lls-2", envelope.Data[0].UUID)
	assert.Equal(t, "lls", envelope.Data[0].Type)
	assert.Equal(t, "lls", envelope.Data[1].Type)

	// Test with limit and offset
	envelope, res, err = setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?resource=test-namespace&type=lls&limit=1&offset=1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	assert.Equal(t, "uid-lls-2", envelope.Data[0].UUID)
	assert.Equal(t, "lls", envelope.Data[0].Type)
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

func TestGetSecretsHandler_TypeStorage_WithPagination(t *testing.T) {
	// Create mock secrets with all required S3 keys
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"aws_access_key_id":     []byte("key1"),
				"aws_secret_access_key": []byte("secret1"),
				"aws_region_name":       []byte("us-east-1"),
				"endpoint_url":          []byte("https://s3.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-2",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"aws_access_key_id":     []byte("key2"),
				"aws_secret_access_key": []byte("secret2"),
				"aws_region_name":       []byte("us-west-2"),
				"endpoint_url":          []byte("https://s3.us-west-2.amazonaws.com"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "s3-secret-3",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
			},
			Data: map[string][]byte{
				"aws_access_key_id":     []byte("key3"),
				"aws_secret_access_key": []byte("secret3"),
				"aws_region_name":       []byte("eu-west-1"),
				"endpoint_url":          []byte("https://s3.eu-west-1.amazonaws.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	// Test with limit
	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?resource=test-namespace&type=storage&limit=2",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2)
	assert.Equal(t, "s3", envelope.Data[0].Type)
	assert.Equal(t, "s3", envelope.Data[1].Type)

	// Test with offset
	envelope, res, err = setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?resource=test-namespace&type=storage&offset=1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2)
	assert.Equal(t, "uid-2", envelope.Data[0].UUID)
	assert.Equal(t, "s3", envelope.Data[0].Type)
	assert.Equal(t, "s3", envelope.Data[1].Type)

	// Test with limit and offset
	envelope, res, err = setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?resource=test-namespace&type=storage&limit=1&offset=1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	assert.Equal(t, "uid-2", envelope.Data[0].UUID)
	assert.Equal(t, "s3", envelope.Data[0].Type)
}

func TestGetSecretsHandler_NoType_WithPagination(t *testing.T) {
	// Create mock secrets of various types
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{"key": []byte("value1")},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "secret-2",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{"key": []byte("value2")},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "secret-3",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
			},
			Data: map[string][]byte{"key": []byte("value3")},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	// Test with limit and offset
	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?resource=test-namespace&limit=1&offset=1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 1)
	assert.Equal(t, "uid-2", envelope.Data[0].UUID)
	assert.Equal(t, "secret-2", envelope.Data[0].Name)
	assert.Equal(t, "", envelope.Data[0].Type)
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
				// Missing aws_secret_access_key, aws_region_name, endpoint_url
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
	assert.Len(t, envelope.Data, 0)
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

func TestGetSecretsHandler_InvalidLimitParameter(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/secrets?resource=test-namespace&limit=invalid",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetSecretsHandler_InvalidOffsetParameter(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[HTTPError](
		"GET",
		"/api/v1/secrets?resource=test-namespace&offset=-1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}
