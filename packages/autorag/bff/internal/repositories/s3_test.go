package repositories

import (
	"context"
	"fmt"
	"testing"

	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"
)

// mockK8sClient is a minimal mock of KubernetesClientInterface for S3 repository tests.
type mockK8sClient struct {
	secrets []corev1.Secret
	err     error
}

func (m *mockK8sClient) GetNamespaces(_ context.Context, _ *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, nil
}

func (m *mockK8sClient) GetSecrets(_ context.Context, _ string, _ *k8s.RequestIdentity) ([]corev1.Secret, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.secrets, nil
}

func (m *mockK8sClient) GetSecret(_ context.Context, namespace, secretName string, _ *k8s.RequestIdentity) (*corev1.Secret, error) {
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

func (m *mockK8sClient) IsClusterAdmin(_ *k8s.RequestIdentity) (bool, error) { return false, nil }
func (m *mockK8sClient) GetUser(_ *k8s.RequestIdentity) (string, error)      { return "test-user", nil }
func (m *mockK8sClient) GetClientset() interface{}                           { return nil }
func (m *mockK8sClient) GetRestConfig() *rest.Config                         { return nil }
func (m *mockK8sClient) CanListDSPipelineApplications(_ context.Context, _ *k8s.RequestIdentity, _ string) (bool, error) {
	return true, nil
}

// helper to build a secret with the given data keys.
func makeSecret(name, namespace string, data map[string][]byte) corev1.Secret {
	return corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			UID:       types.UID("uid-" + name),
		},
		Data: data,
	}
}

// fullS3Data returns a complete set of S3 credential fields.
func fullS3Data() map[string][]byte {
	return map[string][]byte{
		"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
		"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
		"AWS_DEFAULT_REGION":    []byte("us-east-1"),
		"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
		"AWS_S3_BUCKET":         []byte("my-bucket"),
	}
}

func TestS3Repository_GetS3Credentials_Success(t *testing.T) {
	client := &mockK8sClient{secrets: []corev1.Secret{makeSecret("aws-secret-1", "test-namespace", fullS3Data())}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	s3Repo := NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), client, "test-namespace", "aws-secret-1", identity)

	assert.NoError(t, err)
	assert.NotNil(t, creds)
	assert.Equal(t, "AKIAIOSFODNN7EXAMPLE", creds.AccessKeyID)
	assert.Equal(t, "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", creds.SecretAccessKey)
	assert.Equal(t, "us-east-1", creds.Region)
	assert.Equal(t, "https://s3.amazonaws.com", creds.EndpointURL)
	assert.Equal(t, "my-bucket", creds.Bucket)
}

func TestS3Repository_GetS3Credentials_SecretNotFound(t *testing.T) {
	client := &mockK8sClient{secrets: []corev1.Secret{
		makeSecret("other-secret", "test-namespace", map[string][]byte{"key": []byte("value")}),
	}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	s3Repo := NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), client, "test-namespace", "non-existent", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.True(t, apierrors.IsNotFound(err))
}

func TestS3Repository_GetS3Credentials_MissingAccessKeyID(t *testing.T) {
	data := map[string][]byte{
		"AWS_SECRET_ACCESS_KEY": []byte("secret"),
		"AWS_DEFAULT_REGION":    []byte("us-east-1"),
		"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
	}
	client := &mockK8sClient{secrets: []corev1.Secret{makeSecret("incomplete-secret", "test-namespace", data)}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	s3Repo := NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), client, "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "AWS_ACCESS_KEY_ID")
}

func TestS3Repository_GetS3Credentials_MissingSecretAccessKey(t *testing.T) {
	data := map[string][]byte{
		"AWS_ACCESS_KEY_ID":  []byte("AKIAIOSFODNN7EXAMPLE"),
		"AWS_DEFAULT_REGION": []byte("us-east-1"),
		"AWS_S3_ENDPOINT":    []byte("https://s3.amazonaws.com"),
	}
	client := &mockK8sClient{secrets: []corev1.Secret{makeSecret("incomplete-secret", "test-namespace", data)}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	s3Repo := NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), client, "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "AWS_SECRET_ACCESS_KEY")
}

func TestS3Repository_GetS3Credentials_MissingRegion(t *testing.T) {
	data := map[string][]byte{
		"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
		"AWS_SECRET_ACCESS_KEY": []byte("secret"),
		"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
	}
	client := &mockK8sClient{secrets: []corev1.Secret{makeSecret("incomplete-secret", "test-namespace", data)}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	s3Repo := NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), client, "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "AWS_DEFAULT_REGION")
}

func TestS3Repository_GetS3Credentials_MissingEndpointURL(t *testing.T) {
	data := map[string][]byte{
		"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
		"AWS_SECRET_ACCESS_KEY": []byte("secret"),
		"AWS_DEFAULT_REGION":    []byte("us-east-1"),
	}
	client := &mockK8sClient{secrets: []corev1.Secret{makeSecret("incomplete-secret", "test-namespace", data)}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	s3Repo := NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), client, "test-namespace", "incomplete-secret", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "AWS_S3_ENDPOINT")
}

func TestS3Repository_GetS3Credentials_KubernetesError(t *testing.T) {
	client := &mockK8sClient{err: fmt.Errorf("kubernetes error: unable to list secrets")}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	s3Repo := NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), client, "test-namespace", "aws-secret-1", identity)

	assert.Error(t, err)
	assert.Nil(t, creds)
	assert.Contains(t, err.Error(), "kubernetes error")
}

func TestS3Repository_GetS3Credentials_WithoutBucket(t *testing.T) {
	data := map[string][]byte{
		"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
		"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"),
		"AWS_DEFAULT_REGION":    []byte("us-east-1"),
		"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
	}
	client := &mockK8sClient{secrets: []corev1.Secret{makeSecret("aws-secret-no-bucket", "test-namespace", data)}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	s3Repo := NewS3Repository()

	creds, err := s3Repo.GetS3Credentials(context.Background(), client, "test-namespace", "aws-secret-no-bucket", identity)

	assert.NoError(t, err)
	assert.NotNil(t, creds)
	assert.Equal(t, "AKIAIOSFODNN7EXAMPLE", creds.AccessKeyID)
	assert.Equal(t, "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", creds.SecretAccessKey)
	assert.Equal(t, "us-east-1", creds.Region)
	assert.Equal(t, "https://s3.amazonaws.com", creds.EndpointURL)
	assert.Equal(t, "", creds.Bucket)
}
