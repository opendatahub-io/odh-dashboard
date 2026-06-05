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
)

func testWsConfig(host string, tracker *ConnectionTracker) WsProxyConfig {
	return WsProxyConfig{
		K8sHost:        host,
		AllowHTTP:      true,
		AllowedOrigins: []string{"*"},
		Tracker:        tracker,
		Logger:         testLogger(),
	}
}

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
			if got := sanitizeCloseCode(tt.code); got != tt.want {
				t.Errorf("sanitizeCloseCode(%d) = %d, want %d", tt.code, got, tt.want)
			}
		})
	}
}

func TestWsProxy_Unauthorized(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	handler, err := NewWsProxyHandler(testWsConfig("http://localhost:9999", tracker))
	if err != nil {
		t.Fatalf("NewWsProxyHandler() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestWsProxy_NonWebSocketRequestRejected(t *testing.T) {
	var k8sDialed bool
	k8sWS := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		k8sDialed = true
		w.WriteHeader(http.StatusOK)
	}))
	defer k8sWS.Close()

	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	handler, err := NewWsProxyHandler(testWsConfig(k8sWS.URL, tracker))
	if err != nil {
		t.Fatalf("NewWsProxyHandler() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods", nil)
	req = req.WithContext(newIdentityContext("token"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
	if k8sDialed {
		t.Error("K8s backend was dialed for non-WebSocket request")
	}
}

func TestWsProxy_BadOriginRejectedBeforeDial(t *testing.T) {
	var k8sDialed bool
	k8sWS := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		k8sDialed = true
		w.WriteHeader(http.StatusOK)
	}))
	defer k8sWS.Close()

	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	cfg := testWsConfig(k8sWS.URL, tracker)
	cfg.AllowedOrigins = []string{"https://dashboard.example.com"}
	handler, err := NewWsProxyHandler(cfg)
	if err != nil {
		t.Fatalf("NewWsProxyHandler() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods", nil)
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "websocket")
	req.Header.Set("Sec-WebSocket-Version", "13")
	req.Header.Set("Sec-WebSocket-Key", "dGhlIHNhbXBsZSBub25jZQ==")
	req.Header.Set("Origin", "https://evil.com")
	req = req.WithContext(newIdentityContext("token"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusForbidden)
	}
	if k8sDialed {
		t.Error("K8s backend was dialed despite bad origin")
	}
}

func TestWsProxy_BearerAuth(t *testing.T) {
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
			mt, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			_ = conn.WriteMessage(mt, msg)
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
		ctx := newIdentityContext("my-k8s-token")
		handler.ServeHTTP(w, r.WithContext(ctx))
	}))
	defer proxyServer.Close()

	wsURL := "ws" + strings.TrimPrefix(proxyServer.URL, "http") + "/wss/k8s/api/v1/pods"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
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

func TestBuildTargetWSURL(t *testing.T) {
	tests := []struct {
		name     string
		wsScheme string
		host     string
		path     string
		query    string
		want     string
	}{
		{
			name:     "basic path",
			wsScheme: "wss",
			host:     "k8s.example.com",
			path:     "/wss/k8s/api/v1/pods",
			want:     "wss://k8s.example.com/api/v1/pods",
		},
		{
			name:     "with query params",
			wsScheme: "wss",
			host:     "k8s.example.com",
			path:     "/wss/k8s/api/v1/pods",
			query:    "watch=true&labelSelector=app%3Dtest",
			want:     "wss://k8s.example.com/api/v1/pods?watch=true&labelSelector=app%3Dtest",
		},
		{
			name:     "ws scheme",
			wsScheme: "ws",
			host:     "localhost:8080",
			path:     "/wss/k8s/apis/apps/v1/deployments",
			want:     "ws://localhost:8080/apis/apps/v1/deployments",
		},
		{
			name:     "CRD path",
			wsScheme: "wss",
			host:     "k8s.example.com:6443",
			path:     "/wss/k8s/apis/serving.kserve.io/v1beta1/inferenceservices",
			want:     "wss://k8s.example.com:6443/apis/serving.kserve.io/v1beta1/inferenceservices",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path+"?"+tt.query, nil)
			if tt.query == "" {
				req = httptest.NewRequest(http.MethodGet, tt.path, nil)
			}
			got := buildTargetWSURL(tt.wsScheme, tt.host, req)
			if got != tt.want {
				t.Errorf("buildTargetWSURL() = %q, want %q", got, tt.want)
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
			got := closeCodeFromError(tt.err)
			if got != tt.want {
				t.Errorf("closeCodeFromError() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestNewWsProxyHandler_InvalidURL(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	_, err := NewWsProxyHandler(testWsConfig("://invalid", tracker))
	if err == nil {
		t.Error("expected error for invalid URL")
	}
}

func TestWsProxy_DialHeaders(t *testing.T) {
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

	time.Sleep(50 * time.Millisecond)

	if gotHost == "" {
		t.Error("expected Host header to be set on dial to K8s, got empty")
	}
	if gotOrigin == "" {
		t.Error("expected Origin header to be set on dial to K8s, got empty")
	}
}

func TestWsProxy_SubprotocolForwarding(t *testing.T) {
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

	t.Run("client without subprotocols does not receive negotiated subprotocol", func(t *testing.T) {
		gotSubprotocols = nil
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("dial error: %v", err)
		}
		defer conn.Close()

		if sp := conn.Subprotocol(); sp != "" {
			t.Errorf("client got subprotocol %q, want empty", sp)
		}

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

	t.Run("client with subprotocols receives negotiated subprotocol", func(t *testing.T) {
		gotSubprotocols = nil
		dialer := websocket.Dialer{
			Subprotocols: []string{"base64.binary.k8s.io"},
		}
		conn, _, err := dialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("dial error: %v", err)
		}
		defer conn.Close()

		if sp := conn.Subprotocol(); sp != "base64.binary.k8s.io" {
			t.Errorf("client got subprotocol %q, want %q", sp, "base64.binary.k8s.io")
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

func TestNewWsProxyHandler_HTTPBlocked(t *testing.T) {
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	cfg := testWsConfig("http://localhost:9999", tracker)
	cfg.AllowHTTP = false

	_, err := NewWsProxyHandler(cfg)
	if err == nil {
		t.Error("expected error for HTTP target with allowHTTP=false")
	}
	if !strings.Contains(err.Error(), "insecure HTTP") {
		t.Errorf("error = %q, want message about insecure HTTP", err.Error())
	}
}

func TestBearerSubprotocol(t *testing.T) {
	token := "my-k8s-token" //nolint:gosec // G101: test fixture, not a real credential
	sp := bearerSubprotocol(token)

	const prefix = "base64url.bearer.authorization.k8s.io."
	if !strings.HasPrefix(sp, prefix) {
		t.Fatalf("bearerSubprotocol() = %q, missing prefix %q", sp, prefix)
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
		// Empty/nil falls back to same-origin check (Origin host must match request Host).
		{"nil origins same-origin allowed", nil, "dashboard.example.com", "https://dashboard.example.com", true},
		{"nil origins cross-origin blocked", nil, "dashboard.example.com", "https://evil.com", false},
		{"nil origins empty origin blocked", nil, "dashboard.example.com", "", false},
		{"empty origins same-origin allowed", []string{}, "dashboard.example.com", "https://dashboard.example.com", true},
		{"empty origins cross-origin blocked", []string{}, "dashboard.example.com", "https://evil.com", false},
		// Explicit allowlist.
		{"wildcard allows all", []string{"*"}, "dashboard.example.com", "https://evil.com", true}, // explicit opt-in via ALLOWED_ORIGINS=*
		{"matching origin allowed", []string{"https://dashboard.example.com"}, "dashboard.example.com", "https://dashboard.example.com", true},
		{"non-matching origin blocked", []string{"https://dashboard.example.com"}, "dashboard.example.com", "https://evil.com", false},
		{"empty origin header blocked", []string{"https://dashboard.example.com"}, "dashboard.example.com", "", false},
		{"trailing slash normalized", []string{"https://dashboard.example.com/"}, "dashboard.example.com", "https://dashboard.example.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			checker := originChecker(tt.allowedOrigins)
			req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods", nil)
			req.Host = tt.host
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			if got := checker(req); got != tt.want {
				t.Errorf("originChecker() = %v, want %v", got, tt.want)
			}
		})
	}
}
