package repositories

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// --- Mocks ---

type mockMaaSClient struct {
	listModelsFn    func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error)
	listProvidersFn func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSProvider, error)
}

func (m *mockMaaSClient) ListModels(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error) {
	if m.listModelsFn != nil {
		return m.listModelsFn(ctx, baseURL, apiKey)
	}
	return nil, nil
}
func (m *mockMaaSClient) ListProviders(ctx context.Context, baseURL, apiKey string) ([]models.MaaSProvider, error) {
	if m.listProvidersFn != nil {
		return m.listProvidersFn(ctx, baseURL, apiKey)
	}
	return nil, nil
}

type mockK8sForMaaS struct {
	mockK8sService
	getSecretFn func(ctx context.Context, namespace, secretName string) (*v1.Secret, error)
}

func (m *mockK8sForMaaS) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	return m.getSecretFn(ctx, namespace, secretName)
}

func maasK8sSecret(name, namespace string) *v1.Secret {
	return &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Data: map[string][]byte{
			"maas_base_url": []byte("https://maas.example.com"),
			"maas_api_key":  []byte("key-123"),
		},
	}
}

func defaultK8s() *mockK8sForMaaS {
	return &mockK8sForMaaS{
		getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return maasK8sSecret("maas-creds", "ns"), nil
		},
	}
}

// === translateMaaSModel ===

func TestTranslateMaaSModel(t *testing.T) {
	repo := &MaaSRepository{logger: slog.Default()}

	t.Run("full model with metadata", func(t *testing.T) {
		native := models.MaaSNativeModel{
			ID: "llama3.2:3b",
			CustomMetadata: &models.MaaSCustomMetadata{
				ModelType:          "llm",
				ProviderID:         "ollama",
				ProviderResourceID: "ollama/llama3.2:3b",
			},
		}
		result, ok := repo.translateMaaSModel(native)
		if !ok {
			t.Fatal("expected ok")
		}
		if result.ID != "llama3.2:3b" || result.Type != "llm" || result.Provider != "ollama" || result.ResourcePath != "ollama/llama3.2:3b" {
			t.Errorf("unexpected: %+v", result)
		}
	})

	t.Run("embedding model", func(t *testing.T) {
		result, ok := repo.translateMaaSModel(models.MaaSNativeModel{
			ID:             "nomic-embed",
			CustomMetadata: &models.MaaSCustomMetadata{ModelType: "embedding", ProviderID: "vllm"},
		})
		if !ok || result.Type != "embedding" {
			t.Errorf("Type = %q", result.Type)
		}
	})

	t.Run("empty ID skipped", func(t *testing.T) {
		_, ok := repo.translateMaaSModel(models.MaaSNativeModel{
			CustomMetadata: &models.MaaSCustomMetadata{ModelType: "llm"},
		})
		if ok {
			t.Error("expected skip for empty ID")
		}
	})

	t.Run("nil custom_metadata degrades to unknown", func(t *testing.T) {
		result, ok := repo.translateMaaSModel(models.MaaSNativeModel{ID: "mystery"})
		if !ok || result.Type != "unknown" {
			t.Errorf("expected ok with unknown type, got ok=%v type=%q", ok, result.Type)
		}
	})

	t.Run("empty model_type degrades to unknown", func(t *testing.T) {
		result, ok := repo.translateMaaSModel(models.MaaSNativeModel{
			ID:             "no-type",
			CustomMetadata: &models.MaaSCustomMetadata{ProviderID: "some-provider"},
		})
		if !ok || result.Type != "unknown" || result.Provider != "some-provider" {
			t.Errorf("unexpected: ok=%v %+v", ok, result)
		}
	})
}

// === resolveMaaSCredentials ===

func TestResolveMaaSCredentials(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		baseURL, apiKey, err := resolveMaaSCredentials(context.Background(), defaultK8s(), "ns", "maas-creds")
		if err != nil {
			t.Fatal(err)
		}
		if baseURL != "https://maas.example.com" || apiKey != "key-123" {
			t.Errorf("baseURL=%q apiKey=%q", baseURL, apiKey)
		}
	})

	t.Run("secret fetch error", func(t *testing.T) {
		k8s := &mockK8sForMaaS{getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return nil, fmt.Errorf("not found")
		}}
		_, _, err := resolveMaaSCredentials(context.Background(), k8s, "ns", "missing")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("missing base_url", func(t *testing.T) {
		k8s := &mockK8sForMaaS{getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return &v1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "s", Namespace: "ns"}, Data: map[string][]byte{
				"maas_api_key": []byte("key"),
			}}, nil
		}}
		_, _, err := resolveMaaSCredentials(context.Background(), k8s, "ns", "s")
		if err == nil || !strings.Contains(err.Error(), "maas_base_url") {
			t.Errorf("expected base_url error, got %v", err)
		}
	})

	t.Run("missing api_key", func(t *testing.T) {
		k8s := &mockK8sForMaaS{getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return &v1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "s", Namespace: "ns"}, Data: map[string][]byte{
				"maas_base_url": []byte("https://maas.example.com"),
			}}, nil
		}}
		_, _, err := resolveMaaSCredentials(context.Background(), k8s, "ns", "s")
		if err == nil || !strings.Contains(err.Error(), "maas_api_key") {
			t.Errorf("expected api_key error, got %v", err)
		}
	})

	t.Run("case-insensitive key lookup", func(t *testing.T) {
		k8s := &mockK8sForMaaS{getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return &v1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "s", Namespace: "ns"}, Data: map[string][]byte{
				"MAAS_BASE_URL": []byte("https://maas.example.com"),
				"MAAS_API_KEY":  []byte("KEY"),
			}}, nil
		}}
		baseURL, apiKey, err := resolveMaaSCredentials(context.Background(), k8s, "ns", "s")
		if err != nil {
			t.Fatal(err)
		}
		if baseURL != "https://maas.example.com" || apiKey != "KEY" {
			t.Errorf("baseURL=%q apiKey=%q", baseURL, apiKey)
		}
	})

	t.Run("invalid URL rejected", func(t *testing.T) {
		k8s := &mockK8sForMaaS{getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return &v1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "s", Namespace: "ns"}, Data: map[string][]byte{
				"maas_base_url": []byte("ftp://bad-scheme.com"),
				"maas_api_key":  []byte("key"),
			}}, nil
		}}
		_, _, err := resolveMaaSCredentials(context.Background(), k8s, "ns", "s")
		if err == nil || !strings.Contains(err.Error(), "invalid") {
			t.Errorf("expected invalid URL error, got %v", err)
		}
	})
}

// === isValidMaaSURL ===

func TestIsValidMaaSURL(t *testing.T) {
	for _, tt := range []struct {
		name    string
		url     string
		wantErr bool
	}{
		{"valid https", "https://maas.example.com", false},
		{"valid http", "http://maas.ns.svc.cluster.local:8080", false},
		{"invalid scheme", "ftp://maas.example.com", true},
		{"empty host", "https://", true},
		{"loopback IP", "https://127.0.0.1:8080", true},
		{"link-local IP", "https://169.254.1.1", true},
		{"unspecified IP", "https://0.0.0.0", true},
		{"private IP allowed", "https://10.0.0.1:8080", false},
		{"ipv6 loopback", "https://[::1]:8080", true},
		{"multicast IPv4", "https://224.0.0.1:8080", true},
		{"multicast IPv6", "https://[ff02::1]:8080", true},
		{"credentials in URL", "https://user:pass@maas.example.com", true},
		{"path rejected", "https://maas.example.com/some-path", true},
		{"query string rejected", "https://maas.example.com?x=y", true},
		{"fragment rejected", "https://maas.example.com#frag", true},
		{"trailing slash allowed", "https://maas.example.com/", false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			err := isValidMaaSURL(tt.url)
			if (err != nil) != tt.wantErr {
				t.Errorf("isValidMaaSURL(%q) error = %v, wantErr %v", tt.url, err, tt.wantErr)
			}
		})
	}
}

// === GetMaaSModels ===

func TestGetMaaSModels(t *testing.T) {
	t.Run("translates and returns models", func(t *testing.T) {
		maasClient := &mockMaaSClient{
			listModelsFn: func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error) {
				if baseURL != "https://maas.example.com" || apiKey != "key-123" {
					t.Errorf("wrong creds: %q %q", baseURL, apiKey)
				}
				return []models.MaaSNativeModel{
					{ID: "m1", CustomMetadata: &models.MaaSCustomMetadata{ModelType: "llm", ProviderID: "p1"}},
					{ID: "m2", CustomMetadata: &models.MaaSCustomMetadata{ModelType: "embedding", ProviderID: "p2"}},
				}, nil
			},
		}
		repo := NewMaaSRepository(slog.Default(), maasClient, defaultK8s())

		data, err := repo.GetMaaSModels(context.Background(), "ns", "maas-creds")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.Models) != 2 {
			t.Fatalf("expected 2, got %d", len(data.Models))
		}
		if data.Models[0].Type != "llm" || data.Models[1].Type != "embedding" {
			t.Errorf("types: %q, %q", data.Models[0].Type, data.Models[1].Type)
		}
	})

	t.Run("skips models with empty ID", func(t *testing.T) {
		maasClient := &mockMaaSClient{
			listModelsFn: func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error) {
				return []models.MaaSNativeModel{
					{ID: "", CustomMetadata: &models.MaaSCustomMetadata{ModelType: "llm"}},
					{ID: "valid", CustomMetadata: &models.MaaSCustomMetadata{ModelType: "llm"}},
				}, nil
			},
		}
		repo := NewMaaSRepository(slog.Default(), maasClient, defaultK8s())

		data, err := repo.GetMaaSModels(context.Background(), "ns", "s")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.Models) != 1 || data.Models[0].ID != "valid" {
			t.Errorf("expected 1 valid model, got %v", data.Models)
		}
	})

	t.Run("degrades nil metadata to unknown type", func(t *testing.T) {
		maasClient := &mockMaaSClient{
			listModelsFn: func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error) {
				return []models.MaaSNativeModel{{ID: "no-meta"}}, nil
			},
		}
		repo := NewMaaSRepository(slog.Default(), maasClient, defaultK8s())

		data, err := repo.GetMaaSModels(context.Background(), "ns", "s")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.Models) != 1 || data.Models[0].Type != "unknown" {
			t.Errorf("expected unknown type, got %v", data.Models)
		}
	})

	t.Run("credential resolution failure", func(t *testing.T) {
		k8s := &mockK8sForMaaS{getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return nil, fmt.Errorf("not found")
		}}
		repo := NewMaaSRepository(slog.Default(), nil, k8s)

		_, err := repo.GetMaaSModels(context.Background(), "ns", "missing")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("MaaS client error", func(t *testing.T) {
		maasClient := &mockMaaSClient{
			listModelsFn: func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error) {
				return nil, fmt.Errorf("connection refused")
			},
		}
		repo := NewMaaSRepository(slog.Default(), maasClient, defaultK8s())

		_, err := repo.GetMaaSModels(context.Background(), "ns", "s")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("empty model list", func(t *testing.T) {
		maasClient := &mockMaaSClient{
			listModelsFn: func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error) {
				return []models.MaaSNativeModel{}, nil
			},
		}
		repo := NewMaaSRepository(slog.Default(), maasClient, defaultK8s())

		data, err := repo.GetMaaSModels(context.Background(), "ns", "s")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.Models) != 0 {
			t.Errorf("expected 0, got %d", len(data.Models))
		}
	})
}

// === GetMaaSVectorStoreProviders ===

func TestGetMaaSVectorStoreProviders(t *testing.T) {
	t.Run("filters to vector_io providers only", func(t *testing.T) {
		maasClient := &mockMaaSClient{
			listProvidersFn: func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSProvider, error) {
				return []models.MaaSProvider{
					{API: "vector_io", ProviderID: "milvus", ProviderType: "remote::milvus"},
					{API: "inference", ProviderID: "ollama", ProviderType: "remote::ollama"},
					{API: "vector_io", ProviderID: "chromadb", ProviderType: "remote::chromadb"},
					{API: "safety", ProviderID: "llama-guard", ProviderType: "remote::llama-guard"},
				}, nil
			},
		}
		repo := NewMaaSRepository(slog.Default(), maasClient, defaultK8s())

		data, err := repo.GetMaaSVectorStoreProviders(context.Background(), "ns", "maas-creds")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.VectorStoreProviders) != 2 {
			t.Fatalf("expected 2 vector_io providers, got %d", len(data.VectorStoreProviders))
		}
		if data.VectorStoreProviders[0].ProviderID != "milvus" || data.VectorStoreProviders[1].ProviderID != "chromadb" {
			t.Errorf("unexpected providers: %+v", data.VectorStoreProviders)
		}
	})

	t.Run("no vector_io providers returns empty", func(t *testing.T) {
		maasClient := &mockMaaSClient{
			listProvidersFn: func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSProvider, error) {
				return []models.MaaSProvider{
					{API: "inference", ProviderID: "ollama"},
				}, nil
			},
		}
		repo := NewMaaSRepository(slog.Default(), maasClient, defaultK8s())

		data, err := repo.GetMaaSVectorStoreProviders(context.Background(), "ns", "maas-creds")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.VectorStoreProviders) != 0 {
			t.Errorf("expected 0, got %d", len(data.VectorStoreProviders))
		}
	})

	t.Run("empty provider list", func(t *testing.T) {
		maasClient := &mockMaaSClient{
			listProvidersFn: func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSProvider, error) {
				return []models.MaaSProvider{}, nil
			},
		}
		repo := NewMaaSRepository(slog.Default(), maasClient, defaultK8s())

		data, err := repo.GetMaaSVectorStoreProviders(context.Background(), "ns", "maas-creds")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.VectorStoreProviders) != 0 {
			t.Errorf("expected 0, got %d", len(data.VectorStoreProviders))
		}
	})

	t.Run("credential resolution failure", func(t *testing.T) {
		k8s := &mockK8sForMaaS{getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return nil, fmt.Errorf("not found")
		}}
		repo := NewMaaSRepository(slog.Default(), nil, k8s)

		_, err := repo.GetMaaSVectorStoreProviders(context.Background(), "ns", "missing")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("MaaS client error", func(t *testing.T) {
		maasClient := &mockMaaSClient{
			listProvidersFn: func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSProvider, error) {
				return nil, fmt.Errorf("connection refused")
			},
		}
		repo := NewMaaSRepository(slog.Default(), maasClient, defaultK8s())

		_, err := repo.GetMaaSVectorStoreProviders(context.Background(), "ns", "maas-creds")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("forwards correct credentials", func(t *testing.T) {
		var gotURL, gotKey string
		maasClient := &mockMaaSClient{
			listProvidersFn: func(ctx context.Context, baseURL, apiKey string) ([]models.MaaSProvider, error) {
				gotURL = baseURL
				gotKey = apiKey
				return nil, nil
			},
		}
		repo := NewMaaSRepository(slog.Default(), maasClient, defaultK8s())

		_, err := repo.GetMaaSVectorStoreProviders(context.Background(), "ns", "maas-creds")
		if err != nil {
			t.Fatal(err)
		}
		if gotURL != "https://maas.example.com" || gotKey != "key-123" {
			t.Errorf("baseURL=%q apiKey=%q", gotURL, gotKey)
		}
	})
}

// === validateMaaSIP ===

func TestValidateMaaSIP(t *testing.T) {
	for _, tt := range []struct {
		name    string
		ip      string
		wantErr bool
		errMsg  string
	}{
		// Public IPs — should pass
		{"public IPv4", "8.8.8.8", false, ""},
		{"public IPv4 alt", "1.1.1.1", false, ""},
		{"public IPv4 high range", "203.0.113.1", false, ""},

		// Private ranges — intentionally allowed per the function's doc comment.
		// validateMaaSIP does NOT block private IPs; they're used for cluster-internal services.
		{"private 10.x.x.x", "10.0.0.1", false, ""},
		{"private 172.16.x.x", "172.16.0.1", false, ""},
		{"private 192.168.x.x", "192.168.1.1", false, ""},

		// Loopback — should fail
		{"loopback IPv4", "127.0.0.1", true, "loopback"},
		{"loopback IPv4 alt", "127.0.0.2", true, "loopback"},
		{"loopback IPv6", "::1", true, "loopback"},

		// Link-local — should fail
		{"link-local IPv4", "169.254.1.1", true, "link-local"},
		{"link-local IPv4 low", "169.254.0.1", true, "link-local"},
		{"link-local IPv6", "fe80::1", true, "link-local"},

		// Unspecified — should fail
		{"unspecified IPv4", "0.0.0.0", true, "unspecified"},
		{"unspecified IPv6", "::", true, "unspecified"},

		// Multicast — should fail
		{"multicast IPv4", "224.0.0.1", true, "multicast"},
		{"multicast IPv6", "ff02::1", true, "multicast"},

		// Public IPv6 — should pass
		{"public IPv6", "2001:4860:4860::8888", false, ""},
	} {
		t.Run(tt.name, func(t *testing.T) {
			ip := net.ParseIP(tt.ip)
			if ip == nil {
				t.Fatalf("failed to parse test IP %q", tt.ip)
			}

			err := validateMaaSIP(ip)

			if tt.wantErr {
				if err == nil {
					t.Errorf("validateMaaSIP(%s) = nil, want error containing %q", tt.ip, tt.errMsg)
				} else if !strings.Contains(err.Error(), tt.errMsg) {
					t.Errorf("validateMaaSIP(%s) error = %q, want it to contain %q", tt.ip, err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("validateMaaSIP(%s) = %v, want nil", tt.ip, err)
				}
			}
		})
	}
}
