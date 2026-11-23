package proxy

import (
	"encoding/base64"
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
			"/api/v1/secrets?watch=true",
			"/api/v1/secrets?watch=1",
			"/api/v1/secrets?watch",
			"/api/v1/watch/namespaces/project/secrets",
			"/apis/example.io/v1/watch/namespaces/project/secrets?watch=false",
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

func TestWebSocketWatchPreservesCallerDiagnostics(t *testing.T) {
	for _, prefix := range []string{"", constants.BFFPathPrefix} {
		for _, path := range []string{"/api/v1/pods?watch=true", "/api/v1/watch/namespaces/project/pods"} {
			for _, messageType := range []int{websocket.TextMessage, websocket.BinaryMessage} {
				event := []byte(`{"type":"ERROR","object":{"kind":"Status","code":410,"reason":"Expired","message":"too old resource version: 100 (200); Bearer CANARY_TOKEN"}}`)
				gotType, body := readProxiedWebSocketMessage(t, prefix, path, messageType, event)
				require.Equal(t, messageType, gotType)
				require.Contains(t, string(body), "too old resource version: 100 (200)")
				require.NotContains(t, string(body), "CANARY_TOKEN")
			}
		}
	}
}

func TestWebSocketWatchStreamSanitization(t *testing.T) {
	errorEvent := `{"type":"ERROR","object":{"kind":"Status","code":410,"reason":"Expired","message":"too old resource version; Bearer CANARY_TOKEN"}}`
	resourceEvent := " {\"type\":\"ADDED\",\"object\":{\"data\":{\"value\":\"authorized resource content\"}}}\n"
	for _, transport := range []struct {
		protocol    string
		messageType int
	}{{"", websocket.TextMessage}, {"", websocket.BinaryMessage}, {"binary.k8s.io", websocket.BinaryMessage}, {base64BinarySubprotocol, websocket.TextMessage}} {
		for _, prefix := range []string{"", constants.BFFPathPrefix} {
			for _, tc := range []struct {
				name, path string
				parts      []string
				want       string
			}{
				{"Secret error", "/api/v1/secrets?watch=true", []string{errorEvent}, ""},
				{"fragmented Secret error", "/api/v1/secrets?watch=true", []string{errorEvent[:60], errorEvent[60:]}, ""},
				{"legacy Secret error", "/api/v1/watch/namespaces/project/secrets", []string{errorEvent}, ""},
				{"caller diagnostics", "/api/v1/pods?watch=true", []string{errorEvent}, "too old resource version"},
				{"authorized resource", "/api/v1/secrets?watch=true", []string{resourceEvent}, resourceEvent},
				{"coalesced events", "/api/v1/secrets?watch=true", []string{resourceEvent + errorEvent}, "authorized resource content"},
				{"non-watch opaque", "/api/v1/secrets?watch=false", []string{errorEvent}, errorEvent},
			} {
				t.Run(fmt.Sprintf("%s%s/type=%d/%s", prefix, tc.name, transport.messageType, transport.protocol), func(t *testing.T) {
					messages := make([][]byte, len(tc.parts))
					for i, part := range tc.parts {
						messages[i] = []byte(part)
						if transport.protocol == base64BinarySubprotocol {
							messages[i] = []byte(base64.StdEncoding.EncodeToString(messages[i]))
						}
					}
					messageType, body, err := readProxiedWebSocketFrames(t, prefix, tc.path, transport.messageType, messages, transport.protocol)
					require.NoError(t, err)
					require.Equal(t, transport.messageType, messageType)
					decoded := body
					if transport.protocol == base64BinarySubprotocol {
						decoded, err = base64.StdEncoding.DecodeString(string(body))
						require.NoError(t, err)
					}
					if tc.name == "non-watch opaque" || tc.name == "authorized resource" {
						require.Equal(t, tc.want, string(decoded))
						require.Equal(t, messages[0], body)
						return
					}
					require.NotContains(t, string(decoded), "CANARY_TOKEN")
					require.Contains(t, string(decoded), `"code":410`)
					if tc.want != "" {
						require.Contains(t, string(decoded), tc.want)
					} else {
						require.NotContains(t, string(decoded), "too old resource version")
					}
					if tc.name == "coalesced events" {
						require.True(t, strings.HasPrefix(string(decoded), resourceEvent))
					}
				})
			}
		}
	}
}

func TestBase64WatchMalformedStreamClosesWithoutPayload(t *testing.T) {
	for _, messages := range [][][]byte{
		{[]byte("invalid base64!")},
		{[]byte(base64.StdEncoding.EncodeToString([]byte(`{"type":!"ERROR","message":"CANARY"}`)))},
		{[]byte(base64.StdEncoding.EncodeToString([]byte(`{"type":"ERROR","object":{"message":"CANARY`))), []byte("invalid base64!")},
	} {
		_, body, err := readProxiedWebSocketFrames(t, "", "/api/v1/secrets?watch=true", websocket.TextMessage, messages, base64BinarySubprotocol)
		require.True(t, websocket.IsCloseError(err, websocket.CloseInternalServerErr), "got %v", err)
		require.Empty(t, body)
	}
}

func TestPlainWatchMalformedStreamClosesWithoutPayload(t *testing.T) {
	for _, messageType := range []int{websocket.TextMessage, websocket.BinaryMessage} {
		for _, messages := range [][][]byte{
			{[]byte(`{"type":!"ERROR","message":"CANARY"}`)},
			{[]byte(`{"type":"ERROR","object":{"message":"CANARY`), []byte(`"invalid suffix`)},
		} {
			_, body, err := readProxiedWebSocketFrames(t, "", "/api/v1/secrets?watch=true", messageType, messages, "")
			require.True(t, websocket.IsCloseError(err, websocket.CloseInternalServerErr), "got %v", err)
			require.Empty(t, body)
		}
	}
}

func TestWatchTruncatedUpstreamClosesWithoutPayload(t *testing.T) {
	for _, protocol := range []string{"", base64BinarySubprotocol} {
		fragment := []byte(`{"type":"ERROR","object":{"message":"CANARY`)
		if protocol == base64BinarySubprotocol {
			fragment = []byte(base64.StdEncoding.EncodeToString(fragment))
		}
		_, body, err := readProxiedWebSocketFrames(t, "", "/api/v1/secrets?watch=true", websocket.TextMessage, [][]byte{fragment}, protocol, true)
		require.True(t, websocket.IsCloseError(err, websocket.CloseInternalServerErr), "got %v", err)
		require.Empty(t, body)
	}
}

func TestWatchRejectsMalformedAndOversizedFragments(t *testing.T) {
	for _, message := range [][]byte{
		[]byte(`{"type":!"ERROR","message":"CANARY"}`),
		[]byte(`{"message":"` + strings.Repeat("x", maxWatchPendingBytes)),
	} {
		out, pending, err := proxyWatchMessage(message, nil, func(event []byte) []byte { return event })
		require.Error(t, err)
		require.Empty(t, out)
		require.Empty(t, pending)
	}
}

func readProxiedWebSocketMessage(t *testing.T, prefix, path string, messageType int, message []byte) (int, []byte) {
	t.Helper()
	gotType, body, err := readProxiedWebSocketFrames(t, prefix, path, messageType, [][]byte{message}, "")
	require.NoError(t, err)
	return gotType, body
}

func readProxiedWebSocketFrames(t *testing.T, prefix, path string, messageType int, messages [][]byte, subprotocol string, closeAfter ...bool) (int, []byte, error) {
	t.Helper()
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := newUpgrader([]string{"*"})
		if subprotocol != "" {
			upgrader.Subprotocols = []string{subprotocol}
		}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Errorf("upgrade failed: %v", err)
			return
		}
		defer conn.Close()
		for _, message := range messages {
			require.NoError(t, conn.WriteMessage(messageType, message))
		}
		if len(closeAfter) > 0 && closeAfter[0] {
			require.NoError(t, conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""), time.Now().Add(time.Second)))
			return
		}
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
	dialer := *websocket.DefaultDialer
	if subprotocol != "" {
		dialer.Subprotocols = []string{subprotocol}
	}
	conn, _, err := dialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+prefix+strings.TrimSuffix(WssProxyPrefix, "/")+path, nil)
	require.NoError(t, err)
	defer conn.Close()
	require.Equal(t, subprotocol, conn.Subprotocol())
	_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	gotType, body, err := conn.ReadMessage()
	return gotType, body, err
}
