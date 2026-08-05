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
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
)

func TestInfraNamespaceFromReleaseName(t *testing.T) {
	tests := []struct {
		name        string
		releaseName string
		wantNS      string
		wantOK      bool
	}{
		{name: "Open Data Hub", releaseName: releaseOpenDataHub, wantNS: infraNamespaceODH, wantOK: true},
		{name: "Self-Managed RHOAI", releaseName: releaseSelfManagedRHOAI, wantNS: infraNamespaceRHOAI, wantOK: true},
		{name: "Managed RHOAI", releaseName: releaseManagedRHOAI, wantNS: infraNamespaceRHOAI, wantOK: true},
		{name: "trims whitespace", releaseName: "  " + releaseOpenDataHub + "  ", wantNS: infraNamespaceODH, wantOK: true},
		{name: "unknown", releaseName: "Something Else", wantNS: "", wantOK: false},
		{name: "empty", releaseName: "", wantNS: "", wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotNS, gotOK := InfraNamespaceFromReleaseName(tt.releaseName)
			if gotNS != tt.wantNS || gotOK != tt.wantOK {
				t.Fatalf("InfraNamespaceFromReleaseName(%q) = (%q, %v), want (%q, %v)",
					tt.releaseName, gotNS, gotOK, tt.wantNS, tt.wantOK)
			}
		})
	}
}

func newFakeDSCDynamicClient(t *testing.T, objs ...*unstructured.Unstructured) *dynamicfake.FakeDynamicClient {
	t.Helper()
	scheme := runtime.NewScheme()
	client := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(scheme, map[schema.GroupVersionResource]string{
		constants.DataScienceClusterGvr: "DataScienceClusterList",
	})
	ctx := context.Background()
	for _, obj := range objs {
		_, err := client.Resource(constants.DataScienceClusterGvr).Create(ctx, obj, metav1.CreateOptions{})
		if err != nil {
			t.Fatalf("test setup: failed to seed DSC %q: %v", obj.GetName(), err)
		}
	}
	return client
}

func newDSCObj(name, releaseName string) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   constants.DataScienceClusterGvr.Group,
		Version: constants.DataScienceClusterGvr.Version,
		Kind:    "DataScienceCluster",
	})
	obj.SetName(name)
	if releaseName != "" {
		_ = unstructured.SetNestedField(obj.Object, map[string]any{
			"name": releaseName,
		}, "status", "release")
	}
	return obj
}

func TestFetchDSCReleaseName(t *testing.T) {
	t.Run("returns first DSC release name", func(t *testing.T) {
		client := newFakeDSCDynamicClient(t, newDSCObj("default-dsc", releaseSelfManagedRHOAI))
		got, err := FetchDSCReleaseName(context.Background(), client)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != releaseSelfManagedRHOAI {
			t.Fatalf("got %q, want %q", got, releaseSelfManagedRHOAI)
		}
	})

	t.Run("error when no DSC", func(t *testing.T) {
		client := newFakeDSCDynamicClient(t)
		_, err := FetchDSCReleaseName(context.Background(), client)
		if err == nil {
			t.Fatal("expected error when no DataScienceCluster exists")
		}
	})

	t.Run("error when release name empty", func(t *testing.T) {
		client := newFakeDSCDynamicClient(t, newDSCObj("default-dsc", ""))
		_, err := FetchDSCReleaseName(context.Background(), client)
		if err == nil {
			t.Fatal("expected error for empty status.release.name")
		}
	})
}

func TestResolveMaasApiNamespace(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	t.Run("override wins over DSC", func(t *testing.T) {
		client := newFakeDSCDynamicClient(t, newDSCObj("default-dsc", releaseOpenDataHub))
		got := ResolveMaasApiNamespace(context.Background(), config.EnvConfig{
			MaasApiNamespace: "custom-infra",
		}, logger, client)
		if got != "custom-infra" {
			t.Fatalf("got %q, want custom-infra", got)
		}
	})

	t.Run("uses DSC ODH release", func(t *testing.T) {
		client := newFakeDSCDynamicClient(t, newDSCObj("default-dsc", releaseOpenDataHub))
		got := ResolveMaasApiNamespace(context.Background(), config.EnvConfig{}, logger, client)
		if got != infraNamespaceODH {
			t.Fatalf("got %q, want %q", got, infraNamespaceODH)
		}
	})

	t.Run("uses DSC RHOAI release", func(t *testing.T) {
		client := newFakeDSCDynamicClient(t, newDSCObj("default-dsc", releaseManagedRHOAI))
		got := ResolveMaasApiNamespace(context.Background(), config.EnvConfig{}, logger, client)
		if got != infraNamespaceRHOAI {
			t.Fatalf("got %q, want %q", got, infraNamespaceRHOAI)
		}
	})

	t.Run("falls back to RHOAI when DSC missing", func(t *testing.T) {
		client := newFakeDSCDynamicClient(t)
		got := ResolveMaasApiNamespace(context.Background(), config.EnvConfig{}, logger, client)
		if got != infraNamespaceRHOAI {
			t.Fatalf("got %q, want %q", got, infraNamespaceRHOAI)
		}
	})

	t.Run("falls back to RHOAI when release unrecognized", func(t *testing.T) {
		client := newFakeDSCDynamicClient(t, newDSCObj("default-dsc", "Unknown Product"))
		got := ResolveMaasApiNamespace(context.Background(), config.EnvConfig{}, logger, client)
		if got != infraNamespaceRHOAI {
			t.Fatalf("got %q, want %q", got, infraNamespaceRHOAI)
		}
	})

	t.Run("falls back to RHOAI when dynClient nil", func(t *testing.T) {
		got := ResolveMaasApiNamespace(context.Background(), config.EnvConfig{}, logger, nil)
		if got != infraNamespaceRHOAI {
			t.Fatalf("got %q, want %q", got, infraNamespaceRHOAI)
		}
	})
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

	t.Run("requires namespace when no override", func(t *testing.T) {
		_, err := ResolveMaasApiInternalURL(config.EnvConfig{})
		if err == nil {
			t.Fatal("expected error when MAAS_API_NAMESPACE and MAAS_API_INTERNAL_URL are unset")
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
