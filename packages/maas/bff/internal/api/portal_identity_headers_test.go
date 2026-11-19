package api

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

const portalAccessToken = "portal-access-token"

func TestPortalIdentityHeadersAreNotForwardedToMaaSAPI(t *testing.T) {
	type upstreamRequest struct {
		method  string
		path    string
		headers http.Header
	}

	var (
		received         []upstreamRequest
		receivedMu       sync.Mutex
		stateMu          sync.RWMutex
		whoamiWithoutOrg bool
	)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedMu.Lock()
		received = append(received, upstreamRequest{method: r.Method, path: r.URL.Path, headers: r.Header.Clone()})
		receivedMu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/v1/me":
			stateMu.RLock()
			withoutOrg := whoamiWithoutOrg
			stateMu.RUnlock()
			if withoutOrg {
				_, _ = io.WriteString(w, `{"sub":"user","email":"user@example.com"}`)
			} else {
				_, _ = io.WriteString(w, `{"sub":"user","email":"user@example.com","org_id":"org"}`)
			}
		case "/v1/models":
			_, _ = io.WriteString(w, `{"object":"list","data":[]}`)
		case "/v1/subscriptions":
			_, _ = io.WriteString(w, `[{"subscription_id_header":"test-subscription","subscription_description":"Test subscription","roles":["admin"],"model_refs":[]}]`)
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
		MockK8Client:    true,
		PersesNamespace: "mock-monitoring",
	}
	repos, err := repositories.NewRepositories(logger, nil, cfg, nil, nil, nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatalf("NewRepositories: %v", err)
	}
	app := &App{config: cfg, logger: logger, kubernetesClientFactory: kubernetes.NewTokenClientFactory(logger, cfg), repositories: repos}

	tests := []struct {
		name         string
		method       string
		path         string
		body         string
		withoutOrgID bool
	}{
		{name: "whoami", method: http.MethodGet, path: constants.WhoAmIPath},
		{name: "whoami with OpenShift token", method: http.MethodGet, path: constants.WhoAmIPath, withoutOrgID: true},
		{name: "models", method: http.MethodGet, path: constants.ApiPathPrefix + "/models"},
		{name: "usage dashboards", method: http.MethodGet, path: constants.UsageDashboardsPath},
		{name: "api key config", method: http.MethodGet, path: constants.APIKeyConfigPath},
		{name: "search api keys", method: http.MethodPost, path: constants.APIKeySearchPath, body: `{}`},
		{name: "create api key", method: http.MethodPost, path: constants.APIKeyCreatePath, body: `{"data":{"name":"test-key","subscription":"test-subscription"}}`},
		{name: "bulk revoke api keys", method: http.MethodPost, path: constants.APIKeyBulkRevokePath, body: `{"data":{"username":"user@example.com"}}`},
		{name: "get api key", method: http.MethodGet, path: "/api/v1/api-keys/key"},
		{name: "revoke api key", method: http.MethodDelete, path: "/api/v1/api-keys/key"},
		{name: "tenant search", method: http.MethodPost, path: constants.APIKeyTenantSearchPath, body: `{"data":{}}`},
		{name: "admin subscriptions", method: http.MethodGet, path: constants.AdminSubscriptionListPath},
		{name: "subscriptions", method: http.MethodGet, path: constants.SubscriptionsPassthroughPath},
		{name: "subscription by id", method: http.MethodGet, path: "/api/v1/subscriptions/test-subscription"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stateMu.Lock()
			whoamiWithoutOrg = tt.withoutOrgID
			stateMu.Unlock()
			receivedMu.Lock()
			received = nil
			receivedMu.Unlock()

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

			receivedMu.Lock()
			requests := append([]upstreamRequest(nil), received...)
			receivedMu.Unlock()
			if len(requests) == 0 {
				t.Fatal("expected a MaaS API request")
			}
			for _, request := range requests {
				if got := request.headers.Get("Authorization"); got != "Bearer "+portalAccessToken {
					t.Errorf("%s %s Authorization = %q, want Bearer %q", request.method, request.path, got, portalAccessToken)
				}
				for _, name := range []string{"x-forwarded-access-token", "x-forwarded-id-token", "x-maas-identity", "x-auth-request-user", "x-auth-request-email", "Cookie"} {
					if got := request.headers.Get(name); got != "" {
						t.Errorf("%s %s forwarded %s: %q", request.method, request.path, name, got)
					}
				}
			}
		})
	}
}

func TestPortalRoutesRejectRequestsWithoutForwardedAccessToken(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := config.EnvConfig{AuthMethod: config.AuthMethodUser, AuthTokenHeader: config.DefaultAuthTokenHeader}
	app := &App{config: cfg, logger: logger, kubernetesClientFactory: kubernetes.NewTokenClientFactory(logger, cfg)}

	for _, path := range []string{constants.WhoAmIPath, constants.IsMaasAdminPath, constants.ApiPathPrefix + "/models", constants.APIKeyConfigPath} {
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
