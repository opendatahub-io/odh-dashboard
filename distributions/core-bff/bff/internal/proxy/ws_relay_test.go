package proxy

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/stretchr/testify/require"
)

func TestWsProxy_BidirectionalForwarding(t *testing.T) {
	k8sWS := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		for {
			mt, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			_ = conn.WriteMessage(mt, append([]byte("echo:"), msg...))
		}
	}))
	defer k8sWS.Close()

	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	handler, err := NewWsProxyHandler(testWsConfig(k8sWS.URL, tracker))
	if err != nil {
		t.Fatalf("NewWsProxyHandler() error = %v", err)
	}

	proxyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := newIdentityContext("token")
		handler.ServeHTTP(w, r.WithContext(ctx))
	}))
	defer proxyServer.Close()

	wsURL := "ws" + strings.TrimPrefix(proxyServer.URL, "http") + "/wss/k8s/api/v1/pods"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer conn.Close()

	testMsg := "hello k8s"
	if err := conn.WriteMessage(websocket.TextMessage, []byte(testMsg)); err != nil {
		t.Fatalf("write error: %v", err)
	}

	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("read error: %v", err)
	}

	expected := "echo:" + testMsg
	if string(msg) != expected {
		t.Errorf("got %q, want %q", string(msg), expected)
	}
}

func TestWsProxy_ConnectionTracking(t *testing.T) {
	k8sWS := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}))
	defer k8sWS.Close()

	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	handler, err := NewWsProxyHandler(testWsConfig(k8sWS.URL, tracker))
	if err != nil {
		t.Fatalf("NewWsProxyHandler() error = %v", err)
	}

	proxyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := newIdentityContext("token")
		handler.ServeHTTP(w, r.WithContext(ctx))
	}))
	defer proxyServer.Close()

	wsURL := "ws" + strings.TrimPrefix(proxyServer.URL, "http") + "/wss/k8s/api/v1/pods"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}

	time.Sleep(50 * time.Millisecond)

	if count := tracker.ActiveCount(); count != 1 {
		t.Errorf("active count = %d, want 1", count)
	}

	conn.Close()
	time.Sleep(100 * time.Millisecond)

	if count := tracker.ActiveCount(); count != 0 {
		t.Errorf("after close, active count = %d, want 0", count)
	}
}

func TestWebSocketWatchErrorSanitization(t *testing.T) {
	for _, prefix := range []string{"", constants.BFFPathPrefix} {
		for _, path := range []string{
			"/api/v1/pods?watch=true",
			"/api/v1/pods?watch=1",
			"/api/v1/pods?watch",
			"/api/v1/watch/namespaces/project/pods",
			"/apis/apps/v1/watch/namespaces/project/deployments?watch=false",
		} {
			for _, eventType := range []string{`ERROR`, `\u0045RROR`} {
				t.Run(prefix+path+"/"+eventType, func(t *testing.T) {
					event := `{"type":"` + eventType + `","object":{"kind":"Status","reason":"Expired","code":410,"message":"CANARY"}}`
					messageType, body := readProxiedWebSocketMessage(t, prefix, path, websocket.TextMessage, []byte(event))
					require.Equal(t, websocket.TextMessage, messageType)
					require.NotContains(t, string(body), "CANARY")
					require.Contains(t, string(body), `"reason":"Expired"`)
					require.Contains(t, string(body), `"code":410`)
				})
			}
		}
	}
}

func TestWebSocketNonWatchMessagesRemainOpaque(t *testing.T) {
	event := []byte(` {"type":"ERROR","object":{"kind":"ApplicationData","message":"application-owned text"}} `)
	for _, prefix := range []string{"", constants.BFFPathPrefix} {
		for _, path := range []string{
			"/api/v1/pods",
			"/api/v1/pods?watch=false",
			"/api/v1/pods?watch=0",
			"/api/v1/namespaces/watch/pods",
		} {
			for _, messageType := range []int{websocket.TextMessage, websocket.BinaryMessage} {
				t.Run(fmt.Sprintf("%s%s/type=%d", prefix, path, messageType), func(t *testing.T) {
					gotType, body := readProxiedWebSocketMessage(t, prefix, path, messageType, event)
					require.Equal(t, messageType, gotType)
					require.Equal(t, event, body)
				})
			}
		}
	}
}

func readProxiedWebSocketMessage(t *testing.T, prefix, path string, messageType int, message []byte) (int, []byte) {
	t.Helper()
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := newUpgrader([]string{"*"})
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Errorf("upgrade failed: %v", err)
			return
		}
		defer conn.Close()
		require.NoError(t, conn.WriteMessage(messageType, message))
		_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
		_, _, _ = conn.ReadMessage()
	}))
	defer backend.Close()
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()
	handler, err := NewWsProxyHandler(testWsConfig(backend.URL, tracker))
	require.NoError(t, err)
	if prefix != "" {
		handler = http.StripPrefix(prefix, handler)
	}
	server := httptest.NewServer(httpcontract.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler.ServeHTTP(w, r.WithContext(identityContext(r, "token")))
	})))
	defer server.Close()
	conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+prefix+strings.TrimSuffix(WssProxyPrefix, "/")+path, nil)
	require.NoError(t, err)
	defer conn.Close()
	_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	gotType, body, err := conn.ReadMessage()
	require.NoError(t, err)
	return gotType, body
}
