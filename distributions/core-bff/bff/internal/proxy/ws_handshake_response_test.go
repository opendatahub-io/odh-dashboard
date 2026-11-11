package proxy

import (
	"crypto/tls"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestHandshakeResponseTLSVerificationAndUpgrade(t *testing.T) {
	upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := newUpgrader([]string{"*"})
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		_ = conn.WriteMessage(websocket.TextMessage, []byte("ready"))
		_, _, _ = conn.ReadMessage()
	}))
	defer upstream.Close()
	for _, trusted := range []bool{false, true} {
		t.Run(map[bool]string{false: "untrusted", true: "trusted"}[trusted], func(t *testing.T) {
			tracker := NewConnectionTracker(testLogger())
			defer tracker.Stop()
			cfg := testWsConfig(upstream.URL, tracker)
			if trusted {
				cfg.RootCAs = upstream.Client().Transport.(*http.Transport).TLSClientConfig.RootCAs
			}
			handler, err := NewWsProxyHandler(cfg)
			require.NoError(t, err)
			server := httptest.NewServer(httpcontract.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handler.ServeHTTP(w, r.WithContext(identityContext(r, "test-token")))
			})))
			defer server.Close()
			conn, response, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/wss/k8s/api/v1/pods", nil)
			if !trusted {
				require.Error(t, err)
				require.Nil(t, conn)
				require.NotNil(t, response)
				defer response.Body.Close()
				require.Equal(t, http.StatusBadGateway, response.StatusCode)
				return
			}
			require.NoError(t, err)
			defer conn.Close()
			_ = conn.SetReadDeadline(time.Now().Add(time.Second))
			_, message, err := conn.ReadMessage()
			require.NoError(t, err)
			require.Equal(t, "ready", string(message))
		})
	}
}

func TestHandshakeResponseDoesNotDrainOversizedRejections(t *testing.T) {
	closed := make(chan struct{})
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer close(closed)
		w.WriteHeader(http.StatusForbidden)
		_, _ = io.WriteString(w, strings.Repeat("x", (1<<20)+1))
		w.(http.Flusher).Flush()
		<-r.Context().Done()
	}))
	defer upstream.Close()
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()
	handler, err := NewWsProxyHandler(testWsConfig(upstream.URL, tracker))
	require.NoError(t, err)
	r := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods", nil)
	r.Header.Set("Connection", "Upgrade")
	r.Header.Set("Upgrade", "websocket")
	r.Header.Set("Origin", "https://example.test")
	r = r.WithContext(identityContext(r, "test-token"))
	response := httptest.NewRecorder()
	httpcontract.Middleware(handler).ServeHTTP(response, r)
	require.Equal(t, http.StatusForbidden, response.Code)
	var status metav1.Status
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &status))
	require.Equal(t, metav1.StatusReasonForbidden, status.Reason)
	select {
	case <-closed:
	case <-time.After(time.Second):
		t.Fatal("the oversized upstream body must be closed without waiting for EOF")
	}
}

func TestHandshakeWithNilTLSConfigStillVerifiesCertificates(t *testing.T) {
	upstream := httptest.NewTLSServer(http.NotFoundHandler())
	defer upstream.Close()
	dialer := &websocket.Dialer{HandshakeTimeout: time.Second}
	conn, response, err := dialWithHandshakeResponse(dialer, "wss"+strings.TrimPrefix(upstream.URL, "https"), nil, "127.0.0.1", nil)
	require.Nil(t, conn)
	require.Nil(t, response)
	var certificateError *tls.CertificateVerificationError
	require.ErrorAs(t, err, &certificateError)
}
