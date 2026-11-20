package proxy

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// RHOAIENG-96081: the proxies forward only the caller credential resolved by
// InjectRequestIdentity, never a caller-supplied identity, and never forward a
// request anonymously.

func TestK8sProxy_StripsCallerSuppliedIdentityAndCredentialHeaders(t *testing.T) {
	var got http.Header
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Clone()
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	cfg := testK8sProxyConfig(backend.URL)
	cfg.AuthTokenHeader = "x-forwarded-access-token"
	cfg.AuthTokenHeaders = []string{"Authorization", "X-Entra-Access-Token"}
	handler, err := NewK8sProxyHandler(cfg)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil).WithContext(newIdentityContext("caller-token"))
	for _, h := range []string{
		"Impersonate-User", "Impersonate-Group", "Impersonate-Uid", "Impersonate-Extra-Scopes",
		"X-Remote-User", "X-Remote-Group", "X-Remote-Extra-Scopes",
		"X-Remote-Uid", "X-Remote-Anything-Else", "x-rEmOtE-lowercase",
		"X-Forwarded-User", "X-Forwarded-Groups",
		"X-Forwarded-Access-Token", "X-Entra-Access-Token",
	} {
		req.Header.Set(h, "spoofed")
	}
	req.Header.Set("Authorization", "Bearer spoofed")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	assert.Equal(t, "Bearer caller-token", got.Get("Authorization"), "only the resolved caller token is forwarded")
	for name, values := range got {
		for _, v := range values {
			assert.NotEqual(t, "spoofed", v, "header %s leaked to the API server", name)
		}
	}
}

func TestK8sProxy_ConfiguredCredentialHeadersRemovedFromErrorResponses(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("X-Entra-Access-Token", "echoed")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"kind":"Status","apiVersion":"v1","status":"Failure","code":403,"reason":"Forbidden"}`))
	}))
	defer backend.Close()

	cfg := testK8sProxyConfig(backend.URL)
	cfg.AuthTokenHeaders = []string{"X-Entra-Access-Token"}
	handler, err := NewK8sProxyHandler(cfg)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil).WithContext(newIdentityContext("caller-token"))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusForbidden, rec.Code)
	assert.Empty(t, rec.Header().Get("X-Entra-Access-Token"))
}

func TestK8sProxy_RefusesToForwardWithoutCallerCredential(t *testing.T) {
	tests := []struct {
		name string
		ctx  context.Context
	}{
		{"no identity", context.Background()},
		{"identity without token", context.WithValue(context.Background(), constants.RequestIdentityKey, &k8s.RequestIdentity{})},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			called := false
			backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				called = true
				w.WriteHeader(http.StatusOK)
			}))
			defer backend.Close()

			handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
			require.NoError(t, err)

			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil).WithContext(tc.ctx))
			assert.Equal(t, http.StatusUnauthorized, rec.Code)
			assert.False(t, called, "an uncredentialed request must not reach the API server")
		})
	}
}

func TestK8sProxy_DevFallbackIdentityStillForwards(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(backend.URL))
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil).WithContext(newDevFallbackIdentityContext("")))
	assert.Equal(t, http.StatusOK, rec.Code, "DEV_MODE authenticates with the kubeconfig on purpose")
}

func TestWsProxy_RefusesIdentityWithoutToken(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()
	handler, err := NewWsProxyHandler(testWsConfig("http://127.0.0.1:1", tracker))
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods?watch=true", nil)
	req = req.WithContext(context.WithValue(req.Context(), constants.RequestIdentityKey, &k8s.RequestIdentity{}))
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "websocket")
	req.Header.Set("Sec-WebSocket-Version", "13")
	req.Header.Set("Sec-WebSocket-Key", "dGhlIHNhbXBsZSBub25jZQ==")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestSensitiveIngressHeaders_IncludesEveryConfiguredHeader(t *testing.T) {
	got := SensitiveIngressHeaders("x-forwarded-access-token", "", "Authorization")
	assert.Contains(t, got, "x-forwarded-access-token")
	assert.Contains(t, got, "Authorization")
	assert.NotContains(t, got, "")
}

// testClientCert returns a throwaway self-signed client certificate.
func testClientCert(t *testing.T) tls.Certificate {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)
	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "kubeconfig-admin"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	require.NoError(t, err)
	return tls.Certificate{Certificate: [][]byte{der}, PrivateKey: key}
}

// certRecordingServer is a TLS upstream that records whether each request
// presented a client certificate, and upgrades WebSocket requests.
func certRecordingServer(t *testing.T) (*httptest.Server, chan bool) {
	t.Helper()
	presented := make(chan bool, 4)
	srv := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		presented <- len(r.TLS.PeerCertificates) > 0
		if websocket.IsWebSocketUpgrade(r) {
			conn, err := (&websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}).Upgrade(w, r, nil)
			if err == nil {
				_ = conn.Close()
			}
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	srv.TLS = &tls.Config{ClientAuth: tls.RequestClientCert, MinVersion: tls.VersionTLS12}
	srv.StartTLS()
	t.Cleanup(srv.Close)
	return srv, presented
}

// The kubeconfig client certificate authenticates before a bearer token, so it
// must reach the API server only for the DEV_MODE fallback identity, never with
// a caller credential (review: DEV_MODE proxies acted as the kubeconfig user).
func TestK8sProxy_DevFallbackCertOnlyForDevFallbackIdentity(t *testing.T) {
	srv, presented := certRecordingServer(t)
	cfg := testK8sProxyConfig(srv.URL)
	cfg.DevFallbackClientCerts = []tls.Certificate{testClientCert(t)}
	handler, err := NewK8sProxyHandler(cfg)
	require.NoError(t, err)

	for _, tc := range []struct {
		name     string
		ctx      context.Context
		wantCert bool
	}{
		{"caller token", newIdentityContext("caller-token"), false},
		{"dev fallback", newDevFallbackIdentityContext(""), true},
		{"caller token after dev fallback", newIdentityContext("caller-token"), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/pods", nil).WithContext(tc.ctx))
			require.Equal(t, http.StatusOK, rec.Code)
			assert.Equal(t, tc.wantCert, <-presented)
		})
	}
}

func TestWsProxy_DevFallbackCertOnlyForDevFallbackIdentity(t *testing.T) {
	srv, presented := certRecordingServer(t)
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()
	cfg := testWsConfig(srv.URL, tracker)
	cfg.InsecureSkipVerify = true
	cfg.DevFallbackClientCerts = []tls.Certificate{testClientCert(t)}
	handler, err := NewWsProxyHandler(cfg)
	require.NoError(t, err)

	for _, tc := range []struct {
		name     string
		ctx      context.Context
		wantCert bool
	}{
		{"caller token", newIdentityContext("caller-token"), false},
		{"dev fallback", newDevFallbackIdentityContext("dev-token"), true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			front := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handler.ServeHTTP(w, r.WithContext(tc.ctx))
			}))
			defer front.Close()
			conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(front.URL, "http")+"/wss/k8s/api/v1/pods?watch=true", nil)
			require.NoError(t, err)
			_ = conn.Close()
			assert.Equal(t, tc.wantCert, <-presented)
		})
	}
}
