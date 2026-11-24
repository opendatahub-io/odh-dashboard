package api

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These tests drive the real handler tree (app.Routes) and check that every
// transport sees the same caller credential, resolved once by
// InjectRequestIdentity with the configured header precedence. RHOAIENG-96081.

const (
	callerToken = "eyJ.caller.sig"   //nolint:gosec // G101: test fixture, not a credential
	otherToken  = "eyJ.intruder.sig" //nolint:gosec // G101: test fixture, not a credential
)

// recordingFactory extracts credentials with the production TokenClientFactory
// and records which token each REST client was built for.
type recordingFactory struct {
	real k8s.KubernetesClientFactory
	mu   sync.Mutex
	seen []string
}

func (f *recordingFactory) ExtractRequestIdentity(h http.Header) (*k8s.RequestIdentity, error) {
	return f.real.ExtractRequestIdentity(h)
}

func (f *recordingFactory) ValidateRequestIdentity(id *k8s.RequestIdentity) error {
	return f.real.ValidateRequestIdentity(id)
}

func (f *recordingFactory) GetClient(ctx context.Context) (k8s.KubernetesClientInterface, error) {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		return nil, fmt.Errorf("missing identity")
	}
	f.mu.Lock()
	f.seen = append(f.seen, identity.Token.Raw())
	f.mu.Unlock()
	return &namedUserClient{user: "caller"}, nil
}

type namedUserClient struct {
	stubDynClient
	user string
}

func (c *namedUserClient) GetUser(_ context.Context, _ *k8s.RequestIdentity) (string, error) {
	return c.user, nil
}

// transportRecorder stands in for a proxy and records the identity it was handed.
type transportRecorder struct {
	mu   sync.Mutex
	seen []string
}

func (r *transportRecorder) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	identity, _ := req.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	r.mu.Lock()
	if identity != nil {
		r.seen = append(r.seen, identity.Token.Raw())
	} else {
		r.seen = append(r.seen, "")
	}
	r.mu.Unlock()
	w.WriteHeader(http.StatusOK)
}

type transportApp struct {
	handler http.Handler
	rest    *recordingFactory
	k8s     *transportRecorder
	ws      *transportRecorder
	module  *transportRecorder
	serving *transportRecorder
}

func newTransportApp(t *testing.T, mutate func(*config.EnvConfig)) transportApp {
	t.Helper()
	cfg := config.EnvConfig{
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
	}
	if mutate != nil {
		mutate(&cfg)
	}
	ta := transportApp{
		rest:    &recordingFactory{real: k8s.NewTokenClientFactory(testLogger(), cfg)},
		k8s:     &transportRecorder{},
		ws:      &transportRecorder{},
		module:  &transportRecorder{},
		serving: &transportRecorder{},
	}
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = cfg.AuthMethod
		a.config.AuthTokenHeader = cfg.AuthTokenHeader
		a.config.AuthTokenPrefix = cfg.AuthTokenPrefix
		a.config.AuthTokenHeaders = cfg.AuthTokenHeaders
		a.kubernetesClientFactory = ta.rest
		a.k8sProxy = ta.k8s
		a.wsProxy = ta.ws
		a.moduleProxies = []moduleProxyHandler{{path: "/gen-ai", handler: ta.module}}
		a.modelServingProxy = ta.serving
	})
	ta.handler = app.Routes()
	return ta
}

type transportCase struct {
	name   string
	path   string
	record func(transportApp) []string
}

// transports lists one route per transport, plus the /core-bff prefixed form.
var transports = []transportCase{
	{"REST handler", UserPath, func(a transportApp) []string { return a.rest.seen }},
	{"REST handler (prefixed)", PathPrefix + UserPath, func(a transportApp) []string { return a.rest.seen }},
	{"Kubernetes HTTP proxy", "/api/k8s/api/v1/namespaces/demo/pods", func(a transportApp) []string { return a.k8s.seen }},
	{"Kubernetes HTTP proxy (prefixed)", PathPrefix + "/api/k8s/api/v1/namespaces/demo/pods", func(a transportApp) []string { return a.k8s.seen }},
	{"Kubernetes WebSocket proxy", "/wss/k8s/api/v1/namespaces/demo/pods", func(a transportApp) []string { return a.ws.seen }},
	{"Kubernetes WebSocket proxy (prefixed)", PathPrefix + "/wss/k8s/api/v1/namespaces/demo/pods", func(a transportApp) []string { return a.ws.seen }},
	{"module proxy", "/gen-ai/api/v1/models", func(a transportApp) []string { return a.module.seen }},
	{"model-serving proxy", ModelServingProxyPrefix + "api/v1/deployments", func(a transportApp) []string { return a.serving.seen }},
}

var xksHeaders = func(c *config.EnvConfig) {
	c.AuthTokenHeaders = []string{"Authorization", "x-forwarded-access-token"}
}

func serve(h http.Handler, path string, hdr http.Header) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for k, v := range hdr {
		for _, vv := range v {
			req.Header.Add(k, vv)
		}
	}
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	return rr
}

func hdr(kv ...string) http.Header {
	h := http.Header{}
	for i := 0; i+1 < len(kv); i += 2 {
		h.Add(kv[i], kv[i+1])
	}
	return h
}

// assertOnlyCaller checks the transport ran, and every client it built carried
// the caller's token. A REST request builds a client in the route guard and
// again in the handler, so the count is not fixed.
func assertOnlyCaller(t *testing.T, seen []string) {
	t.Helper()
	require.NotEmpty(t, seen, "the transport did not run")
	for _, tok := range seen {
		assert.Equal(t, callerToken, tok)
	}
}

func TestCallerAuth_EveryTransportSeesTheSameCaller(t *testing.T) {
	accepted := []struct {
		name string
		in   http.Header
	}{
		{"Authorization only", hdr("Authorization", "Bearer "+callerToken)},
		{"x-forwarded-access-token only", hdr("X-Forwarded-Access-Token", callerToken)},
		{"both headers agree", hdr("Authorization", "Bearer "+callerToken, "X-Forwarded-Access-Token", callerToken)},
	}
	for _, tr := range transports {
		for _, tc := range accepted {
			t.Run(tr.name+"/"+tc.name, func(t *testing.T) {
				app := newTransportApp(t, xksHeaders)
				rr := serve(app.handler, tr.path, tc.in)
				assert.NotEqual(t, http.StatusUnauthorized, rr.Code, rr.Body.String())
				assertOnlyCaller(t, tr.record(app))
			})
		}
	}
}

func TestCallerAuth_EveryTransportFailsClosed(t *testing.T) {
	rejected := []struct {
		name string
		in   http.Header
	}{
		{"no credential", http.Header{}},
		{"empty headers", hdr("Authorization", "", "X-Forwarded-Access-Token", "")},
		{"whitespace-only", hdr("X-Forwarded-Access-Token", "   ")},
		{"non-bearer Authorization", hdr("Authorization", "Basic dXNlcjpwYXNz")},
		{"malformed Authorization does not fall back", hdr("Authorization", "Basic dXNlcjpwYXNz", "X-Forwarded-Access-Token", callerToken)},
		{"conflicting tokens", hdr("Authorization", "Bearer "+callerToken, "X-Forwarded-Access-Token", otherToken)},
		{"repeated Authorization", hdr("Authorization", "Bearer "+callerToken, "Authorization", "Bearer "+otherToken)},
		{"identity headers are not credentials", hdr("X-Forwarded-User", "admin", "Impersonate-User", "admin", "X-Remote-User", "admin")},
	}
	for _, tr := range transports {
		for _, tc := range rejected {
			t.Run(tr.name+"/"+tc.name, func(t *testing.T) {
				app := newTransportApp(t, xksHeaders)
				rr := serve(app.handler, tr.path, tc.in)
				assert.Equal(t, http.StatusUnauthorized, rr.Code)
				assert.Empty(t, tr.record(app), "the transport must not run without a caller credential")
				assert.NotContains(t, rr.Body.String(), callerToken)
				assert.NotContains(t, rr.Body.String(), otherToken)
				assert.NotContains(t, rr.Body.String(), "dXNlcjpwYXNz")
			})
		}
	}
}

// The OpenShift single-header contract is unchanged: only the configured header
// is read, and Authorization is not a fallback.
func TestCallerAuth_LegacySingleHeaderUnchanged(t *testing.T) {
	for _, tr := range transports {
		t.Run(tr.name, func(t *testing.T) {
			app := newTransportApp(t, nil)
			rr := serve(app.handler, tr.path, hdr("Authorization", "Bearer "+callerToken))
			assert.Equal(t, http.StatusUnauthorized, rr.Code)
			assert.Empty(t, tr.record(app))

			rr = serve(app.handler, tr.path, hdr("X-Forwarded-Access-Token", callerToken))
			assert.NotEqual(t, http.StatusUnauthorized, rr.Code)
			assertOnlyCaller(t, tr.record(app))
		})
	}
}

func TestCallerAuth_PublicRoutesNeedNoCredential(t *testing.T) {
	app := newTransportApp(t, xksHeaders)
	assert.Equal(t, http.StatusOK, serve(app.handler, HealthCheckPath, nil).Code)
	assert.NotEqual(t, http.StatusUnauthorized, serve(app.handler, "/", nil).Code, "the static SPA shell is public")
}

func TestCallerAuth_ErrorEnvelopeIsCredentialFailure(t *testing.T) {
	app := newTransportApp(t, xksHeaders)
	rr := serve(app.handler, UserPath, hdr("Authorization", "Bearer "+callerToken, "X-Forwarded-Access-Token", otherToken))
	require.Equal(t, http.StatusUnauthorized, rr.Code)
	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
	assert.NotEmpty(t, body.Error.Code)
	assert.NotContains(t, strings.ToLower(body.Error.Code), "unavailable", "auth failures stay distinguishable from upstream availability")
}

// The configured header list drives redaction, CORS and Vary, including a
// custom header that is not one of the two well-known names.
func TestCallerAuth_ConfiguredHeadersAreRedactedAllowedAndVaried(t *testing.T) {
	const custom = "X-Entra-Access-Token" //nolint:gosec // G101: header name, not a credential

	var logs bytes.Buffer
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
		a.config.AuthTokenHeaders = []string{custom, "Authorization"}
		a.config.AllowedOrigins = []string{"https://dashboard.example.com"}
		a.logger = slog.New(slog.NewTextHandler(&logs, &slog.HandlerOptions{Level: slog.LevelDebug}))
		a.kubernetesClientFactory = &recordingFactory{real: k8s.NewTokenClientFactory(testLogger(), a.config)}
	})
	h := app.Routes()

	rr := serve(h, UserPath, hdr(custom, callerToken))
	assert.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	assert.NotContains(t, logs.String(), callerToken, "the configured credential header must be redacted in request logs")
	assert.Contains(t, strings.Join(rr.Header().Values(constants.HeaderVary), ","), custom)

	preflight := httptest.NewRequest(http.MethodOptions, UserPath, nil)
	preflight.Header.Set("Origin", "https://dashboard.example.com")
	preflight.Header.Set("Access-Control-Request-Method", http.MethodGet)
	preflight.Header.Set("Access-Control-Request-Headers", strings.ToLower(custom))
	pr := httptest.NewRecorder()
	h.ServeHTTP(pr, preflight)
	assert.Contains(t, strings.ToLower(pr.Header().Get("Access-Control-Allow-Headers")), strings.ToLower(custom))
}

func TestCredentialHeaders_IncludesModuleOutboundHeader(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthTokenHeader = config.DefaultAuthTokenHeader
		a.config.AuthTokenHeaders = []string{"Authorization"}
	})
	assert.Equal(t, []string{"Authorization", "X-Forwarded-Access-Token"}, app.credentialHeaders(),
		"AUTH_TOKEN_HEADER stays in the strip/redact set because module proxies re-inject it")

	legacy := newTestApp()
	assert.Equal(t, []string{"X-Forwarded-Access-Token"}, legacy.credentialHeaders())
}

// RHOAIENG-101218: the caller resolver goes through the request identity and
// fails without one; it never yields service-account clients.
func TestCallerClientsFrom(t *testing.T) {
	_, _, err := callerClientsFrom(nil)(context.Background())
	require.Error(t, err)

	_, _, err = callerClientsFrom(testK8sFactory)(context.Background())
	require.Error(t, err, "no identity in context must fail")
	assert.ErrorIs(t, err, httpcontract.ErrIdentityUnresolved, "a missing identity is a 401, not an internal error")

	factory := &recordingFactory{real: k8s.NewTokenClientFactory(testLogger(), config.EnvConfig{AuthTokenHeader: config.DefaultAuthTokenHeader})}
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: k8s.NewBearerToken(callerToken)})
	_, _, err = callerClientsFrom(factory)(ctx)
	require.Error(t, err, "a client without a typed clientset is an error, not a fallback")
	assert.Equal(t, []string{callerToken}, factory.seen)

	user := k8mocks.DefaultTestUsers[0]
	ctx = context.WithValue(context.Background(), constants.RequestIdentityKey, &k8s.RequestIdentity{Token: k8s.NewBearerToken(user.Token)})
	typed, dyn, err := callerClientsFrom(testK8sFactory)(ctx)
	require.NoError(t, err)
	assert.NotNil(t, typed)
	assert.NotNil(t, dyn)
}

// DEV_MODE substitutes the kubeconfig identity only when no credential was
// sent; a malformed or conflicting credential is rejected as in production.
func TestCallerAuth_DevModeRejectsInvalidCredentials(t *testing.T) {
	rejected := []http.Header{
		hdr("Authorization", "Basic dXNlcjpwYXNz"),
		hdr("Authorization", "Bearer "+callerToken, "X-Forwarded-Access-Token", otherToken),
		hdr("X-Forwarded-Access-Token", "   "),
	}
	for _, in := range rejected {
		app := newTestApp(func(a *App) {
			a.config.AuthMethod = config.AuthMethodUser
			a.config.DevMode = true
			a.config.AuthTokenHeaders = []string{"Authorization", "x-forwarded-access-token"}
			a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), a.config)
		})
		inner, called := trackingHTTPHandler()
		rr := serve(app.InjectRequestIdentity(inner), UserPath, in)
		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.False(t, *called)
	}

	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
		a.config.DevMode = true
		a.config.AuthTokenHeaders = []string{"Authorization", "x-forwarded-access-token"}
		a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), a.config)
	})
	inner, called := trackingHTTPHandler()
	serve(app.InjectRequestIdentity(inner), UserPath, nil)
	assert.True(t, *called, "no credential at all still takes the DEV_MODE fallback")
}

// rawStatus sends one raw HTTP/1.1 request line with the given header lines to
// h over a real listener, so header parsing is net/http's, not a test map's.
func rawStatus(t *testing.T, h http.Handler, headerLines ...string) int {
	t.Helper()
	srv := httptest.NewServer(h)
	defer srv.Close()
	conn, err := net.Dial("tcp", srv.Listener.Addr().String())
	require.NoError(t, err)
	defer conn.Close()
	req := "GET " + UserPath + " HTTP/1.1\r\nHost: bff\r\nConnection: close\r\n"
	for _, l := range headerLines {
		req += l + "\r\n"
	}
	_, err = conn.Write([]byte(req + "\r\n"))
	require.NoError(t, err)
	resp, err := http.ReadResponse(bufio.NewReader(conn), nil)
	require.NoError(t, err)
	defer resp.Body.Close()
	return resp.StatusCode
}

// Adversarial review: net/http trims header whitespace, so a blank or
// whitespace-only credential header arrives with an empty value. DEV_MODE must
// still treat it as a credential that was sent, never as "no credential".
func TestCallerAuth_DevModeBlankHeaderOnTheWire_NoFallback(t *testing.T) {
	for _, tc := range []struct {
		name    string
		headers []string
		line    string
	}{
		{"ordered, blank Authorization", []string{"Authorization", "x-forwarded-access-token"}, "Authorization:   "},
		{"ordered, whitespace-only forwarded", []string{"Authorization", "x-forwarded-access-token"}, "X-Forwarded-Access-Token: \t "},
		{"legacy header, blank", nil, "X-Forwarded-Access-Token:"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			app := newTestApp(func(a *App) {
				a.config.AuthMethod = config.AuthMethodUser
				a.config.DevMode = true
				a.config.AuthTokenHeaders = tc.headers
				a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), a.config)
			})
			inner, called := trackingHTTPHandler()
			assert.Equal(t, http.StatusUnauthorized, rawStatus(t, app.InjectRequestIdentity(inner), tc.line))
			assert.False(t, *called, "a sent credential header never takes the kubeconfig fallback")
		})
	}

	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
		a.config.DevMode = true
		a.config.AuthTokenHeaders = []string{"Authorization", "x-forwarded-access-token"}
		a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), a.config)
	})
	inner, called := trackingHTTPHandler()
	rawStatus(t, app.InjectRequestIdentity(inner), "X-Unrelated: 1")
	assert.True(t, *called, "no credential header at all still takes the DEV_MODE fallback")
}

// Outside DEV_MODE a request whose only credential headers are blank on the
// wire is a missing credential: 401, never the service account.
func TestCallerAuth_BlankHeadersOnTheWire_401(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
		a.config.AuthTokenHeaders = []string{"Authorization", "x-forwarded-access-token"}
		a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), a.config)
	})
	inner, called := trackingHTTPHandler()
	assert.Equal(t, http.StatusUnauthorized, rawStatus(t, app.InjectRequestIdentity(inner), "Authorization:   ", "X-Forwarded-Access-Token: "))
	assert.False(t, *called)
}

// Restack onto #10753: under DEV_MODE a token the configured headers did not
// carry, in the other identity header or a WebSocket bearer subprotocol, is the
// caller's credential, re-expressed in the first configured header. It is
// used, never replaced by the kubeconfig fallback.
func TestCallerAuth_DevModeAlternateCredentialIsTheCaller(t *testing.T) {
	for _, tc := range []struct {
		name    string
		headers []string
		in      http.Header
	}{
		{"list mode, token in X-Forwarded-Access-Token", []string{"Authorization"}, hdr("X-Forwarded-Access-Token", "some-token")},
		{"list mode, bearer subprotocol", []string{"Authorization"}, hdr("Sec-WebSocket-Protocol", "base64url.bearer.authorization.k8s.io."+base64.RawURLEncoding.EncodeToString([]byte("some-token")))},
		{"legacy mode, token in Authorization", nil, hdr("Authorization", "Bearer some-token")},
	} {
		t.Run(tc.name, func(t *testing.T) {
			app := newTestApp(func(a *App) {
				a.config.AuthMethod = config.AuthMethodUser
				a.config.DevMode = true
				a.config.AuthTokenHeaders = tc.headers
				a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), a.config)
			})
			var got *k8s.RequestIdentity
			inner := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
				got, _ = r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			})
			serve(app.InjectRequestIdentity(inner), UserPath, tc.in)
			require.NotNil(t, got)
			assert.False(t, got.DevFallback, "the caller's token is used, not the kubeconfig")
			assert.Equal(t, "some-token", got.ResolveToken(""))
		})
	}
}

// A configured header sent blank is the caller's (invalid) credential: under
// DEV_MODE no alternate token replaces it.
func TestCallerAuth_DevModeBlankConfiguredHeaderNotReplacedByAlternate(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
		a.config.DevMode = true
		a.config.AuthTokenHeaders = []string{"Authorization"}
		a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), a.config)
	})
	inner, called := trackingHTTPHandler()
	assert.Equal(t, http.StatusUnauthorized,
		rawStatus(t, app.InjectRequestIdentity(inner), "Authorization:", "X-Forwarded-Access-Token: some-token"))
	assert.False(t, *called)
}

// The other identity headers DEV_MODE consults follow the list rules: a
// repeated header or two different tokens fail closed (401).
func TestCallerAuth_DevModeAlternateFollowsListRules(t *testing.T) {
	for _, tc := range []struct {
		name  string
		lines []string
	}{
		{"repeated Authorization", []string{"Authorization: Bearer A", "Authorization: Bearer B"}},
		{"Authorization and X-Forwarded-Access-Token disagree", []string{"Authorization: Bearer A", "X-Forwarded-Access-Token: B"}},
		{"Authorization not Bearer", []string{"Authorization: Basic dXNlcjpwYXNz"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			app := newTestApp(func(a *App) {
				a.config.AuthMethod = config.AuthMethodUser
				a.config.DevMode = true
				a.config.AuthTokenHeader = "X-Auth-Request-Access-Token"
				a.config.AuthTokenHeaders = []string{"X-Auth-Request-Access-Token"}
				a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), a.config)
			})
			inner, called := trackingHTTPHandler()
			assert.Equal(t, http.StatusUnauthorized, rawStatus(t, app.InjectRequestIdentity(inner), tc.lines...))
			assert.False(t, *called)
		})
	}
}
