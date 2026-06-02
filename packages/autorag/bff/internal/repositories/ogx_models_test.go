package repositories

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// --- Mock OGX client ---

type mockOGXClient struct {
	listModelsFn func(ctx context.Context, baseURL, apiKey string) ([]models.OGXNativeModel, error)
}

func (m *mockOGXClient) ListModels(ctx context.Context, baseURL, apiKey string) ([]models.OGXNativeModel, error) {
	return m.listModelsFn(ctx, baseURL, apiKey)
}
func (m *mockOGXClient) ListProviders(context.Context, string, string) ([]models.OGXProvider, error) {
	return nil, nil
}

// --- K8s mock for credential resolution ---

type mockK8sForOGX struct {
	mockK8sServiceForSecrets // embed for unused stubs
	getSecretFn              func(ctx context.Context, namespace, secretName string) (*v1.Secret, error)
}

func (m *mockK8sForOGX) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	return m.getSecretFn(ctx, namespace, secretName)
}

func ogxK8sSecret(name, namespace string) *v1.Secret {
	return &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Data: map[string][]byte{
			"ogx_client_base_url": []byte("https://ogx.example.com"),
			"ogx_client_api_key":  []byte("key-123"),
		},
	}
}

// === translateOGXModel ===

func TestTranslateOGXModel(t *testing.T) {
	t.Run("full model with metadata", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID: "llama3.2:3b",
			CustomMetadata: &models.OGXCustomMetadata{
				ModelType:          "llm",
				ProviderID:         "ollama",
				ProviderResourceID: "ollama/llama3.2:3b",
			},
		}
		result, ok := translateOGXModel(native)
		if !ok {
			t.Fatal("expected ok")
		}
		if result.ID != "llama3.2:3b" {
			t.Errorf("ID = %q", result.ID)
		}
		if result.Type != "llm" {
			t.Errorf("Type = %q", result.Type)
		}
		if result.Provider != "ollama" {
			t.Errorf("Provider = %q", result.Provider)
		}
		if result.ResourcePath != "ollama/llama3.2:3b" {
			t.Errorf("ResourcePath = %q", result.ResourcePath)
		}
	})

	t.Run("embedding model", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID: "nomic-embed",
			CustomMetadata: &models.OGXCustomMetadata{
				ModelType:  "embedding",
				ProviderID: "vllm",
			},
		}
		result, ok := translateOGXModel(native)
		if !ok {
			t.Fatal("expected ok")
		}
		if result.Type != "embedding" {
			t.Errorf("Type = %q", result.Type)
		}
	})

	t.Run("empty ID skipped", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID:             "",
			CustomMetadata: &models.OGXCustomMetadata{ModelType: "llm"},
		}
		_, ok := translateOGXModel(native)
		if ok {
			t.Error("expected skip for empty ID")
		}
	})

	t.Run("nil custom_metadata degrades to unknown type", func(t *testing.T) {
		native := models.OGXNativeModel{ID: "mystery-model"}
		result, ok := translateOGXModel(native)
		if !ok {
			t.Fatal("expected ok (degraded, not skipped)")
		}
		if result.Type != "unknown" {
			t.Errorf("Type = %q, want unknown", result.Type)
		}
	})

	t.Run("empty model_type degrades to unknown", func(t *testing.T) {
		native := models.OGXNativeModel{
			ID:             "no-type",
			CustomMetadata: &models.OGXCustomMetadata{ProviderID: "some-provider"},
		}
		result, ok := translateOGXModel(native)
		if !ok {
			t.Fatal("expected ok")
		}
		if result.Type != "unknown" {
			t.Errorf("Type = %q, want unknown", result.Type)
		}
		if result.Provider != "some-provider" {
			t.Errorf("Provider = %q, should still be set", result.Provider)
		}
	})
}

// === resolveOGXCredentials ===

func TestResolveOGXCredentials(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return ogxK8sSecret("ogx-creds", "ns"), nil
			},
		}
		baseURL, apiKey, err := resolveOGXCredentials(context.Background(), k8s, "ns", "ogx-creds")
		if err != nil {
			t.Fatal(err)
		}
		if baseURL != "https://ogx.example.com" {
			t.Errorf("baseURL = %q", baseURL)
		}
		if apiKey != "key-123" {
			t.Errorf("apiKey = %q", apiKey)
		}
	})

	t.Run("secret fetch error", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return nil, fmt.Errorf("not found")
			},
		}
		_, _, err := resolveOGXCredentials(context.Background(), k8s, "ns", "missing")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("missing base_url", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: "s", Namespace: "ns"},
					Data: map[string][]byte{
						"ogx_client_api_key": []byte("key"),
					},
				}, nil
			},
		}
		_, _, err := resolveOGXCredentials(context.Background(), k8s, "ns", "s")
		if err == nil || !strings.Contains(err.Error(), "ogx_client_base_url") {
			t.Errorf("expected base_url error, got %v", err)
		}
	})

	t.Run("missing api_key", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: "s", Namespace: "ns"},
					Data: map[string][]byte{
						"ogx_client_base_url": []byte("https://ogx.example.com"),
					},
				}, nil
			},
		}
		_, _, err := resolveOGXCredentials(context.Background(), k8s, "ns", "s")
		if err == nil || !strings.Contains(err.Error(), "ogx_client_api_key") {
			t.Errorf("expected api_key error, got %v", err)
		}
	})

	t.Run("case-insensitive key lookup", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: "s", Namespace: "ns"},
					Data: map[string][]byte{
						"OGX_CLIENT_BASE_URL": []byte("https://ogx.example.com"),
						"OGX_CLIENT_API_KEY":  []byte("KEY"),
					},
				}, nil
			},
		}
		baseURL, apiKey, err := resolveOGXCredentials(context.Background(), k8s, "ns", "s")
		if err != nil {
			t.Fatal(err)
		}
		if baseURL != "https://ogx.example.com" || apiKey != "KEY" {
			t.Errorf("baseURL=%q apiKey=%q", baseURL, apiKey)
		}
	})

	t.Run("invalid URL rejected", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: "s", Namespace: "ns"},
					Data: map[string][]byte{
						"ogx_client_base_url": []byte("ftp://bad-scheme.com"),
						"ogx_client_api_key":  []byte("key"),
					},
				}, nil
			},
		}
		_, _, err := resolveOGXCredentials(context.Background(), k8s, "ns", "s")
		if err == nil || !strings.Contains(err.Error(), "invalid") {
			t.Errorf("expected invalid URL error, got %v", err)
		}
	})
}

// === isValidOGXURL ===

func TestIsValidOGXURL(t *testing.T) {
	tests := []struct {
		name    string
		url     string
		wantErr bool
	}{
		{"valid https", "https://ogx.example.com", false},
		{"valid http", "http://ogx.ns.svc.cluster.local:8080", false},
		{"invalid scheme", "ftp://ogx.example.com", true},
		{"empty host", "https://", true},
		{"loopback IP", "https://127.0.0.1:8080", true},
		{"link-local IP", "https://169.254.1.1", true},
		{"unspecified IP", "https://0.0.0.0", true},
		{"private IP allowed", "https://10.0.0.1:8080", false},
		{"ipv6 loopback", "https://[::1]:8080", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := isValidOGXURL(tt.url)
			if (err != nil) != tt.wantErr {
				t.Errorf("isValidOGXURL(%q) error = %v, wantErr %v", tt.url, err, tt.wantErr)
			}
		})
	}
}

// === GetOGXModels (end-to-end with mocks) ===

func TestGetOGXModels(t *testing.T) {
	t.Run("translates and returns models", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return ogxK8sSecret("ogx-creds", "ns"), nil
			},
		}
		ogxClient := &mockOGXClient{
			listModelsFn: func(ctx context.Context, baseURL, apiKey string) ([]models.OGXNativeModel, error) {
				if baseURL != "https://ogx.example.com" || apiKey != "key-123" {
					t.Errorf("wrong creds: %q %q", baseURL, apiKey)
				}
				return []models.OGXNativeModel{
					{ID: "m1", CustomMetadata: &models.OGXCustomMetadata{ModelType: "llm", ProviderID: "p1"}},
					{ID: "m2", CustomMetadata: &models.OGXCustomMetadata{ModelType: "embedding", ProviderID: "p2"}},
				}, nil
			},
		}
		repo := NewOGXModelsRepository(ogxClient, k8s)

		data, err := repo.GetOGXModels(context.Background(), "ns", "ogx-creds")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.Models) != 2 {
			t.Fatalf("expected 2 models, got %d", len(data.Models))
		}
		if data.Models[0].Type != "llm" || data.Models[1].Type != "embedding" {
			t.Errorf("types: %q, %q", data.Models[0].Type, data.Models[1].Type)
		}
	})

	t.Run("skips models with empty ID", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return ogxK8sSecret("s", "ns"), nil
			},
		}
		ogxClient := &mockOGXClient{
			listModelsFn: func(ctx context.Context, baseURL, apiKey string) ([]models.OGXNativeModel, error) {
				return []models.OGXNativeModel{
					{ID: "", CustomMetadata: &models.OGXCustomMetadata{ModelType: "llm"}},
					{ID: "valid", CustomMetadata: &models.OGXCustomMetadata{ModelType: "llm"}},
				}, nil
			},
		}
		repo := NewOGXModelsRepository(ogxClient, k8s)

		data, err := repo.GetOGXModels(context.Background(), "ns", "s")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.Models) != 1 {
			t.Fatalf("expected 1 (empty ID skipped), got %d", len(data.Models))
		}
		if data.Models[0].ID != "valid" {
			t.Errorf("ID = %q", data.Models[0].ID)
		}
	})

	t.Run("degrades models with nil metadata to unknown type", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return ogxK8sSecret("s", "ns"), nil
			},
		}
		ogxClient := &mockOGXClient{
			listModelsFn: func(ctx context.Context, baseURL, apiKey string) ([]models.OGXNativeModel, error) {
				return []models.OGXNativeModel{
					{ID: "no-meta"},
				}, nil
			},
		}
		repo := NewOGXModelsRepository(ogxClient, k8s)

		data, err := repo.GetOGXModels(context.Background(), "ns", "s")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.Models) != 1 || data.Models[0].Type != "unknown" {
			t.Errorf("expected 1 model with unknown type, got %v", data.Models)
		}
	})

	t.Run("credential resolution failure", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return nil, fmt.Errorf("not found")
			},
		}
		repo := NewOGXModelsRepository(nil, k8s)

		_, err := repo.GetOGXModels(context.Background(), "ns", "missing")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("OGX client error", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return ogxK8sSecret("s", "ns"), nil
			},
		}
		ogxClient := &mockOGXClient{
			listModelsFn: func(ctx context.Context, baseURL, apiKey string) ([]models.OGXNativeModel, error) {
				return nil, fmt.Errorf("connection refused")
			},
		}
		repo := NewOGXModelsRepository(ogxClient, k8s)

		_, err := repo.GetOGXModels(context.Background(), "ns", "s")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("empty model list", func(t *testing.T) {
		k8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return ogxK8sSecret("s", "ns"), nil
			},
		}
		ogxClient := &mockOGXClient{
			listModelsFn: func(ctx context.Context, baseURL, apiKey string) ([]models.OGXNativeModel, error) {
				return []models.OGXNativeModel{}, nil
			},
		}
		repo := NewOGXModelsRepository(ogxClient, k8s)

		data, err := repo.GetOGXModels(context.Background(), "ns", "s")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.Models) != 0 {
			t.Errorf("expected 0, got %d", len(data.Models))
		}
	})
}
