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

func TestGetSecretsHandler_Success(t *testing.T) {
	// Create mock secrets with aws_access_key_id
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
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-2",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"aws_access_key_id":     []byte("AKIAIOSFODNN7EXAMPLE2"),
				"aws_secret_access_key": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY2"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "other-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
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
		"/api/v1/secrets?resource=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2) // Only 2 secrets have aws_access_key_id
	assert.Equal(t, "uid-1", envelope.Data[0].UUID)
	assert.Equal(t, "aws-secret-1", envelope.Data[0].Name)
	assert.Equal(t, "uid-2", envelope.Data[1].UUID)
	assert.Equal(t, "aws-secret-2", envelope.Data[1].Name)
}

func TestGetSecretsHandler_WithPagination(t *testing.T) {
	// Create mock secrets with aws_access_key_id
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-1",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"aws_access_key_id": []byte("key1"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-2",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"aws_access_key_id": []byte("key2"),
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "aws-secret-3",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
			},
			Data: map[string][]byte{
				"aws_access_key_id": []byte("key3"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	// Test with limit
	envelope, res, err := setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?resource=test-namespace&limit=2",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2)

	// Test with offset
	envelope, res, err = setupApiTest[SecretsEnvelope](
		"GET",
		"/api/v1/secrets?resource=test-namespace&offset=1",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2)
	assert.Equal(t, "uid-2", envelope.Data[0].UUID)

	// Test with limit and offset
	envelope, res, err = setupApiTest[SecretsEnvelope](
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
}

func TestGetSecretsHandler_EmptyList(t *testing.T) {
	// Create mock secrets without aws_access_key_id
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "other-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
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
		"/api/v1/secrets?resource=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Empty(t, envelope.Data) // No secrets have aws_access_key_id
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
