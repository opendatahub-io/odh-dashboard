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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testClientCert returns a self-signed client certificate standing in for the
// developer's kubeconfig credential.
func testClientCert(t *testing.T) tls.Certificate {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)
	template := &x509.Certificate{
		SerialNumber: big.NewInt(7),
		Subject:      pkix.Name{CommonName: "system:admin"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	require.NoError(t, err)
	return tls.Certificate{Certificate: [][]byte{der}, PrivateKey: key}
}

// certRecordingAPIServer is a TLS server that asks for, but does not require,
// a client certificate and reports how many each request presented.
func certRecordingAPIServer(t *testing.T) (*httptest.Server, <-chan int) {
	t.Helper()
	seen := make(chan int, 4)
	srv := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen <- len(r.TLS.PeerCertificates)
		w.WriteHeader(http.StatusForbidden)
	}))
	srv.TLS = &tls.Config{ClientAuth: tls.RequestClientCert, MinVersion: tls.VersionTLS12}
	srv.StartTLS()
	t.Cleanup(srv.Close)
	return srv, seen
}

// A DEV_MODE caller that sends its own token must be authenticated by that
// token alone. The kubeconfig certificate belongs only to fallback requests,
// which have no caller token.
func TestK8sProxy_FallbackClientCertOnlyOnDevFallbackRequests(t *testing.T) {
	api, seen := certRecordingAPIServer(t)
	cfg := testK8sProxyConfig(api.URL)
	cfg.FallbackClientCerts = []tls.Certificate{testClientCert(t)}
	handler, err := NewK8sProxyHandler(cfg)
	require.NoError(t, err)

	for _, tc := range []struct {
		name  string
		ctx   context.Context
		certs int
	}{
		{"caller token", newIdentityContext("caller-token"), 0},
		{"dev fallback", newDevFallbackIdentityContext("unused"), 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/namespaces", nil).WithContext(tc.ctx)
			handler.ServeHTTP(httptest.NewRecorder(), req)
			assert.Equal(t, tc.certs, <-seen)
		})
	}
}

func TestWsProxy_FallbackClientCertOnlyOnDevFallbackHandshakes(t *testing.T) {
	api, seen := certRecordingAPIServer(t)
	tracker := NewConnectionTracker(testLogger())
	t.Cleanup(tracker.Stop)
	cfg := testWsConfig(api.URL, tracker)
	cfg.InsecureSkipVerify = true
	cfg.FallbackClientCerts = []tls.Certificate{testClientCert(t)}
	handler, err := NewWsProxyHandler(cfg)
	require.NoError(t, err)

	for _, tc := range []struct {
		name  string
		ctx   context.Context
		certs int
	}{
		{"caller token", newIdentityContext("caller-token"), 0},
		{"dev fallback", newDevFallbackIdentityContext("unused"), 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			front := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handler.ServeHTTP(w, r.WithContext(tc.ctx))
			}))
			defer front.Close()
			wsURL := "ws" + strings.TrimPrefix(front.URL, "http") + "/wss/k8s/api/v1/pods"
			conn, _, dialErr := websocket.DefaultDialer.Dial(wsURL, nil)
			if conn != nil {
				_ = conn.Close()
			}
			require.Error(t, dialErr, "the recording API server rejects every handshake")
			assert.Equal(t, tc.certs, <-seen)
		})
	}
}
