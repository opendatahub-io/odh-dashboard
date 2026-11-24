package proxy

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A client-supplied bearer subprotocol never reaches the API server: the
// handshake carries only the BFF's resolved token, so one request never holds
// two identities. Non-credential subprotocols are still negotiated.
func TestWsProxy_StripsClientBearerSubprotocols(t *testing.T) {
	got := make(chan []string, 1)
	k8sWS := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got <- websocket.Subprotocols(r)
		up := websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }, Subprotocols: []string{"base64.binary.k8s.io"}}
		if c, err := up.Upgrade(w, r, nil); err == nil {
			_ = c.Close()
		}
	}))
	defer k8sWS.Close()
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()
	handler, err := NewWsProxyHandler(testWsConfig(k8sWS.URL, tracker))
	require.NoError(t, err)
	front := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler.ServeHTTP(w, r.WithContext(newIdentityContext("resolved-token")))
	}))
	defer front.Close()

	dialer := websocket.Dialer{Subprotocols: []string{
		bearerSubprotocolPrefix + base64.RawURLEncoding.EncodeToString([]byte("client-token")),
		"base64.binary.k8s.io",
	}}
	conn, _, err := dialer.Dial("ws"+strings.TrimPrefix(front.URL, "http")+"/wss/k8s/api/v1/pods", nil)
	require.NoError(t, err)
	defer conn.Close()

	upstream := <-got
	assert.Equal(t, []string{
		bearerSubprotocolPrefix + base64.RawURLEncoding.EncodeToString([]byte("resolved-token")),
		"base64.binary.k8s.io",
	}, upstream)
	assert.Equal(t, "base64.binary.k8s.io", conn.Subprotocol())
}

func TestBearerSubprotocolToken(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods", nil)
	_, ok := BearerSubprotocolToken(req)
	assert.False(t, ok)

	req.Header.Set("Sec-WebSocket-Protocol", "base64.binary.k8s.io, "+bearerSubprotocolPrefix+base64.RawURLEncoding.EncodeToString([]byte("caller")))
	token, ok := BearerSubprotocolToken(req)
	assert.True(t, ok)
	assert.Equal(t, "caller", token)

	req.Header.Set("Sec-WebSocket-Protocol", bearerSubprotocolPrefix+"!!!")
	token, ok = BearerSubprotocolToken(req)
	assert.True(t, ok)
	assert.Empty(t, token, "an undecodable bearer subprotocol is a present but invalid credential")
}

// A bearer subprotocol on a second Sec-WebSocket-Protocol line is still seen:
// websocket.Subprotocols reads only the first line.
func TestBearerSubprotocolToken_ReadsEveryHeaderLine(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods", nil)
	req.Header.Add("Sec-WebSocket-Protocol", "base64.binary.k8s.io")
	req.Header.Add("Sec-WebSocket-Protocol", bearerSubprotocolPrefix+base64.RawURLEncoding.EncodeToString([]byte("caller")))
	token, ok := BearerSubprotocolToken(req)
	assert.True(t, ok)
	assert.Equal(t, "caller", token)
	assert.Equal(t, []string{"base64.binary.k8s.io"}, withoutBearerSubprotocols(AllSubprotocols(req.Header)))
}

// Reverse proxies (module, model-serving) pass upgrades through; a client
// bearer subprotocol must not ride along next to the resolved identity, on
// any header line.
func TestReverseProxy_StripsBearerSubprotocols(t *testing.T) {
	got := make(chan []string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got <- r.Header.Values("Sec-Websocket-Protocol")
	}))
	defer upstream.Close()
	u := mustURL(t, upstream.URL)
	rp, err := NewReverseProxy(ProxyConfig{TargetURL: u, AllowHTTP: true, Logger: testLogger()})
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/x", nil).WithContext(newIdentityContext("caller-A"))
	req.Header.Add("Sec-WebSocket-Protocol", "base64.binary.k8s.io, "+bearerSubprotocolPrefix+"b3RoZXItQg")
	req.Header.Add("Sec-WebSocket-Protocol", bearerSubprotocolPrefix+"b3RoZXItQw")
	rp.ServeHTTP(httptest.NewRecorder(), req)

	assert.Equal(t, []string{"base64.binary.k8s.io"}, <-got)
}
