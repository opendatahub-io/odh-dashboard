package api

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

const portalAccessToken = "portal-access-token"

func TestPortalIdentityHeadersAreNotForwardedToMaaSAPI(t *testing.T) {
	var received http.Header
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received = r.Header.Clone()
		w.Header().Set("Content-Type", "application/json")

		switch r.URL.Path {
		case "/v1/me":
			_, _ = io.WriteString(w, `{"sub":"user","email":"user@example.com","org_id":"org"}`)
		case "/v1/models":
			_, _ = io.WriteString(w, `{"object":"list","data":[]}`)
		case "/v1/api-keys/config":
			_, _ = io.WriteString(w, `{"max_expiration_days":90,"ephemeral_max_expiration":"1h"}`)
		case "/v1/api-keys/search":
			_, _ = io.WriteString(w, `{"object":"list","data":[]}`)
		case "/v1/api-keys":
			if r.Method == http.MethodPost {
				_, _ = io.WriteString(w, `{}`)
				return
			}
			_, _ = io.WriteString(w, `{"id":"key","status":"active"}`)
		case "/v1/api-keys/bulk-revoke":
			_, _ = io.WriteString(w, `{}`)
		case "/v1/api-keys/key":
			_, _ = io.WriteString(w, `{"id":"key","status":"active"}`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := config.EnvConfig{
		AllowedOrigins:  []string{"*"},
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		AuthTokenPrefix: config.DefaultAuthTokenPrefix,
		MaasApiUrl:      upstream.URL,
	}
	repos, err := repositories.NewRepositories(logger, nil, cfg, nil, nil, nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatalf("NewRepositories: %v", err)
	}
	app := &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: kubernetes.NewTokenClientFactory(logger, cfg),
		repositories:            repos,
	}

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{name: "whoami", method: http.MethodGet, path: constants.WhoAmIPath},
		{name: "models", method: http.MethodGet, path: constants.ApiPathPrefix + "/models"},
		{name: "api key config", method: http.MethodGet, path: constants.APIKeyConfigPath},
		{name: "search api keys", method: http.MethodPost, path: constants.APIKeySearchPath, body: `{}`},
		{
			name:   "create api key",
			method: http.MethodPost,
			path:   constants.APIKeyCreatePath,
			body:   `{"data":{"name":"test-key","subscription":"test-subscription"}}`,
		},
		{
			name:   "bulk revoke api keys",
			method: http.MethodPost,
			path:   constants.APIKeyBulkRevokePath,
			body:   `{"data":{"username":"user@example.com"}}`,
		},
		{name: "get api key", method: http.MethodGet, path: "/api/v1/api-keys/key"},
		{name: "revoke api key", method: http.MethodDelete, path: "/api/v1/api-keys/key"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			received = nil
			req := httptest.NewRequest(tt.method, tt.path, bytes.NewBufferString(tt.body))
			// Keep this header set aligned with the consumer-portal AuthPolicy:
			// https://github.com/opendatahub-io/ai-gateway-controller/blob/main/config/manifests/consumer-portal/base/authpolicies.yaml
			for name, value := range map[string]string{
				"x-forwarded-access-token": portalAccessToken,
				"x-forwarded-id-token":     "portal-id-token",
				"x-maas-identity":          `{"username":"user@example.com","groups":["system:authenticated"]}`,
				"x-auth-request-user":      "user@example.com",
				"x-auth-request-email":     "user@example.com",
				"Cookie":                   "session=portal-session",
			} {
				req.Header.Set(name, value)
			}

			rr := httptest.NewRecorder()
			app.Routes().ServeHTTP(rr, req)
			if rr.Code < http.StatusOK || rr.Code >= http.StatusMultipleChoices {
				t.Fatalf("status = %d, want success; body = %s", rr.Code, rr.Body.String())
			}
			if received == nil {
				t.Fatal("expected a MaaS API request")
			}
			if got := received.Get("Authorization"); got != "Bearer "+portalAccessToken {
				t.Errorf("Authorization = %q, want Bearer %q", got, portalAccessToken)
			}
			for _, name := range []string{
				"x-forwarded-access-token",
				"x-forwarded-id-token",
				"x-maas-identity",
				"x-auth-request-user",
				"x-auth-request-email",
				"Cookie",
			} {
				if got := received.Get(name); got != "" {
					t.Errorf("%s was forwarded: %q", name, got)
				}
			}
		})
	}
}

func TestPortalRoutesRejectRequestsWithoutForwardedAccessToken(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := config.EnvConfig{
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
	}
	app := &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: kubernetes.NewTokenClientFactory(logger, cfg),
	}

	for _, path := range []string{
		constants.WhoAmIPath,
		constants.IsMaasAdminPath,
		constants.ApiPathPrefix + "/models",
		constants.APIKeyConfigPath,
	} {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			rr := httptest.NewRecorder()
			app.Routes().ServeHTTP(rr, req)

			if rr.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400; body = %s", rr.Code, rr.Body.String())
			}
		})
	}
}
