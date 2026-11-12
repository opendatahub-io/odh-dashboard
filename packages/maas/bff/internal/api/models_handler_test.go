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
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

func TestListModelsHandler_OnlyForwardsAllowlistedHeaders(t *testing.T) {
	for _, tt := range []struct {
		name   string
		values []string
	}{
		{name: "portal request without enrichment header"},
		{name: "Gen-AI request with enrichment header", values: []string{"true"}},
		{name: "explicit false is preserved", values: []string{"false"}},
		{name: "multiple values are preserved", values: []string{"true", "false"}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			incomingHeaders := http.Header{
				"Authorization":            {"Bearer incoming-token"},
				"Content-Type":             {"text/plain"},
				"Cookie":                   {"session=incoming-session"},
				"X-Forwarded-Access-Token": {"gateway-token"},
				"X-Gateway-Auth":           {"gateway-identity"},
				"X-Maas-Identity":          {"gateway-maas-identity"},
				"X-Maas-Username":          {"gateway-username"},
				"X-Maas-Group":             {"gateway-group"},
			}
			for _, value := range tt.values {
				incomingHeaders.Add("X-MaaS-Return-All-Models", value)
			}
			called := false
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
				if r.Method != http.MethodGet || r.URL.Path != "/v1/models" {
					t.Errorf("upstream request = %s %s, want GET /v1/models", r.Method, r.URL.Path)
				}
				if got := r.Header.Get("Authorization"); got != "Bearer identity-token" {
					t.Errorf("Authorization = %q, want context identity token", got)
				}
				if got := r.Header.Get("Content-Type"); got != "application/json" {
					t.Errorf("Content-Type = %q, want application/json", got)
				}
				if got := r.Header.Values("X-MaaS-Return-All-Models"); !reflect.DeepEqual(got, tt.values) {
					t.Errorf("enrichment header = %v, want %v", got, tt.values)
				}
				for _, name := range []string{"Cookie", "X-Forwarded-Access-Token", "X-Gateway-Auth", "X-Maas-Identity", "X-Maas-Username", "X-Maas-Group"} {
					if got := r.Header.Get(name); got != "" {
						t.Errorf("incoming header %s was forwarded: %q", name, got)
					}
				}
				w.Header().Set("Content-Type", "application/json")
				_, _ = io.WriteString(w, `{"object":"list","data":[{"id":"test-model","object":"model","subscriptions":[{"name":"standard"},{"name":"premium"}]}]}`)
			}))
			defer upstream.Close()

			logger := slog.New(slog.NewTextHandler(io.Discard, nil))
			cfg := config.EnvConfig{MaasApiUrl: upstream.URL}
			repos, err := repositories.NewRepositories(logger, nil, cfg, nil, nil, nil, nil, nil, nil, nil)
			if err != nil {
				t.Fatalf("NewRepositories: %v", err)
			}
			app := &App{config: cfg, logger: logger, repositories: repos}

			req := httptest.NewRequest(http.MethodGet, "/api/v1/models", nil)
			req.Header = incomingHeaders.Clone()
			ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{Token: "identity-token"})
			rr := httptest.NewRecorder()
			ListModelsHandler(app, rr, req.WithContext(ctx), nil)

			if !called {
				t.Fatal("expected upstream MaaS API request")
			}
			if rr.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200; body = %s", rr.Code, rr.Body.String())
			}
			var response Envelope[models.MaaSModelsResponse, None]
			if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if response.Data.Object != "list" || len(response.Data.Data) != 1 || response.Data.Data[0].ID != "test-model" {
				t.Fatalf("unexpected model list: %+v", response.Data)
			}
			subscriptions := response.Data.Data[0].Subscriptions
			if len(subscriptions) != 2 || subscriptions[0].Name != "standard" || subscriptions[1].Name != "premium" {
				t.Errorf("unexpected subscriptions: %+v", subscriptions)
			}
			if !reflect.DeepEqual(req.Header, incomingHeaders) {
				t.Error("incoming headers were mutated")
			}
		})
	}
}
