package repositories

import (
	"context"
	"testing"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"
)

// mockK8sClient is a minimal mock of KubernetesClientInterface for repository tests.
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

// makeSecret builds a secret with the given data keys.
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

// TestMockS3Repository_GetS3CredentialsFromDSPA_FastFailChecks verifies that the mock
// mirrors the real implementation's fast-fail checks for missing SecretName and EndpointURL.
func TestMockS3Repository_GetS3CredentialsFromDSPA_MissingSecretName(t *testing.T) {
	mock := NewMockS3Repository()
	_, err := mock.GetS3CredentialsFromDSPA(context.Background(), nil, "ns", &models.DSPAObjectStorage{
		SecretName: "", // missing
	}, nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "SecretName")
}

func TestMockS3Repository_GetS3CredentialsFromDSPA_MissingEndpointURL(t *testing.T) {
	mock := NewMockS3Repository()
	_, err := mock.GetS3CredentialsFromDSPA(context.Background(), nil, "ns", &models.DSPAObjectStorage{
		SecretName:  "some-secret",
		EndpointURL: "", // missing
	}, nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "endpoint")
}

func TestNewSecretLookup(t *testing.T) {
	tests := []struct {
		name       string
		secretData map[string][]byte
		targetKeys []string
		wantValue  string
		wantErr    bool
		errContain string
	}{
		{
			name: "exact case match",
			secretData: map[string][]byte{
				"AWS_ACCESS_KEY_ID": []byte("exact-value"),
			},
			targetKeys: []string{"AWS_ACCESS_KEY_ID"},
			wantValue:  "exact-value",
		},
		{
			name: "single case-variant fallback (lowercase key, uppercase lookup)",
			secretData: map[string][]byte{
				"aws_access_key_id": []byte("lower-value"),
			},
			targetKeys: []string{"AWS_ACCESS_KEY_ID"},
			wantValue:  "lower-value",
		},
		{
			name: "exact match preferred over other case-variants",
			secretData: map[string][]byte{
				"AWS_ACCESS_KEY_ID": []byte("exact-value"),
				"aws_access_key_id": []byte("lower-value"),
			},
			targetKeys: []string{"AWS_ACCESS_KEY_ID"},
			wantValue:  "exact-value",
		},
		{
			name: "multiple case-variants without exact match returns error",
			secretData: map[string][]byte{
				"Aws_Access_Key_Id": []byte("mixed-value"),
				"aws_access_key_id": []byte("lower-value"),
			},
			targetKeys: []string{"AWS_ACCESS_KEY_ID"},
			wantErr:    true,
			errContain: "ambiguous secret key",
		},
		{
			name: "no match returns empty string, no error",
			secretData: map[string][]byte{
				"UNRELATED_KEY": []byte("some-value"),
			},
			targetKeys: []string{"AWS_ACCESS_KEY_ID"},
			wantValue:  "",
		},
		{
			name:       "empty secret data returns empty string, no error",
			secretData: map[string][]byte{},
			targetKeys: []string{"AWS_ACCESS_KEY_ID"},
			wantValue:  "",
		},
		{
			name: "variadic target keys - first match wins",
			secretData: map[string][]byte{
				"aws_secret_access_key": []byte("found-via-second"),
			},
			targetKeys: []string{"MISSING_KEY", "AWS_SECRET_ACCESS_KEY"},
			wantValue:  "found-via-second",
		},
		{
			name: "collision error includes sorted key names",
			secretData: map[string][]byte{
				"aws_s3_endpoint": []byte("lower-value"),
				"AWS_s3_endpoint": []byte("mixed-value"),
			},
			targetKeys: []string{"AWS_S3_ENDPOINT"},
			wantErr:    true,
			errContain: "[AWS_s3_endpoint aws_s3_endpoint]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			getValue := newSecretLookup(tt.secretData)
			got, err := getValue(tt.targetKeys...)

			if tt.wantErr {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.errContain)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantValue, got)
		})
	}
}

func TestGetS3Credentials_CaseVariantCollision(t *testing.T) {
	// A secret with conflicting case-variants for AWS_ACCESS_KEY_ID should
	// produce an error rather than silently returning an arbitrary value.
	data := map[string][]byte{
		"Aws_Access_Key_Id":     []byte("mixed-case-value"),
		"aws_access_key_id":     []byte("lower-case-value"),
		"AWS_SECRET_ACCESS_KEY": []byte("secret"),
		"AWS_DEFAULT_REGION":    []byte("us-east-1"),
		"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
	}
	client := &mockK8sClient{secrets: []corev1.Secret{makeSecret("collision-secret", "ns", data)}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	repo := NewS3Repository()

	_, err := repo.GetS3Credentials(context.Background(), client, "ns", "collision-secret", identity)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "ambiguous secret key")
}

func TestGetS3Credentials_ExactMatchPreferred(t *testing.T) {
	// When the exact-case key is present alongside a case-variant,
	// the exact match should be returned without error.
	data := map[string][]byte{
		"AWS_ACCESS_KEY_ID":     []byte("exact-value"),
		"aws_access_key_id":     []byte("lower-value"),
		"AWS_SECRET_ACCESS_KEY": []byte("secret"),
		"AWS_DEFAULT_REGION":    []byte("us-east-1"),
		"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
	}
	client := &mockK8sClient{secrets: []corev1.Secret{makeSecret("exact-secret", "ns", data)}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	repo := NewS3Repository()

	creds, err := repo.GetS3Credentials(context.Background(), client, "ns", "exact-secret", identity)
	require.NoError(t, err)
	assert.Equal(t, "exact-value", creds.AccessKeyID)
}

func TestGetS3Credentials_SingleCaseVariant(t *testing.T) {
	// A single case-variant (no exact match) should be accepted.
	data := map[string][]byte{
		"aws_access_key_id":     []byte("lower-value"),
		"aws_secret_access_key": []byte("secret"),
		"aws_default_region":    []byte("us-east-1"),
		"aws_s3_endpoint":       []byte("https://s3.amazonaws.com"),
	}
	client := &mockK8sClient{secrets: []corev1.Secret{makeSecret("lower-secret", "ns", data)}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	repo := NewS3Repository()

	creds, err := repo.GetS3Credentials(context.Background(), client, "ns", "lower-secret", identity)
	require.NoError(t, err)
	assert.Equal(t, "lower-value", creds.AccessKeyID)
	assert.Equal(t, "secret", creds.SecretAccessKey)
}

func TestGetS3CredentialsFromDSPA_CaseVariantCollision(t *testing.T) {
	data := map[string][]byte{
		"access_key": []byte("value-1"),
		"Access_Key": []byte("value-2"),
		"secret_key": []byte("secret-val"),
	}
	client := &mockK8sClient{secrets: []corev1.Secret{makeSecret("dspa-secret", "ns", data)}}
	identity := &k8s.RequestIdentity{UserID: "test-user"}
	repo := NewS3Repository()

	_, err := repo.GetS3CredentialsFromDSPA(context.Background(), client, "ns", &models.DSPAObjectStorage{
		SecretName:     "dspa-secret",
		EndpointURL:    "https://s3.amazonaws.com",
		AccessKeyField: "ACCESS_KEY",
		SecretKeyField: "secret_key",
		Bucket:         "bucket",
		Region:         "us-east-1",
	}, identity)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "ambiguous secret key")
}
