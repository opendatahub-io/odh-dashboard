package helper

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
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
	gotTenant, gotURL, err := MaasApiURLFromTenantsResponse(models.TenantsResponse{
		Tenants: []models.TenantInfo{
			{
				Name: "other-tenant",
				Gateway: models.GatewayMetadata{
					Name:        "other-gateway",
					ExternalURL: "https://other.example.com",
				},
			},
			{
				Name: "models-as-a-service",
				Gateway: models.GatewayMetadata{
					Name:        maasDefaultGatewayName,
					ExternalURL: "https://maas.custom.example.com",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotTenant.Name != "models-as-a-service" {
		t.Fatalf("tenant = %q, want models-as-a-service", gotTenant.Name)
	}
	want := "https://maas.custom.example.com/maas-api"
	if gotURL != want {
		t.Fatalf("got %q, want %q", gotURL, want)
	}
}

func TestMaasApiURLFromTenantsResponse_EmptyTenants(t *testing.T) {
	_, _, err := MaasApiURLFromTenantsResponse(models.TenantsResponse{Tenants: []models.TenantInfo{}})
	if err == nil {
		t.Fatal("expected error for empty tenants")
	}
}

func TestMaasApiURLFromTenantsResponse_MissingDefaultGateway(t *testing.T) {
	_, _, err := MaasApiURLFromTenantsResponse(models.TenantsResponse{
		Tenants: []models.TenantInfo{{
			Name: "t",
			Gateway: models.GatewayMetadata{
				Name:        "not-the-default",
				ExternalURL: "https://maas.example.com",
			},
		}},
	})
	if err == nil {
		t.Fatal("expected error when maas-default-gateway is missing")
	}
}

func TestMaasApiURLFromTenantsResponse_MissingExternalURL(t *testing.T) {
	_, _, err := MaasApiURLFromTenantsResponse(models.TenantsResponse{
		Tenants: []models.TenantInfo{{
			Name:    "t",
			Gateway: models.GatewayMetadata{Name: maasDefaultGatewayName},
		}},
	})
	if err == nil {
		t.Fatal("expected error for missing externalUrl")
	}
}

func TestDiscoverMaasApiURLWithToken_HTTP(t *testing.T) {
	const token = "test-sa-token"
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	t.Run("success", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/v1/tenants" {
				t.Errorf("path = %q, want /v1/tenants", r.URL.Path)
			}
			if got := r.Header.Get("Authorization"); got != "Bearer "+token {
				t.Errorf("Authorization = %q", got)
			}
			_ = json.NewEncoder(w).Encode(models.TenantsResponse{
				Tenants: []models.TenantInfo{{
					Name: "models-as-a-service",
					Gateway: models.GatewayMetadata{
						Name:        maasDefaultGatewayName,
						ExternalURL: "https://maas.apps.example.com",
					},
				}},
			})
		}))
		defer server.Close()

		got, err := discoverMaasApiURLWithToken(context.Background(), config.EnvConfig{
			MaasApiInternalUrl: server.URL,
		}, logger, nil, token)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		want := "https://maas.apps.example.com/maas-api"
		if got != want {
			t.Fatalf("got %q, want %q", got, want)
		}
	})

	t.Run("non-200 status", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "unavailable", http.StatusServiceUnavailable)
		}))
		defer server.Close()

		_, err := discoverMaasApiURLWithToken(context.Background(), config.EnvConfig{
			MaasApiInternalUrl: server.URL,
		}, logger, nil, token)
		if err == nil {
			t.Fatal("expected error for non-200 response")
		}
		if !strings.Contains(err.Error(), "503") {
			t.Fatalf("error %q should mention status 503", err)
		}
	})
}
