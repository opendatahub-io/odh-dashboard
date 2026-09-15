package proxy

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestSanitizeCloseCode(t *testing.T) {
	tests := []struct {
		name string
		code int
		want int
	}{
		{"1004 to 1011", 1004, 1011},
		{"1005 to 1011", 1005, 1011},
		{"1006 to 1011", 1006, 1011},
		{"1000 unchanged", 1000, 1000},
		{"1001 unchanged", 1001, 1001},
		{"1011 unchanged", 1011, 1011},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SanitizeCloseCode(tt.code); got != tt.want {
				t.Errorf("SanitizeCloseCode(%d) = %d, want %d", tt.code, got, tt.want)
			}
		})
	}
}

func TestCloseCodeFromError(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		{
			name: "normal close error",
			err:  &websocket.CloseError{Code: websocket.CloseNormalClosure},
			want: websocket.CloseNormalClosure,
		},
		{
			name: "reserved code 1005 sanitized",
			err:  &websocket.CloseError{Code: 1005},
			want: 1011,
		},
		{
			name: "non-close error defaults to internal server error",
			err:  fmt.Errorf("connection reset"),
			want: websocket.CloseInternalServerErr,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CloseCodeFromError(tt.err)
			if got != tt.want {
				t.Errorf("CloseCodeFromError() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestBearerSubprotocol(t *testing.T) {
	token := "my-k8s-token" //nolint:gosec // G101: test fixture, not a real credential
	sp := BearerSubprotocol(token)

	const prefix = "base64url.bearer.authorization.k8s.io."
	if !strings.HasPrefix(sp, prefix) {
		t.Fatalf("BearerSubprotocol() = %q, missing prefix %q", sp, prefix)
	}

	encoded := strings.TrimPrefix(sp, prefix)
	decoded, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		t.Fatalf("base64url decode error: %v", err)
	}
	if string(decoded) != token {
		t.Errorf("decoded = %q, want %q", string(decoded), token)
	}
}

func TestOriginChecker(t *testing.T) {
	tests := []struct {
		name           string
		allowedOrigins []string
		host           string
		origin         string
		want           bool
	}{
		{"nil origins same-origin allowed", nil, "dashboard.example.com", "https://dashboard.example.com", true},
		{"nil origins cross-origin blocked", nil, "dashboard.example.com", "https://evil.com", false},
		{"nil origins empty origin blocked", nil, "dashboard.example.com", "", false},
		{"empty origins same-origin allowed", []string{}, "dashboard.example.com", "https://dashboard.example.com", true},
		{"empty origins cross-origin blocked", []string{}, "dashboard.example.com", "https://evil.com", false},
		{"wildcard allows all", []string{"*"}, "dashboard.example.com", "https://evil.com", true},
		{"matching origin allowed", []string{"https://dashboard.example.com"}, "dashboard.example.com", "https://dashboard.example.com", true},
		{"non-matching origin blocked", []string{"https://dashboard.example.com"}, "dashboard.example.com", "https://evil.com", false},
		{"empty origin header blocked", []string{"https://dashboard.example.com"}, "dashboard.example.com", "", false},
		{"trailing slash normalized", []string{"https://dashboard.example.com/"}, "dashboard.example.com", "https://dashboard.example.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			checker := OriginChecker(tt.allowedOrigins)
			req := httptest.NewRequest(http.MethodGet, "/api/v1/watch", nil)
			req.Host = tt.host
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			if got := checker(req); got != tt.want {
				t.Errorf("OriginChecker() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNewUpgrader(t *testing.T) {
	upgrader := NewUpgrader([]string{"https://dashboard.example.com"})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/watch", nil)
	req.Host = "dashboard.example.com"
	req.Header.Set("Origin", "https://dashboard.example.com")
	if !upgrader.CheckOrigin(req) {
		t.Error("expected upgrader to accept matching origin")
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/watch", nil)
	req2.Host = "dashboard.example.com"
	req2.Header.Set("Origin", "https://evil.com")
	if upgrader.CheckOrigin(req2) {
		t.Error("expected upgrader to reject non-matching origin")
	}
}

func TestClearHTTPDeadlines(t *testing.T) {
	wsServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		ClearHTTPDeadlines(conn)

		netConn := conn.UnderlyingConn()
		if netConn == nil {
			t.Error("expected non-nil underlying conn")
			return
		}
		if tc, ok := netConn.(*net.TCPConn); ok {
			if err := tc.SetDeadline(time.Time{}); err != nil {
				t.Errorf("SetDeadline after ClearHTTPDeadlines failed: %v", err)
			}
		}

		_ = conn.WriteMessage(websocket.TextMessage, []byte("ok"))
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}))
	defer wsServer.Close()

	wsURL := "ws" + strings.TrimPrefix(wsServer.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer conn.Close()

	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("read error: %v", err)
	}
	if string(msg) != "ok" {
		t.Errorf("got %q, want %q", string(msg), "ok")
	}
}

func TestSendCloseMessage(t *testing.T) {
	wsServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		SendCloseMessage(conn, fmt.Errorf("test error"))
	}))
	defer wsServer.Close()

	wsURL := "ws" + strings.TrimPrefix(wsServer.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer conn.Close()

	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, readErr := conn.ReadMessage()
	if readErr == nil {
		t.Fatal("expected close error, got nil")
	}
	var closeErr *websocket.CloseError
	if !errors.As(readErr, &closeErr) {
		t.Fatalf("expected websocket.CloseError, got %T: %v", readErr, readErr)
	}
	if closeErr.Code != websocket.CloseInternalServerErr {
		t.Errorf("close code = %d, want %d", closeErr.Code, websocket.CloseInternalServerErr)
	}
}

func TestDialK8sWebSocket_BearerAuth(t *testing.T) {
	type dialObservation struct {
		auth         string
		subprotocols []string
	}
	obsCh := make(chan dialObservation, 1)

	k8sWS := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		obsCh <- dialObservation{
			auth:         r.Header.Get("Authorization"),
			subprotocols: websocket.Subprotocols(r),
		}
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

	targetURL, _ := url.Parse(k8sWS.URL)
	wsURL := "ws" + strings.TrimPrefix(k8sWS.URL, "http") + "/api/v1/pods"

	conn, _, err := DialK8sWebSocket(wsURL, NewTLSConfig(nil, true), "my-k8s-token", targetURL, nil, nil)
	if err != nil {
		t.Fatalf("DialK8sWebSocket() error = %v", err)
	}
	defer conn.Close()

	obs := <-obsCh

	if obs.auth != "Bearer my-k8s-token" {
		t.Errorf("Authorization = %q, want %q", obs.auth, "Bearer my-k8s-token")
	}

	var bearerSP string
	for _, sp := range obs.subprotocols {
		if strings.HasPrefix(sp, "base64url.bearer.authorization.k8s.io.") {
			bearerSP = sp
			break
		}
	}
	if bearerSP == "" {
		t.Fatal("bearer subprotocol not found in dial request")
	}
	encoded := strings.TrimPrefix(bearerSP, "base64url.bearer.authorization.k8s.io.")
	decoded, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		t.Fatalf("failed to decode bearer subprotocol: %v", err)
	}
	if string(decoded) != "my-k8s-token" {
		t.Errorf("decoded bearer token = %q, want %q", string(decoded), "my-k8s-token")
	}
}

func TestDialK8sWebSocket_Headers(t *testing.T) {
	var gotHost, gotOrigin string

	k8sWS := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotHost = r.Host
		gotOrigin = r.Header.Get("Origin")
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

	targetURL, _ := url.Parse(k8sWS.URL)
	wsURL := "ws" + strings.TrimPrefix(k8sWS.URL, "http") + "/api/v1/pods"

	conn, _, err := DialK8sWebSocket(wsURL, NewTLSConfig(nil, true), "token", targetURL, nil, nil)
	if err != nil {
		t.Fatalf("DialK8sWebSocket() error = %v", err)
	}
	defer conn.Close()

	time.Sleep(50 * time.Millisecond)

	if gotHost == "" {
		t.Error("expected Host header to be set on dial to K8s, got empty")
	}
	if gotOrigin == "" {
		t.Error("expected Origin header to be set on dial to K8s, got empty")
	}
}

func TestDialK8sWebSocket_SubprotocolForwarding(t *testing.T) {
	var gotSubprotocols []string

	k8sWS := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotSubprotocols = websocket.Subprotocols(r)
		upgrader := websocket.Upgrader{
			CheckOrigin:  func(r *http.Request) bool { return true },
			Subprotocols: []string{"base64.binary.k8s.io"},
		}
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

	targetURL, _ := url.Parse(k8sWS.URL)
	wsURL := "ws" + strings.TrimPrefix(k8sWS.URL, "http") + "/api/v1/pods"

	t.Run("without client subprotocols", func(t *testing.T) {
		gotSubprotocols = nil
		conn, _, err := DialK8sWebSocket(wsURL, NewTLSConfig(nil, true), "token", targetURL, nil, nil)
		if err != nil {
			t.Fatalf("DialK8sWebSocket() error = %v", err)
		}
		defer conn.Close()

		hasBearerSP := false
		for _, sp := range gotSubprotocols {
			if strings.HasPrefix(sp, "base64url.bearer.authorization.k8s.io.") {
				hasBearerSP = true
			}
		}
		if !hasBearerSP {
			t.Error("K8s server did not receive bearer subprotocol")
		}
	})

	t.Run("with client subprotocols", func(t *testing.T) {
		gotSubprotocols = nil
		conn, _, err := DialK8sWebSocket(wsURL, NewTLSConfig(nil, true), "token", targetURL, nil, []string{"base64.binary.k8s.io"})
		if err != nil {
			t.Fatalf("DialK8sWebSocket() error = %v", err)
		}
		defer conn.Close()

		header := NegotiatedSubprotocolHeader(conn, []string{"base64.binary.k8s.io"})
		if header == nil {
			t.Error("expected negotiated subprotocol header, got nil")
		} else if sp := header.Get("Sec-WebSocket-Protocol"); sp != "base64.binary.k8s.io" {
			t.Errorf("negotiated subprotocol = %q, want %q", sp, "base64.binary.k8s.io")
		}

		hasBearerSP := false
		hasDataSP := false
		for _, sp := range gotSubprotocols {
			if strings.HasPrefix(sp, "base64url.bearer.authorization.k8s.io.") {
				hasBearerSP = true
			}
			if sp == "base64.binary.k8s.io" {
				hasDataSP = true
			}
		}
		if !hasBearerSP {
			t.Error("K8s server did not receive bearer subprotocol")
		}
		if !hasDataSP {
			t.Error("K8s server did not receive client data subprotocol")
		}
	})
}

func TestBridgeConnections_Forwarding(t *testing.T) {
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

	targetURL, _ := url.Parse(k8sWS.URL)
	wsURL := "ws" + strings.TrimPrefix(k8sWS.URL, "http") + "/api/v1/pods"

	targetConn, _, err := DialK8sWebSocket(wsURL, NewTLSConfig(nil, true), "token", targetURL, nil, nil)
	if err != nil {
		t.Fatalf("DialK8sWebSocket() error = %v", err)
	}

	clientServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
		clientConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		BridgeConnections(tracker, clientConn, targetConn)
	}))
	defer clientServer.Close()

	clientURL := "ws" + strings.TrimPrefix(clientServer.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(clientURL, nil)
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

func TestBridgeConnections_Tracking(t *testing.T) {
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

	targetURL, _ := url.Parse(k8sWS.URL)
	wsURL := "ws" + strings.TrimPrefix(k8sWS.URL, "http") + "/api/v1/pods"

	targetConn, _, err := DialK8sWebSocket(wsURL, NewTLSConfig(nil, true), "token", targetURL, nil, nil)
	if err != nil {
		t.Fatalf("DialK8sWebSocket() error = %v", err)
	}

	clientServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
		clientConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		BridgeConnections(tracker, clientConn, targetConn)
	}))
	defer clientServer.Close()

	clientURL := "ws" + strings.TrimPrefix(clientServer.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(clientURL, nil)
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
