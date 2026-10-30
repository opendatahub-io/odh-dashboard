package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

func TestGetWhoAmIHandler(t *testing.T) {
	tests := []struct {
		name                string
		upstreamStatus      int
		subscriptionsStatus int
		upstreamBody        string
		subscriptionsBody   string
		closeUpstream       bool
		wantStatus          int
		wantCode            string
		wantMessage         string
		wantAdmin           bool
	}{
		{
			name:              "success",
			upstreamStatus:    http.StatusOK,
			upstreamBody:      `{"sub":"user-123","https://redhat.com/maas/orgs":[{"roles":[]}]}`,
			subscriptionsBody: `[{"roles":["admin"]}]`,
			wantStatus:        http.StatusOK,
			wantAdmin:         false,
		},
		{
			name:              "organization admin",
			upstreamStatus:    http.StatusOK,
			upstreamBody:      `{"sub":"user-123","https://redhat.com/maas/orgs":[{"roles":["admins"]}]}`,
			subscriptionsBody: `[]`,
			wantStatus:        http.StatusOK,
			wantAdmin:         true,
		},
		{
			name:              "missing organizations uses subscriptions",
			upstreamStatus:    http.StatusOK,
			upstreamBody:      `{"sub":"user-123"}`,
			subscriptionsBody: `[{"roles":["admin"]}]`,
			wantStatus:        http.StatusOK,
			wantAdmin:         true,
		},
		{
			name:              "subscription user is not an admin",
			upstreamStatus:    http.StatusOK,
			upstreamBody:      `{"sub":"user-123","https://redhat.com/maas/orgs":[]}`,
			subscriptionsBody: `[{"roles":["user"]}]`,
			wantStatus:        http.StatusOK,
			wantAdmin:         false,
		},
		{
			name:                "subscription check failure",
			upstreamStatus:      http.StatusOK,
			subscriptionsStatus: http.StatusInternalServerError,
			upstreamBody:        `{"sub":"user-123","https://redhat.com/maas/orgs":[]}`,
			subscriptionsBody:   `{"error":"MaaS unavailable"}`,
			wantStatus:          http.StatusOK,
			wantAdmin:           false,
		},
		{
			name:           "unauthorized",
			upstreamStatus: http.StatusUnauthorized,
			upstreamBody:   `{"error":"Unauthorized"}`,
			wantStatus:     http.StatusUnauthorized,
			wantCode:       "401",
		},
		{
			name:           "unauthorized with object error",
			upstreamStatus: http.StatusUnauthorized,
			upstreamBody:   `{"error":{"message":"Authentication required","type":"authentication_error","code":401}}`,
			wantStatus:     http.StatusUnauthorized,
			wantCode:       "401",
			wantMessage:    "Authentication required",
		},
		{
			name:           "forbidden",
			upstreamStatus: http.StatusForbidden,
			upstreamBody:   `{"error":"Forbidden"}`,
			wantStatus:     http.StatusForbidden,
			wantCode:       "403",
		},
		{
			name:           "upstream failure",
			upstreamStatus: http.StatusInternalServerError,
			upstreamBody:   `{"error":"MaaS unavailable"}`,
			wantStatus:     http.StatusServiceUnavailable,
			wantCode:       "503",
		},
		{
			name:          "connection failure",
			closeUpstream: true,
			wantStatus:    http.StatusInternalServerError,
			wantCode:      "500",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodGet || (r.URL.Path != "/v1/me" && r.URL.Path != "/v1/subscriptions") {
					t.Errorf("upstream request = %s %s, want GET /v1/me or GET /v1/subscriptions", r.Method, r.URL.Path)
				}
				w.Header().Set("Content-Type", "application/json")
				if r.URL.Path == "/v1/subscriptions" {
					status := tt.subscriptionsStatus
					if status == 0 {
						status = tt.upstreamStatus
					}
					w.WriteHeader(status)
					_, _ = io.WriteString(w, tt.subscriptionsBody)
				} else {
					w.WriteHeader(tt.upstreamStatus)
					_, _ = io.WriteString(w, tt.upstreamBody)
				}
			}))
			if tt.closeUpstream {
				upstream.Close()
			} else {
				defer upstream.Close()
			}

			logger := slog.New(slog.NewTextHandler(io.Discard, nil))
			cfg := config.EnvConfig{MaasApiUrl: upstream.URL}
			repos, err := repositories.NewRepositories(logger, nil, cfg, nil, nil, nil, nil, nil, nil, nil)
			if err != nil {
				t.Fatalf("NewRepositories: %v", err)
			}
			app := &App{
				config:       cfg,
				logger:       logger,
				repositories: repos,
				maasApiURL:   helper.NewMaasApiURLHolder(upstream.URL),
			}

			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, constants.WhoAmIPath, nil)
			handlerWithMaasApi(app, GetWhoAmIHandler)(rr, req, nil)

			if rr.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d; body = %s", rr.Code, tt.wantStatus, rr.Body.String())
			}
			if tt.wantStatus == http.StatusOK {
				var body Envelope[models.MaaSWhoAmI, None]
				if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
					t.Fatalf("decode success response: %v", err)
				}
				if body.Data.Sub != "user-123" {
					t.Errorf("sub = %q, want user-123", body.Data.Sub)
				}
				if body.Data.IsAdmin != tt.wantAdmin {
					t.Errorf("isAdmin = %t, want %t", body.Data.IsAdmin, tt.wantAdmin)
				}
				return
			}
			var body HTTPError
			if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
				t.Fatalf("decode error response: %v", err)
			}
			if body.Error.Code != tt.wantCode {
				t.Errorf("error code = %q, want %q", body.Error.Code, tt.wantCode)
			}
			if tt.wantMessage != "" && body.Error.Message != tt.wantMessage {
				t.Errorf("error message = %q, want %q", body.Error.Message, tt.wantMessage)
			}
		})
	}
}
