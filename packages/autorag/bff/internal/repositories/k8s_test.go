package repositories

import (
	"context"
	"encoding/base64"
	"fmt"
	"testing"

	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

// mockK8sService stubs the kubernetes.Service interface for repository tests.
type mockK8sService struct {
	getSecretInfosFn func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error)
	getSecretFn      func(ctx context.Context, namespace, name string) (*v1.Secret, error)
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
func (m *mockK8sService) GetSecret(ctx context.Context, namespace, name string) (*v1.Secret, error) {
	if m.getSecretFn != nil {
		return m.getSecretFn(ctx, namespace, name)
	}
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
func (m *mockK8sService) PatchResource(_ context.Context, _ schema.GroupVersionResource, _, _ string, _ types.PatchType, _ []byte) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sService) PatchDeployment(_ context.Context, _, _ string, _ types.PatchType, _ []byte) error {
	return nil
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
			"OGX_CLIENT_API_KEY":  "legacy-key",
			"OGX_CLIENT_BASE_URL": "https://ogx.example.com",
		},
	}
}

func maasSecret(name string) kubernetes.SecretInfo {
	return kubernetes.SecretInfo{
		UUID: "uid-" + name, Name: name,
		Data: map[string]string{
			"MAAS_API_KEY":  "key-123",
			"MAAS_BASE_URL": "https://maas.example.com",
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

	t.Run("maas filter returns maas", func(t *testing.T) {
		secret := maasSecret("s")
		if got := detectType(secret, "maas"); got != "maas" {
			t.Errorf("got %q, want maas", got)
		}
	})

	t.Run("storage filter falls back to key-based s3", func(t *testing.T) {
		secret := s3Secret("s")
		if got := detectType(secret, "storage"); got != "s3" {
			t.Errorf("got %q, want s3", got)
		}
	})

	t.Run("empty filter prioritizes maas over storage", func(t *testing.T) {
		secret := kubernetes.SecretInfo{
			Data: map[string]string{
				"MAAS_API_KEY":      "k",
				"MAAS_BASE_URL":     "u",
				"AWS_ACCESS_KEY_ID": "a",
			},
		}
		if got := detectType(secret, ""); got != "maas" {
			t.Errorf("got %q, want maas (prioritized over storage)", got)
		}
	})

	t.Run("empty filter treats lowercase MaaS keys as maas", func(t *testing.T) {
		secret := kubernetes.SecretInfo{
			Data: map[string]string{
				"maas_api_key":  "k",
				"maas_base_url": "u",
			},
		}
		if got := detectType(secret, ""); got != "maas" {
			t.Errorf("got %q, want maas", got)
		}
	})

	t.Run("empty filter treats lowercase OGX keys as maas", func(t *testing.T) {
		secret := kubernetes.SecretInfo{
			Data: map[string]string{
				"ogx_client_api_key":  "k",
				"ogx_client_base_url": "u",
			},
		}
		if got := detectType(secret, ""); got != "maas" {
			t.Errorf("got %q, want maas", got)
		}
	})

	t.Run("empty filter treats legacy OGX keys as maas", func(t *testing.T) {
		secret := ogxSecret("s")
		if got := detectType(secret, ""); got != "maas" {
			t.Errorf("got %q, want maas", got)
		}
	})

	t.Run("empty filter falls back to storage when no maas keys", func(t *testing.T) {
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
		maasSecret("maas-conn"),
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
		if len(result) != 4 {
			t.Fatalf("expected 4, got %d", len(result))
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

	t.Run("maas type filters to MaaS secrets", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "maas")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 2 {
			t.Fatalf("expected 2 maas secrets (MaaS + legacy OGX), got %d", len(result))
		}
		names := map[string]bool{}
		for _, s := range result {
			names[s.Name] = true
			if s.Type != "maas" {
				t.Errorf("%s Type = %q, want maas", s.Name, s.Type)
			}
		}
		if !names["maas-conn"] || !names["ogx-conn"] {
			t.Errorf("names = %v, want maas-conn and ogx-conn", names)
		}
	})

	t.Run("maas type includes connection-type=maas without credential keys", func(t *testing.T) {
		k8sAnnotated := &mockK8sService{
			getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
				return []kubernetes.SecretInfo{
					annotatedSecret("annotated-maas", "maas", map[string]string{"other": "x"}),
					plainSecret("db-creds"),
				}, nil
			},
		}
		result, err := repo.GetFilteredSecrets(k8sAnnotated, context.Background(), "ns", "maas")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 1 || result[0].Name != "annotated-maas" || result[0].Type != "maas" {
			t.Errorf("expected annotated MaaS secret, got %v", result)
		}
	})

	t.Run("maas type excludes other connection-type even with MaaS keys", func(t *testing.T) {
		k8sAnnotated := &mockK8sService{
			getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
				return []kubernetes.SecretInfo{
					annotatedSecret("s3-labeled", "s3", map[string]string{
						"MAAS_API_KEY": "k", "MAAS_BASE_URL": "https://maas.example.com",
					}),
					maasSecret("maas-conn"),
				}, nil
			},
		}
		result, err := repo.GetFilteredSecrets(k8sAnnotated, context.Background(), "ns", "maas")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 1 || result[0].Name != "maas-conn" {
			t.Errorf("expected only key-classified maas-conn, got %v", result)
		}
	})

	t.Run("maas type includes lowercase MaaS and OGX keys and empty API keys", func(t *testing.T) {
		k8sLower := &mockK8sService{
			getSecretInfosFn: func(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
				return []kubernetes.SecretInfo{
					{
						UUID: "uid-lower-maas", Name: "lower-maas",
						Data: map[string]string{
							"maas_api_key":  "k",
							"maas_base_url": "https://maas.example.com",
						},
					},
					{
						UUID: "uid-lower-ogx", Name: "lower-ogx",
						Data: map[string]string{
							"ogx_client_api_key":  "k",
							"ogx_client_base_url": "https://ogx.example.com",
						},
					},
					{
						UUID: "uid-empty-key", Name: "empty-key",
						Data: map[string]string{
							"MAAS_API_KEY":  "",
							"MAAS_BASE_URL": "https://maas.example.com",
						},
					},
					plainSecret("db-creds"),
				}, nil
			},
		}
		result, err := repo.GetFilteredSecrets(k8sLower, context.Background(), "ns", "maas")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 3 {
			t.Fatalf("expected 3 maas secrets, got %d", len(result))
		}
		names := map[string]bool{}
		for _, s := range result {
			names[s.Name] = true
		}
		if !names["lower-maas"] || !names["lower-ogx"] || !names["empty-key"] {
			t.Errorf("names = %v", names)
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
		result, err := repo.GetFilteredSecrets(empty, context.Background(), "ns", "maas")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 0 {
			t.Errorf("expected 0, got %d", len(result))
		}
	})

	t.Run("maas keys redacted except allowed", func(t *testing.T) {
		result, err := repo.GetFilteredSecrets(k8s, context.Background(), "ns", "maas")
		if err != nil {
			t.Fatal(err)
		}
		found := false
		for _, item := range result {
			if item.Name != "maas-conn" {
				continue
			}
			found = true
			if item.Data["MAAS_API_KEY"] != "[REDACTED]" {
				t.Errorf("MAAS_API_KEY = %q, want [REDACTED]", item.Data["MAAS_API_KEY"])
			}
			if item.Data["MAAS_BASE_URL"] != "[REDACTED]" {
				t.Errorf("MAAS_BASE_URL = %q, want [REDACTED]", item.Data["MAAS_BASE_URL"])
			}
		}
		if !found {
			t.Fatal("maas-conn not in results")
		}
	})
}

// === GetSecretCredentials ===

func TestGetSecretCredentials(t *testing.T) {
	repo := NewK8sRepository()

	t.Run("returns base64-encoded MaaS keys", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(_ context.Context, _, _ string) (*v1.Secret, error) {
				return &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: "my-maas-secret", Namespace: "ns"},
					Data: map[string][]byte{
						"MAAS_API_KEY":  []byte("sk-test-api-key-123"),
						"MAAS_BASE_URL": []byte("https://maas.example.com"),
					},
				}, nil
			},
		}

		result, err := repo.GetSecretCredentials(k8s, context.Background(), "ns", "my-maas-secret")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 2 {
			t.Fatalf("expected 2 keys, got %d", len(result))
		}
		if result["MAAS_API_KEY"] != base64.StdEncoding.EncodeToString([]byte("sk-test-api-key-123")) {
			t.Errorf("MAAS_API_KEY = %q", result["MAAS_API_KEY"])
		}
		if result["MAAS_BASE_URL"] != base64.StdEncoding.EncodeToString([]byte("https://maas.example.com")) {
			t.Errorf("MAAS_BASE_URL = %q", result["MAAS_BASE_URL"])
		}
	})

	t.Run("filters to only MaaS keys from mixed secret", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(_ context.Context, _, _ string) (*v1.Secret, error) {
				return &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: "mixed-secret", Namespace: "ns"},
					Data: map[string][]byte{
						"MAAS_API_KEY":          []byte("sk-test-key"),
						"MAAS_BASE_URL":         []byte("https://maas.example.com"),
						"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
						"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG"),
						"OTHER_FIELD":           []byte("should-not-appear"),
					},
				}, nil
			},
		}

		result, err := repo.GetSecretCredentials(k8s, context.Background(), "ns", "mixed-secret")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 2 {
			t.Fatalf("expected 2 keys, got %d", len(result))
		}
		if _, ok := result["AWS_ACCESS_KEY_ID"]; ok {
			t.Error("AWS_ACCESS_KEY_ID should not be present")
		}
		if _, ok := result["OTHER_FIELD"]; ok {
			t.Error("OTHER_FIELD should not be present")
		}
	})

	t.Run("includes empty API key when present", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(_ context.Context, _, _ string) (*v1.Secret, error) {
				return &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: "no-auth", Namespace: "ns"},
					Data: map[string][]byte{
						"MAAS_API_KEY":  []byte(""),
						"MAAS_BASE_URL": []byte("https://maas.example.com"),
					},
				}, nil
			},
		}

		result, err := repo.GetSecretCredentials(k8s, context.Background(), "ns", "no-auth")
		if err != nil {
			t.Fatal(err)
		}
		if _, ok := result["MAAS_API_KEY"]; !ok {
			t.Fatal("MAAS_API_KEY should be present when the secret key exists")
		}
		if result["MAAS_API_KEY"] != base64.StdEncoding.EncodeToString([]byte("")) {
			t.Errorf("MAAS_API_KEY = %q", result["MAAS_API_KEY"])
		}
	})

	t.Run("maps legacy OGX keys to MAAS names", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(_ context.Context, _, _ string) (*v1.Secret, error) {
				return &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: "legacy", Namespace: "ns"},
					Data: map[string][]byte{
						"OGX_CLIENT_API_KEY":  []byte("legacy-key"),
						"OGX_CLIENT_BASE_URL": []byte("https://ogx.example.com"),
					},
				}, nil
			},
		}

		result, err := repo.GetSecretCredentials(k8s, context.Background(), "ns", "legacy")
		if err != nil {
			t.Fatal(err)
		}
		if result["MAAS_API_KEY"] != base64.StdEncoding.EncodeToString([]byte("legacy-key")) {
			t.Errorf("MAAS_API_KEY = %q", result["MAAS_API_KEY"])
		}
		if result["MAAS_BASE_URL"] != base64.StdEncoding.EncodeToString([]byte("https://ogx.example.com")) {
			t.Errorf("MAAS_BASE_URL = %q", result["MAAS_BASE_URL"])
		}
		if _, ok := result["OGX_CLIENT_API_KEY"]; ok {
			t.Error("OGX_CLIENT_API_KEY should not be returned")
		}
	})

	t.Run("empty secret returns empty map", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(_ context.Context, _, _ string) (*v1.Secret, error) {
				return &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: "empty-secret", Namespace: "ns"},
					Data:       map[string][]byte{},
				}, nil
			},
		}

		result, err := repo.GetSecretCredentials(k8s, context.Background(), "ns", "empty-secret")
		if err != nil {
			t.Fatal(err)
		}
		if len(result) != 0 {
			t.Errorf("expected empty map, got %d keys", len(result))
		}
	})

	t.Run("service error propagated", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(_ context.Context, _, _ string) (*v1.Secret, error) {
				return nil, fmt.Errorf("not found")
			},
		}

		_, err := repo.GetSecretCredentials(k8s, context.Background(), "ns", "missing")
		if err == nil {
			t.Error("expected error")
		}
	})
}
