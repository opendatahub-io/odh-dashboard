package repositories

import (
	"context"
	"errors"
	"log/slog"
	"testing"

	maas "github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type mockMaaSClient struct {
	listModelsFn func(context.Context, string, string) ([]models.MaaSNativeModel, error)
}

func (m *mockMaaSClient) ListModels(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error) {
	return m.listModelsFn(ctx, baseURL, apiKey)
}

var _ maas.MaaSClientInterface = (*mockMaaSClient)(nil)

func TestGetMaaSModels(t *testing.T) {
	k8s := &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{
				ObjectMeta: metav1.ObjectMeta{Name: "maas", Namespace: "ns"},
				Data: map[string][]byte{
					"MAAS_BASE_URL": []byte("https://maas.example.com/"),
					"MAAS_API_KEY":  []byte("key"),
				},
			}, nil
		},
	}
	client := &mockMaaSClient{
		listModelsFn: func(_ context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error) {
			if baseURL != "https://maas.example.com/" || apiKey != "key" {
				t.Fatalf("unexpected credentials: %q %q", baseURL, apiKey)
			}
			return []models.MaaSNativeModel{
				{ID: "model-a", OwnedBy: "models", Ready: true, ModelDetails: &models.MaaSModelDetails{DisplayName: "Model A", Description: "Description"}},
				{ID: "model-b", Ready: false},
				{ID: "", Ready: true},
			}, nil
		},
	}

	repo := NewMaaSRepository(slog.Default(), client, k8s)
	got, err := repo.GetMaaSModels(context.Background(), "ns", "maas")
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Models) != 2 {
		t.Fatalf("expected 2 models, got %d", len(got.Models))
	}
	if got.Models[0].DisplayName != "Model A" || got.Models[1].ID != "model-b" {
		t.Fatalf("unexpected models: %+v", got.Models)
	}
}

func TestGetMaaSModelsRequiresCredentials(t *testing.T) {
	k8s := &mockK8sService{
		getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
			return &v1.Secret{Data: map[string][]byte{"MAAS_BASE_URL": []byte("https://maas.example.com")}}, nil
		},
	}
	repo := NewMaaSRepository(slog.Default(), &mockMaaSClient{}, k8s)
	_, err := repo.GetMaaSModels(context.Background(), "ns", "maas")
	if !errors.Is(err, ErrMaaSCredentialValidation) {
		t.Fatalf("expected MaaS credential validation error, got %v", err)
	}
}
