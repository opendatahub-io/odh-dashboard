package api

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

func TestGetSecretHandler_Success(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "my-ogx-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-1"),
			},
			Data: map[string][]byte{
				"OGX_CLIENT_API_KEY":  []byte("sk-test-api-key-123"),
				"OGX_CLIENT_BASE_URL": []byte("https://ogx.example.com"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretDataEnvelope](
		"GET",
		"/api/v1/secret/my-ogx-secret?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2)
	assert.Equal(t, base64.StdEncoding.EncodeToString([]byte("sk-test-api-key-123")), envelope.Data["OGX_CLIENT_API_KEY"])
	assert.Equal(t, base64.StdEncoding.EncodeToString([]byte("https://ogx.example.com")), envelope.Data["OGX_CLIENT_BASE_URL"])
}

func TestGetSecretHandler_NotFound(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{secrets: []corev1.Secret{}}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secret/nonexistent?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, res.StatusCode)
}

func TestGetSecretHandler_MissingNamespace(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secret/my-secret",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
}

func TestGetSecretHandler_OnlyReturnsOGXKeys(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "mixed-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-2"),
			},
			Data: map[string][]byte{
				"OGX_CLIENT_API_KEY":    []byte("sk-test-key"),
				"OGX_CLIENT_BASE_URL":   []byte("https://ogx.example.com"),
				"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
				"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG"),
				"OTHER_FIELD":           []byte("should-not-appear"),
			},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretDataEnvelope](
		"GET",
		"/api/v1/secret/mixed-secret?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Len(t, envelope.Data, 2)
	assert.Equal(t, base64.StdEncoding.EncodeToString([]byte("sk-test-key")), envelope.Data["OGX_CLIENT_API_KEY"])
	assert.Equal(t, base64.StdEncoding.EncodeToString([]byte("https://ogx.example.com")), envelope.Data["OGX_CLIENT_BASE_URL"])
	assert.NotContains(t, envelope.Data, "AWS_ACCESS_KEY_ID")
	assert.NotContains(t, envelope.Data, "AWS_SECRET_ACCESS_KEY")
	assert.NotContains(t, envelope.Data, "OTHER_FIELD")
}

func TestGetSecretHandler_EmptySecret(t *testing.T) {
	mockSecrets := []corev1.Secret{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "empty-secret",
				Namespace: "test-namespace",
				UID:       types.UID("uid-3"),
			},
			Data: map[string][]byte{},
		},
	}

	mockClient := &mockKubernetesClientForSecrets{secrets: mockSecrets}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	envelope, res, err := setupApiTest[SecretDataEnvelope](
		"GET",
		"/api/v1/secret/empty-secret?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Equal(t, map[string]string{}, envelope.Data)
}

func TestGetSecretHandler_ForbiddenError(t *testing.T) {
	forbiddenErr := &apierrors.StatusError{
		ErrStatus: metav1.Status{
			Status:  metav1.StatusFailure,
			Message: "forbidden: User cannot get secrets in namespace \"restricted\"",
			Reason:  metav1.StatusReasonForbidden,
			Code:    http.StatusForbidden,
		},
	}

	mockClient := &mockKubernetesClientForSecrets{err: forbiddenErr}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secret/my-secret?namespace=restricted",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusForbidden, res.StatusCode)
}

func TestGetSecretHandler_UnauthorizedError(t *testing.T) {
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

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secret/my-secret?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, res.StatusCode)
}

func TestGetSecretHandler_InvalidDNSNames(t *testing.T) {
	mockClient := &mockKubernetesClientForSecrets{}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	invalidNames := []string{
		"UPPERCASE",
		"-starts-with-dash",
		"ends-with-dash-",
		"has@special",
		"has space",
		"has_underscore",
	}

	for _, name := range invalidNames {
		t.Run(name, func(t *testing.T) {
			_, res, err := setupApiTest[ErrorEnvelope](
				"GET",
				"/api/v1/secret/"+name+"?namespace=test-namespace",
				nil,
				factory,
				identity,
			)

			assert.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, res.StatusCode)
		})
	}
}

func TestGetSecretHandler_GenericError(t *testing.T) {
	genericErr := fmt.Errorf("unexpected connection failure")

	mockClient := &mockKubernetesClientForSecrets{err: genericErr}
	factory := &mockKubernetesClientFactoryForSecrets{client: mockClient}
	identity := &kubernetes.RequestIdentity{UserID: "test-user"}

	_, res, err := setupApiTest[ErrorEnvelope](
		"GET",
		"/api/v1/secret/my-secret?namespace=test-namespace",
		nil,
		factory,
		identity,
	)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, res.StatusCode)
}
