package repositories

import (
	"context"
	"fmt"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	v1 "k8s.io/api/core/v1"
)

func TestGetOGXVectorStoreProviders(t *testing.T) {
	k8s := &mockK8sForOGX{
		getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return ogxK8sSecret("ogx-creds", "ns"), nil
		},
	}

	t.Run("filters to vector_io providers only", func(t *testing.T) {
		ogxClient2 := &mockOGXClientWithProviders{
			listProvidersFn: func(ctx context.Context, baseURL, apiKey string) ([]models.OGXProvider, error) {
				return []models.OGXProvider{
					{API: "vector_io", ProviderID: "milvus", ProviderType: "remote::milvus"},
					{API: "inference", ProviderID: "ollama", ProviderType: "remote::ollama"},
					{API: "vector_io", ProviderID: "chromadb", ProviderType: "remote::chromadb"},
					{API: "safety", ProviderID: "llama-guard", ProviderType: "remote::llama-guard"},
				}, nil
			},
		}
		repo := NewOGXVectorStoresRepository(ogxClient2, k8s)

		data, err := repo.GetOGXVectorStoreProviders(context.Background(), "ns", "ogx-creds")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.VectorStoreProviders) != 2 {
			t.Fatalf("expected 2 vector_io providers, got %d", len(data.VectorStoreProviders))
		}
		if data.VectorStoreProviders[0].ProviderID != "milvus" {
			t.Errorf("[0].ProviderID = %q", data.VectorStoreProviders[0].ProviderID)
		}
		if data.VectorStoreProviders[0].ProviderType != "remote::milvus" {
			t.Errorf("[0].ProviderType = %q", data.VectorStoreProviders[0].ProviderType)
		}
		if data.VectorStoreProviders[1].ProviderID != "chromadb" {
			t.Errorf("[1].ProviderID = %q", data.VectorStoreProviders[1].ProviderID)
		}
	})

	t.Run("no vector_io providers returns empty list", func(t *testing.T) {
		ogxClient := &mockOGXClientWithProviders{
			listProvidersFn: func(ctx context.Context, baseURL, apiKey string) ([]models.OGXProvider, error) {
				return []models.OGXProvider{
					{API: "inference", ProviderID: "ollama", ProviderType: "remote::ollama"},
				}, nil
			},
		}
		repo := NewOGXVectorStoresRepository(ogxClient, k8s)

		data, err := repo.GetOGXVectorStoreProviders(context.Background(), "ns", "ogx-creds")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.VectorStoreProviders) != 0 {
			t.Errorf("expected 0, got %d", len(data.VectorStoreProviders))
		}
	})

	t.Run("empty provider list", func(t *testing.T) {
		ogxClient := &mockOGXClientWithProviders{
			listProvidersFn: func(ctx context.Context, baseURL, apiKey string) ([]models.OGXProvider, error) {
				return []models.OGXProvider{}, nil
			},
		}
		repo := NewOGXVectorStoresRepository(ogxClient, k8s)

		data, err := repo.GetOGXVectorStoreProviders(context.Background(), "ns", "ogx-creds")
		if err != nil {
			t.Fatal(err)
		}
		if len(data.VectorStoreProviders) != 0 {
			t.Errorf("expected 0, got %d", len(data.VectorStoreProviders))
		}
	})

	t.Run("credential resolution failure", func(t *testing.T) {
		failK8s := &mockK8sForOGX{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return nil, fmt.Errorf("not found")
			},
		}
		repo := NewOGXVectorStoresRepository(nil, failK8s)

		_, err := repo.GetOGXVectorStoreProviders(context.Background(), "ns", "missing")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("OGX client error", func(t *testing.T) {
		ogxClient := &mockOGXClientWithProviders{
			listProvidersFn: func(ctx context.Context, baseURL, apiKey string) ([]models.OGXProvider, error) {
				return nil, fmt.Errorf("connection refused")
			},
		}
		repo := NewOGXVectorStoresRepository(ogxClient, k8s)

		_, err := repo.GetOGXVectorStoreProviders(context.Background(), "ns", "ogx-creds")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("forwards correct credentials to OGX client", func(t *testing.T) {
		var gotURL, gotKey string
		ogxClient := &mockOGXClientWithProviders{
			listProvidersFn: func(ctx context.Context, baseURL, apiKey string) ([]models.OGXProvider, error) {
				gotURL = baseURL
				gotKey = apiKey
				return nil, nil
			},
		}
		repo := NewOGXVectorStoresRepository(ogxClient, k8s)

		_, err := repo.GetOGXVectorStoreProviders(context.Background(), "ns", "ogx-creds")
		if err != nil {
			t.Fatal(err)
		}
		if gotURL != "https://ogx.example.com" {
			t.Errorf("baseURL = %q", gotURL)
		}
		if gotKey != "key-123" {
			t.Errorf("apiKey = %q", gotKey)
		}
	})
}

// mockOGXClientWithProviders implements OGXClientInterface with ListProviders support.
type mockOGXClientWithProviders struct {
	listProvidersFn func(ctx context.Context, baseURL, apiKey string) ([]models.OGXProvider, error)
}

func (m *mockOGXClientWithProviders) ListModels(context.Context, string, string) ([]models.OGXNativeModel, error) {
	return nil, nil
}
func (m *mockOGXClientWithProviders) ListProviders(ctx context.Context, baseURL, apiKey string) ([]models.OGXProvider, error) {
	return m.listProvidersFn(ctx, baseURL, apiKey)
}
