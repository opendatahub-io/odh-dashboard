package repositories

import (
	"context"
	"fmt"
	"testing"

	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// mockK8sService only needs GetSecretInfos.
type mockK8sService struct {
	getSecretInfosFn func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error)
}

func (m *mockK8sService) GetSecretInfos(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
	return m.getSecretInfosFn(ctx, namespace)
}

// Unused — satisfy kubernetes.Service
func (m *mockK8sService) GetNamespaces(context.Context) ([]v1.Namespace, error) {
	return nil, nil
}
func (m *mockK8sService) GetNamespaceInfos(context.Context) ([]kubernetes.NamespaceInfo, error) {
	return nil, nil
}
func (m *mockK8sService) GetAccessibleNamespaces(context.Context) ([]v1.Namespace, error) {
	return nil, nil
}
func (m *mockK8sService) GetAccessibleNamespaceInfos(context.Context) ([]kubernetes.NamespaceInfo, error) {
	return nil, nil
}
func (m *mockK8sService) GetPods(context.Context, string) (*v1.PodList, error) {
	return nil, nil
}
func (m *mockK8sService) GetSecrets(context.Context, string) ([]v1.Secret, error) {
	return nil, nil
}
func (m *mockK8sService) GetSecret(context.Context, string, string) (*v1.Secret, error) {
	return nil, nil
}
func (m *mockK8sService) GetUser(context.Context) (string, error) { return "", nil }
func (m *mockK8sService) IsClusterAdmin(context.Context) (bool, error) {
	return false, nil
}
func (m *mockK8sService) GetUserInfo(context.Context) (*kubernetes.UserInfo, error) {
	return nil, nil
}
func (m *mockK8sService) CanAccessResource(context.Context, string, string, string, string, string) (bool, error) {
	return false, nil
}
func (m *mockK8sService) ListResources(context.Context, schema.GroupVersionResource, string) (*unstructured.UnstructuredList, error) {
	return nil, nil
}
func (m *mockK8sService) GetResource(context.Context, schema.GroupVersionResource, string, string) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sService) CreateResource(context.Context, schema.GroupVersionResource, string, *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sService) DiscoverResourceGVR(context.Context, string, string, string, []string) (schema.GroupVersionResource, error) {
	return schema.GroupVersionResource{}, nil
}

// --- Test data builders ---

func s3Secret(name string) kubernetes.SecretInfo {
	return kubernetes.SecretInfo{
		UUID: "uid-" + name, Name: name,
		DisplayName: name + " display",
		Description: name + " desc",
		Data: map[string]string{
			"AWS_ACCESS_KEY_ID":     "AKIA",
			"AWS_SECRET_ACCESS_KEY": "secret",
			"AWS_S3_ENDPOINT":       "https://s3.example.com",
			"AWS_S3_BUCKET":         "my-bucket",
		},
	}
}

func ogxSecret(name string) kubernetes.SecretInfo {
	return kubernetes.SecretInfo{
		UUID: "uid-" + name, Name: name,
		Data: map[string]string{
			"OGX_CLIENT_API_KEY":  "key-123",
			"OGX_CLIENT_BASE_URL": "https://ogx.example.com",
		},
	}
}

func plainSecret(name string) kubernetes.SecretInfo {
	return kubernetes.SecretInfo{
		UUID: "uid-" + name, Name: name,
		Data: map[string]string{
			"username": "admin",
			"password": "pass",
		},
	}
}

func annotatedSecret(name, connType string, data map[string]string) kubernetes.SecretInfo {
	return kubernetes.SecretInfo{
		UUID: "uid-" + name, Name: name, Type: connType, Data: data,
	}
}

// === detectType ===

func TestDetectType(t *testing.T) {
	t.Run("annotation type takes precedence", func(t *testing.T) {
		secret := annotatedSecret("s", "custom-type", map[string]string{"AWS_ACCESS_KEY_ID": "x"})
		if got := detectType(secret, "storage"); got != "custom-type" {
			t.Errorf("got %q, want annotation type", got)
		}
	})

	t.Run("ogx filter returns ogx", func(t *testing.T) {
		secret := ogxSecret("s")
		if got := detectType(secret, "ogx"); got != "ogx" {
			t.Errorf("got %q, want ogx", got)
		}
	})

	t.Run("storage filter falls back to key-based s3", func(t *testing.T) {
		secret := s3Secret("s")
		if got := detectType(secret, "storage"); got != "s3" {
			t.Errorf("got %q, want s3", got)
		}
	})

	t.Run("empty filter prioritizes ogx over storage", func(t *testing.T) {
		secret := kubernetes.SecretInfo{
			Data: map[string]string{
				"OGX_CLIENT_API_KEY":  "k",
				"OGX_CLIENT_BASE_URL": "u",
				"AWS_ACCESS_KEY_ID":   "a",
			},
		}
		if got := detectType(secret, ""); got != "ogx" {
			t.Errorf("got %q, want ogx (prioritized over storage)", got)
		}
	})

	t.Run("empty filter falls back to storage when no ogx keys", func(t *testing.T) {
		secret := s3Secret("s")
		if got := detectType(secret, ""); got != "s3" {
			t.Errorf("got %q, want s3 fallback", got)
		}
	})

	t.Run("empty filter no match returns empty", func(t *testing.T) {
		secret := plainSecret("s")
		if got := detectType(secret, ""); got != "" {
			t.Errorf("got %q, want empty", got)
		}
	})
}

// === GetFilteredSecrets ===

func TestGetFilteredSecrets(t *testing.T) {
	allSecrets := []kubernetes.SecretInfo{
		s3Secret("aws-conn"),
		ogxSecret("ogx-conn"),
		plainSecret("db-creds"),
	}

	k8s := &mockK8sService{
		getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
			return allSecrets, nil
		},
	}
	repo := NewK8sRepository()

	t.Run("empty type returns all secrets", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 3 {
			t.Fatalf("expected 3, got %d", len(result))
		}
	})

	t.Run("storage type filters to S3 secrets", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "storage")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 1 {
			t.Fatalf("expected 1 storage secret, got %d", len(result))
		}
		if result[0].Name != "aws-conn" {
			t.Errorf("Name = %q", result[0].Name)
		}
		if result[0].Type != "s3" {
			t.Errorf("Type = %q, want key-based s3 detection", result[0].Type)
		}
	})

	t.Run("ogx type filters to OGX secrets", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "ogx")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 1 {
			t.Fatalf("expected 1 ogx secret, got %d", len(result))
		}
		if result[0].Name != "ogx-conn" {
			t.Errorf("Name = %q", result[0].Name)
		}
		if result[0].Type != "ogx" {
			t.Errorf("Type = %q, want ogx", result[0].Type)
		}
	})

	t.Run("invalid type returns error", func(t *testing.T) {
		_, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "invalid")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("redaction: only AWS_S3_BUCKET visible", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "storage")
		if err != nil {
			t.Fatal(err)
		}
		s := result[0]
		if s.Data["AWS_ACCESS_KEY_ID"] != "[REDACTED]" {
			t.Errorf("AWS_ACCESS_KEY_ID = %q, want [REDACTED]", s.Data["AWS_ACCESS_KEY_ID"])
		}
		if s.Data["AWS_SECRET_ACCESS_KEY"] != "[REDACTED]" {
			t.Errorf("AWS_SECRET_ACCESS_KEY = %q, want [REDACTED]", s.Data["AWS_SECRET_ACCESS_KEY"])
		}
		if s.Data["AWS_S3_BUCKET"] != "my-bucket" {
			t.Errorf("AWS_S3_BUCKET = %q, want visible", s.Data["AWS_S3_BUCKET"])
		}
	})

	t.Run("maps to SecretListItem with display name and description", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "storage")
		if err != nil {
			t.Fatal(err)
		}
		s := result[0]
		if s.UUID != "uid-aws-conn" {
			t.Errorf("UUID = %q", s.UUID)
		}
		if s.DisplayName != "aws-conn display" {
			t.Errorf("DisplayName = %q", s.DisplayName)
		}
		if s.Description != "aws-conn desc" {
			t.Errorf("Description = %q", s.Description)
		}
	})

	t.Run("annotation type preserved", func(t *testing.T) {
		k8sAnnotated := &mockK8sService{
			getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
				return []kubernetes.SecretInfo{
					annotatedSecret("annotated", "custom-s3", map[string]string{
						"AWS_ACCESS_KEY_ID": "a", "AWS_SECRET_ACCESS_KEY": "s", "AWS_S3_ENDPOINT": "e",
					}),
				}, nil
			},
		}
		result, err := repo.GetFilteredSecrets(k8sAnnotated, context.Background(), "ns", "storage")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 1 || result[0].Type != "custom-s3" {
			t.Errorf("expected annotation type custom-s3, got %v", result)
		}
	})

	t.Run("k8s service error propagated", func(t *testing.T) {
		failing := &mockK8sService{
			getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
				return nil, fmt.Errorf("forbidden")
			},
		}
		_, err := repo.GetFilteredSecrets(failing, context.Background(), "ns", "")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("empty secrets list", func(t *testing.T) {
		empty := &mockK8sService{
			getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
				return []kubernetes.SecretInfo{}, nil
			},
		}
		result, err := repo.GetFilteredSecrets(empty, context.Background(), "ns", "ogx")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 0 {
			t.Errorf("expected 0, got %d", len(result))
		}
	})

	t.Run("ogx keys redacted except allowed", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "ogx")
		if err != nil {
			t.Fatal(err)
		}
		s := result[0]
		if s.Data["OGX_CLIENT_API_KEY"] != "[REDACTED]" {
			t.Errorf("OGX_CLIENT_API_KEY = %q, want [REDACTED]", s.Data["OGX_CLIENT_API_KEY"])
		}
		if s.Data["OGX_CLIENT_BASE_URL"] != "[REDACTED]" {
			t.Errorf("OGX_CLIENT_BASE_URL = %q, want [REDACTED]", s.Data["OGX_CLIENT_BASE_URL"])
		}
	})
}
