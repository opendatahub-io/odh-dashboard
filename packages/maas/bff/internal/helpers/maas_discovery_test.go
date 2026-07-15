package helper

import (
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

func TestResolveMaasApiInfraNamespace(t *testing.T) {
	tests := []struct {
		name         string
		podNamespace string
		override     string
		want         string
	}{
		{name: "ODH mapping", podNamespace: "opendatahub", want: "odh-ai-gateway-infra"},
		{name: "RHOAI mapping", podNamespace: "redhat-ods-applications", want: "redhat-ai-gateway-infra"},
		{name: "override wins", podNamespace: "opendatahub", override: "custom-ns", want: "custom-ns"},
		{name: "unknown pod namespace passthrough", podNamespace: "my-ns", want: "my-ns"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ResolveMaasApiInfraNamespace(tt.podNamespace, tt.override)
			if got != tt.want {
				t.Fatalf("ResolveMaasApiInfraNamespace() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestResolveMaasApiInternalURL(t *testing.T) {
	t.Run("full override", func(t *testing.T) {
		got, err := ResolveMaasApiInternalURL(config.EnvConfig{
			MaasApiInternalUrl: "https://maas-api.custom.svc.cluster.local:8443/",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		want := "https://maas-api.custom.svc.cluster.local:8443"
		if got != want {
			t.Fatalf("got %q, want %q", got, want)
		}
	})

	t.Run("namespace override", func(t *testing.T) {
		got, err := ResolveMaasApiInternalURL(config.EnvConfig{
			MaasApiNamespace: "redhat-ai-gateway-infra",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		want := "https://maas-api.redhat-ai-gateway-infra.svc.cluster.local:8443"
		if got != want {
			t.Fatalf("got %q, want %q", got, want)
		}
	})

	t.Run("maps POD_NAMESPACE to infra namespace", func(t *testing.T) {
		got, err := ResolveMaasApiInternalURL(config.EnvConfig{
			PodNamespace: "opendatahub",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		want := "https://maas-api.odh-ai-gateway-infra.svc.cluster.local:8443"
		if got != want {
			t.Fatalf("got %q, want %q", got, want)
		}
	})

	t.Run("requires POD_NAMESPACE when no override", func(t *testing.T) {
		_, err := ResolveMaasApiInternalURL(config.EnvConfig{})
		if err == nil {
			t.Fatal("expected error when POD_NAMESPACE and overrides are unset")
		}
	})
}

func TestMaasApiURLFromTenantsResponse(t *testing.T) {
	got, err := MaasApiURLFromTenantsResponse(models.TenantsResponse{
		Tenants: []models.TenantInfo{{
			Name: "models-as-a-service",
			Gateway: models.GatewayMetadata{
				ExternalURL: "https://maas.custom.example.com",
			},
		}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := "https://maas.custom.example.com/maas-api"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestMaasApiURLFromTenantsResponse_EmptyTenants(t *testing.T) {
	_, err := MaasApiURLFromTenantsResponse(models.TenantsResponse{Tenants: []models.TenantInfo{}})
	if err == nil {
		t.Fatal("expected error for empty tenants")
	}
}

func TestMaasApiURLFromTenantsResponse_MissingExternalURL(t *testing.T) {
	_, err := MaasApiURLFromTenantsResponse(models.TenantsResponse{
		Tenants: []models.TenantInfo{{Name: "t", Gateway: models.GatewayMetadata{}}},
	})
	if err == nil {
		t.Fatal("expected error for missing externalUrl")
	}
}
