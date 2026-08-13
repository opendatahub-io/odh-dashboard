package api

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/data-registry/bff/internal/config"
	"github.com/opendatahub-io/data-registry/bff/internal/constants"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/data-registry/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// capturedUpstreamRequest records what the BFF actually sent to the stand-in Data Registry API.
type capturedUpstreamRequest struct {
	Method string
	Path   string
	Query  string
	Header http.Header
	Body   []byte
}

// newRegistryProxyTestApp builds an App wired to a user_token TokenClientFactory (so
// DataRegistryReverseProxy can read a bearer token from the RequestIdentity without a real
// Kubernetes cluster) and pointed at dataRegistryAPIURL — normally an httptest.NewServer
// standing in for the real Data Registry API.
func newRegistryProxyTestApp(dataRegistryAPIURL string) *App {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := config.EnvConfig{
		AllowedOrigins:  []string{"*"},
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		AuthTokenPrefix: config.DefaultAuthTokenPrefix,
	}
	return &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: kubernetes.NewTokenClientFactory(logger, cfg),
		repositories:            repositories.NewRepositories(),
		dataRegistryAPIURL:      dataRegistryAPIURL,
	}
}

// newStandInDataRegistryServer returns an httptest.Server that records the last request it
// received (via capture) and replies with the given status/body/headers, standing in for the
// real Data Registry API.
func newStandInDataRegistryServer(capture *capturedUpstreamRequest, status int, respBody string, respHeaders map[string]string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		*capture = capturedUpstreamRequest{
			Method: r.Method,
			Path:   r.URL.Path,
			Query:  r.URL.RawQuery,
			Header: r.Header.Clone(),
			Body:   body,
		}
		for k, v := range respHeaders {
			w.Header().Set(k, v)
		}
		w.WriteHeader(status)
		if respBody != "" {
			_, _ = w.Write([]byte(respBody))
		}
	}))
}

func doRegistryProxyRequest(t *testing.T, app *App, method, url string, body []byte, bearerToken string) *http.Response {
	t.Helper()
	var reqBody io.Reader
	if body != nil {
		reqBody = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, url, reqBody)
	require.NoError(t, err)
	if bearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+bearerToken)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	return rr.Result()
}

func TestDataRegistryProxy_ListNamespaces_ForwardsPathAndAuth(t *testing.T) {
	var captured capturedUpstreamRequest
	upstream := newStandInDataRegistryServer(&captured, http.StatusOK, `{"namespaces":[["default"]]}`, map[string]string{"Content-Type": "application/json"})
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example/api/v1/my-project/namespaces", nil, "user-token-123")
	defer res.Body.Close()

	respBody, err := io.ReadAll(res.Body)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.JSONEq(t, `{"namespaces":[["default"]]}`, string(respBody))
	assert.Equal(t, "application/json", res.Header.Get("Content-Type"))

	assert.Equal(t, http.MethodGet, captured.Method)
	assert.Equal(t, "/v1/my-project/namespaces", captured.Path)
	assert.Equal(t, "Bearer user-token-123", captured.Header.Get("Authorization"))
}

// TestDataRegistryProxy_StripsCallerAssertedIdentityHeaders guards against attribution
// spoofing: the upstream Data Registry API trusts X-User/kubeflow-userid for fields like
// `registered_by`, so a caller-supplied value must never reach the upstream verbatim — only the
// BFF's own verified identity (via Authorization) may assert who the caller is.
func TestDataRegistryProxy_StripsCallerAssertedIdentityHeaders(t *testing.T) {
	var captured capturedUpstreamRequest
	upstream := newStandInDataRegistryServer(&captured, http.StatusOK, `{"namespaces":[["default"]]}`, nil)
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	req, err := http.NewRequest(http.MethodGet, "http://bff.example/api/v1/my-project/namespaces", nil)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer user-token-123")
	req.Header.Set("X-User", "spoofed@example.com")
	req.Header.Set(constants.KubeflowUserIDHeader, "spoofed@example.com")
	req.Header.Set(constants.KubeflowUserGroupsIdHeader, "spoofed-group")

	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	res := rr.Result()
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Empty(t, captured.Header.Get("X-User"), "X-User must never be forwarded to the upstream")
	assert.Empty(t, captured.Header.Get(constants.KubeflowUserIDHeader), "kubeflow-userid must never be forwarded to the upstream")
	assert.Empty(t, captured.Header.Get(constants.KubeflowUserGroupsIdHeader), "kubeflow-groups must never be forwarded to the upstream")
	assert.Equal(t, "Bearer user-token-123", captured.Header.Get("Authorization"))
}

func TestDataRegistryProxy_CreateNamespace_ForwardsBodyAndMethod(t *testing.T) {
	var captured capturedUpstreamRequest
	upstream := newStandInDataRegistryServer(&captured, http.StatusOK, `{"namespace":["analytics"],"properties":{}}`, nil)
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	reqBody := []byte(`{"namespace":["analytics"]}`)
	res := doRegistryProxyRequest(t, app, http.MethodPost, "http://bff.example/api/v1/my-project/namespaces", reqBody, "user-token-123")
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Equal(t, http.MethodPost, captured.Method)
	assert.Equal(t, "/v1/my-project/namespaces", captured.Path)
	assert.JSONEq(t, string(reqBody), string(captured.Body))
	assert.Equal(t, "application/json", captured.Header.Get("Content-Type"))
}

func TestDataRegistryProxy_NestedPath_TableRoute(t *testing.T) {
	var captured capturedUpstreamRequest
	upstream := newStandInDataRegistryServer(&captured, http.StatusOK, `{}`, nil)
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example/api/v1/my-project/namespaces/analytics/tables/orders", nil, "tok")
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Equal(t, "/v1/my-project/namespaces/analytics/tables/orders", captured.Path)
}

// TestDataRegistryProxy_ArbitraryUpstreamPath confirms the "dumb catchall" behavior: any path
// under DataRegistryPathPrefix is forwarded, even one the BFF has no explicit knowledge of, so
// new upstream endpoints are reachable without a BFF change.
func TestDataRegistryProxy_ArbitraryUpstreamPath(t *testing.T) {
	var captured capturedUpstreamRequest
	upstream := newStandInDataRegistryServer(&captured, http.StatusOK, `{}`, nil)
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example/api/v1/some/brand-new/upstream/route", nil, "tok")
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Equal(t, "/v1/some/brand-new/upstream/route", captured.Path)
}

func TestDataRegistryProxy_SearchQueryStringPassthrough(t *testing.T) {
	var captured capturedUpstreamRequest
	upstream := newStandInDataRegistryServer(&captured, http.StatusOK, `{"query":"orders","results":[]}`, nil)
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example/api/v1/my-project/search?query=orders&limit=10&type=table", nil, "tok")
	defer res.Body.Close()

	assert.Equal(t, http.StatusOK, res.StatusCode)
	assert.Equal(t, "/v1/my-project/search", captured.Path)
	assert.Equal(t, "query=orders&limit=10&type=table", captured.Query)
}

func TestDataRegistryProxy_HeadRequest_NoBodyWritten(t *testing.T) {
	var captured capturedUpstreamRequest
	upstream := newStandInDataRegistryServer(&captured, http.StatusNoContent, "", nil)
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	res := doRegistryProxyRequest(t, app, http.MethodHead, "http://bff.example/api/v1/my-project/namespaces/analytics", nil, "tok")
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	require.NoError(t, err)

	assert.Equal(t, http.StatusNoContent, res.StatusCode)
	assert.Empty(t, body)
	assert.Equal(t, http.MethodHead, captured.Method)
}

func TestDataRegistryProxy_DeleteRequest(t *testing.T) {
	var captured capturedUpstreamRequest
	upstream := newStandInDataRegistryServer(&captured, http.StatusNoContent, "", nil)
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	res := doRegistryProxyRequest(t, app, http.MethodDelete, "http://bff.example/api/v1/my-project/namespaces/analytics", nil, "tok")
	defer res.Body.Close()

	assert.Equal(t, http.StatusNoContent, res.StatusCode)
	assert.Equal(t, http.MethodDelete, captured.Method)
	assert.Equal(t, "/v1/my-project/namespaces/analytics", captured.Path)
}

// errorPassthroughCases confirm upstream error responses (in Iceberg REST's ErrorResponse
// shape) are relayed with the original status/body untransformed, per the epic's acceptance
// criteria that the BFF performs no business logic on responses.
func TestDataRegistryProxy_ErrorResponsesRelayedUnmodified(t *testing.T) {
	cases := []struct {
		name   string
		status int
		body   string
	}{
		{"not_found", http.StatusNotFound, `{"error":{"message":"Namespace does not exist: missing","type":"NoSuchNamespaceException","code":404}}`},
		{"conflict", http.StatusConflict, `{"error":{"message":"Namespace already exists: analytics","type":"AlreadyExistsException","code":409}}`},
		{"forbidden", http.StatusForbidden, `{"error":{"message":"Access denied","type":"ForbiddenException","code":403}}`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var captured capturedUpstreamRequest
			upstream := newStandInDataRegistryServer(&captured, tc.status, tc.body, map[string]string{"Content-Type": "application/json"})
			defer upstream.Close()

			app := newRegistryProxyTestApp(upstream.URL)

			res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example/api/v1/my-project/namespaces/missing", nil, "tok")
			defer res.Body.Close()

			respBody, err := io.ReadAll(res.Body)
			require.NoError(t, err)

			assert.Equal(t, tc.status, res.StatusCode)
			assert.JSONEq(t, tc.body, string(respBody))
		})
	}
}

func TestDataRegistryProxy_MissingBearerToken_RejectedWithoutCallingUpstream(t *testing.T) {
	var upstreamCalled bool
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamCalled = true
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	// With no Authorization header at all, InjectRequestIdentity's ExtractRequestIdentity
	// fails before the proxy handler ever runs (same behavior as every other authenticated
	// route in this BFF), yielding a 400 rather than the handler's own 401 guard. That guard
	// exists as defense-in-depth for a RequestIdentity present in context with an empty token.
	res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example/api/v1/my-project/namespaces", nil, "")
	defer res.Body.Close()

	assert.Equal(t, http.StatusBadRequest, res.StatusCode)
	assert.False(t, upstreamCalled, "upstream Data Registry API must not be called without a bearer token")
}

func TestDataRegistryProxy_EmptyTokenInIdentity_ReturnsUnauthorized(t *testing.T) {
	// Exercises the handler's own defense-in-depth guard directly, bypassing
	// InjectRequestIdentity, for a RequestIdentity present in context with an empty token.
	var upstreamCalled bool
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamCalled = true
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	req := httptest.NewRequest(http.MethodGet, "http://bff.example/api/v1/my-project/namespaces", nil)
	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, &kubernetes.RequestIdentity{Token: ""})
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.DataRegistryReverseProxy().ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.False(t, upstreamCalled, "upstream Data Registry API must not be called without a bearer token")
}

func TestDataRegistryProxy_UnconfiguredAPIURL_ReturnsServiceUnavailable(t *testing.T) {
	app := newRegistryProxyTestApp("")

	res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example/api/v1/my-project/namespaces", nil, "tok")
	defer res.Body.Close()

	assert.Equal(t, http.StatusServiceUnavailable, res.StatusCode)
}

// TestDataRegistryProxy_MalformedAPIURL_ReturnsServiceUnavailable covers a non-empty but
// structurally invalid configured URL (e.g. a corrupted ConfigMap value or flag), which must be
// rejected the same way as "unconfigured" rather than reaching url.Parse's zero-value behavior.
func TestDataRegistryProxy_MalformedAPIURL_ReturnsServiceUnavailable(t *testing.T) {
	app := newRegistryProxyTestApp("not-a-valid-url")

	res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example/api/v1/my-project/namespaces", nil, "tok")
	defer res.Body.Close()

	assert.Equal(t, http.StatusServiceUnavailable, res.StatusCode)
}

// TestDataRegistryProxy_DiscoveryRoutes covers the two non-project-scoped upstream routes
// (/v1/config, /v1/projects) — with the catchall design these need no special-casing at all,
// unlike the old per-operation httprouter setup.
func TestDataRegistryProxy_DiscoveryRoutes(t *testing.T) {
	cases := []struct {
		name         string
		bffPath      string
		upstreamPath string
	}{
		{"config", "/api/v1/config", "/v1/config"},
		{"projects", "/api/v1/projects", "/v1/projects"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var captured capturedUpstreamRequest
			upstream := newStandInDataRegistryServer(&captured, http.StatusOK, `{}`, nil)
			defer upstream.Close()

			app := newRegistryProxyTestApp(upstream.URL)

			res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example"+tc.bffPath, nil, "tok")
			defer res.Body.Close()

			assert.Equal(t, http.StatusOK, res.StatusCode)
			assert.Equal(t, tc.upstreamPath, captured.Path)
		})
	}
}

// TestDataRegistryProxy_OwnHandlersTakePrecedence confirms the BFF's own /api/v1/user and
// /api/v1/namespaces endpoints are NOT swallowed by the Data Registry catchall proxy, even
// though both share the same DataRegistryPathPrefix ("/api/v1").
func TestDataRegistryProxy_OwnHandlersTakePrecedence(t *testing.T) {
	var upstreamCalled bool
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamCalled = true
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	app := newRegistryProxyTestApp(upstream.URL)

	res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example"+UserPath, nil, "tok")
	defer res.Body.Close()

	assert.False(t, upstreamCalled, "the BFF's own /api/v1/user handler must not be shadowed by the Data Registry catchall proxy")
}

func TestDataRegistryProxy_UnreachableUpstream_ReturnsServiceUnavailable(t *testing.T) {
	upstream := newStandInDataRegistryServer(&capturedUpstreamRequest{}, http.StatusOK, "{}", nil)
	upstreamURL := upstream.URL
	upstream.Close() // closed immediately: connections to it will now fail

	app := newRegistryProxyTestApp(upstreamURL)

	res := doRegistryProxyRequest(t, app, http.MethodGet, "http://bff.example/api/v1/my-project/namespaces", nil, "tok")
	defer res.Body.Close()

	assert.Equal(t, http.StatusServiceUnavailable, res.StatusCode)
}
