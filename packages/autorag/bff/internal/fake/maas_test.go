package fake

import (
	"context"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
)

func TestMaaSClientListModels(t *testing.T) {
	response, err := (&MaaSClient{}).ListModels(context.Background(), maas.RequestConfig{})
	if err != nil {
		t.Fatal(err)
	}

	if len(response.Data) != 2 {
		t.Fatalf("got %d models, want 2", len(response.Data))
	}
	want := []struct {
		id, displayName, description string
	}{
		{"maas-generation", "MaaS generation", "Mock MaaS model"},
		{"maas-embedding", "MaaS embedding", "Mock MaaS model"},
	}
	for i, model := range response.Data {
		if model.ID != want[i].id || model.DisplayName != want[i].displayName || model.Description != want[i].description {
			t.Errorf("model %d = %+v, want %+v", i, model, want[i])
		}
	}
}
