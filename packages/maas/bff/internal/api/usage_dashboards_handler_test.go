package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

type fakeUsageDashboardsRepository struct {
	list func(context.Context, *models.MaaSWhoAmI) ([]map[string]any, error)
}

func (f *fakeUsageDashboardsRepository) List(ctx context.Context, whoAmI *models.MaaSWhoAmI) ([]map[string]any, error) {
	return f.list(ctx, whoAmI)
}

func TestGetUsageDashboardsHandler(t *testing.T) {
	tests := []struct {
		name             string
		identity         *kubernetes.RequestIdentity
		upstreamCode     int
		upstreamBody     string
		subscriptionCode int
		subscriptionBody string
		persesNS         string
		wantStatus       int
		wantNames        []string
	}{
		{
			name: "user receives only the user usage dashboard", identity: &kubernetes.RequestIdentity{Token: "user-token"},
			upstreamBody: `{"sub":"user-1","https://redhat.com/maas/orgs":[{"roles":[]}]}`,
			persesNS:     "redhat-ods-monitoring", wantStatus: http.StatusOK,
			wantNames: []string{"dashboard-5-maas-usage-logs"},
		},
		{
			name: "admin receives both usage dashboards", identity: &kubernetes.RequestIdentity{Token: "admin-token"},
			upstreamBody: `{"sub":"admin-1","https://redhat.com/maas/orgs":[{"roles":["admins"]}]}`,
			persesNS:     "custom-monitoring", wantStatus: http.StatusOK,
			wantNames: []string{"dashboard-5-maas-usage-logs", "dashboard-4-maas-usage-logs-admin"},
		},
		{
			name: "subscription fallback identifies an admin", identity: &kubernetes.RequestIdentity{Token: "admin-token"},
			upstreamBody: `{"sub":"admin-1"}`, subscriptionBody: `[{"roles":["admin"]}]`,
			persesNS: "custom-monitoring", wantStatus: http.StatusOK,
			wantNames: []string{"dashboard-5-maas-usage-logs", "dashboard-4-maas-usage-logs-admin"},
		},
		{
			name: "subscription fallback identifies a regular user", identity: &kubernetes.RequestIdentity{Token: "user-token"},
			upstreamBody: `{"sub":"user-1"}`, subscriptionBody: `[{"roles":["user"]}]`,
			persesNS: "custom-monitoring", wantStatus: http.StatusOK,
			wantNames: []string{"dashboard-5-maas-usage-logs"},
		},
		{
			name: "missing identity", upstreamBody: `{"sub":"user-1"}`,
			persesNS: "redhat-ods-monitoring", wantStatus: http.StatusUnauthorized,
		},
		{
			name: "upstream denies caller", identity: &kubernetes.RequestIdentity{Token: "denied-token"},
			upstreamCode: http.StatusForbidden, upstreamBody: `{"error":"Forbidden"}`,
			persesNS: "redhat-ods-monitoring", wantStatus: http.StatusForbidden,
		},
		{
			name: "missing subject", identity: &kubernetes.RequestIdentity{Token: "user-token"},
			upstreamBody: `{"https://redhat.com/maas/orgs":[{"roles":[]}]}`,
			persesNS:     "redhat-ods-monitoring", wantStatus: http.StatusForbidden,
		},
		{
			name: "missing Perses configuration", identity: &kubernetes.RequestIdentity{Token: "user-token"},
			upstreamBody: `{"sub":"user-1","https://redhat.com/maas/orgs":[{"roles":[]}]}`,
			wantStatus:   http.StatusServiceUnavailable,
		},
		{
			name: "admin lookup failure does not read dashboards", identity: &kubernetes.RequestIdentity{Token: "user-token"},
			upstreamBody: `{"sub":"user-1"}`, subscriptionCode: http.StatusInternalServerError,
			persesNS: "redhat-ods-monitoring", wantStatus: http.StatusServiceUnavailable,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/v1/me" && r.URL.Path != "/v1/subscriptions" {
					t.Errorf("unexpected MaaS API path: %s", r.URL.Path)
				}
				if tt.identity != nil && r.Header.Get("Authorization") != "Bearer "+tt.identity.Token {
					t.Errorf("MaaS API did not receive caller token")
				}
				if r.URL.Path == "/v1/subscriptions" && tt.subscriptionCode != 0 {
					w.WriteHeader(tt.subscriptionCode)
					_, _ = io.WriteString(w, `{"error":"Unavailable"}`)
					return
				}
				if r.URL.Path == "/v1/subscriptions" {
					_, _ = io.WriteString(w, tt.subscriptionBody)
					return
				}
				if tt.upstreamCode != 0 {
					w.WriteHeader(tt.upstreamCode)
				}
				_, _ = io.WriteString(w, tt.upstreamBody)
			}))
			defer upstream.Close()

			logger := slog.New(slog.NewTextHandler(io.Discard, nil))
			cfg := config.EnvConfig{MaasApiUrl: upstream.URL, PersesNamespace: tt.persesNS}
			repos, err := repositories.NewRepositories(logger, nil, cfg, nil, nil, nil, nil, nil, nil, nil)
			if err != nil {
				t.Fatal(err)
			}
			var readNames []string
			repos.UsageDashboards = &fakeUsageDashboardsRepository{list: func(_ context.Context, whoAmI *models.MaaSWhoAmI) ([]map[string]any, error) {
				if whoAmI == nil || whoAmI.Sub == "" {
					return nil, repositories.ErrInvalidMaaSUser
				}
				if tt.persesNS == "" {
					return nil, repositories.ErrPersesNamespaceNotConfigured
				}
				readNames = []string{"dashboard-5-maas-usage-logs"}
				if whoAmI.IsAdmin {
					readNames = append(readNames, "dashboard-4-maas-usage-logs-admin")
				}
				var dashboards []map[string]any
				for _, name := range readNames {
					dashboards = append(dashboards, map[string]any{
						"kind": "Dashboard", "metadata": map[string]any{"name": name, "project": tt.persesNS},
						"spec": map[string]any{"panels": map[string]any{}},
					})
				}
				return dashboards, nil
			}}
			app := &App{
				config: cfg, logger: logger, repositories: repos,
				maasApiURL:              helper.NewMaasApiURLHolder(upstream.URL),
				kubernetesClientFactory: &kubernetes.TokenClientFactory{},
			}
			req := httptest.NewRequest(http.MethodGet, constants.UsageDashboardsPath, nil)
			if tt.identity != nil {
				req = req.WithContext(context.WithValue(req.Context(), constants.RequestIdentityKey, tt.identity))
			}
			rr := httptest.NewRecorder()
			handlerWithMaasApi(app, GetUsageDashboardsHandler)(rr, req, nil)
			if rr.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", rr.Code, tt.wantStatus, rr.Body.String())
			}
			if !reflect.DeepEqual(readNames, tt.wantNames) {
				t.Fatalf("dashboard reads = %v, want %v", readNames, tt.wantNames)
			}
			if rr.Code == http.StatusOK {
				var body usageDashboardsEnvelope
				if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
					t.Fatal(err)
				}
				if len(body.Data) != len(tt.wantNames) {
					t.Fatalf("dashboard count = %d, want %d", len(body.Data), len(tt.wantNames))
				}
			}
		})
	}
}

func TestUsageDashboardsMiddlewareRequiresIdentity(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app := &App{logger: logger, kubernetesClientFactory: &kubernetes.TokenClientFactory{Header: "x-forwarded-access-token"}}
	for _, path := range []string{constants.UsageDashboardsPath, PathPrefix + constants.UsageDashboardsPath} {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, path, nil)
		app.InjectRequestIdentity(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
			t.Fatal("unauthenticated request reached handler")
		})).ServeHTTP(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("path %s returned %d, want 401", path, rr.Code)
		}
	}
}
