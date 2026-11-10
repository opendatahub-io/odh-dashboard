package proxy

import (
	"encoding/base64"
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

func TestWsProxy_UpgradeResponseHeaders(t *testing.T) {
	k8sWS := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
		// Queue a synthetic Set-Cookie on w to verify it does NOT leak into the 101.
		w.Header().Set("Set-Cookie", "test-cookie=synthetic")
		ctx := newIdentityContext("token")
		handler.ServeHTTP(w, r.WithContext(ctx))
	}))
	defer proxyServer.Close()

	wsURL := "ws" + strings.TrimPrefix(proxyServer.URL, "http") + "/wss/k8s/api/v1/pods"

	t.Run("101 includes nosniff and preserves subprotocol", func(t *testing.T) {
		dialer := websocket.Dialer{
			Subprotocols: []string{"base64.binary.k8s.io"},
		}
		conn, resp, err := dialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("dial error: %v", err)
		}
		defer conn.Close()
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusSwitchingProtocols {
			t.Errorf("status = %d, want %d", resp.StatusCode, http.StatusSwitchingProtocols)
		}
		if got := resp.Header.Values("X-Content-Type-Options"); len(got) != 1 || got[0] != "nosniff" {
			t.Errorf("X-Content-Type-Options = %q, want exactly [nosniff]", got)
		}
		if got := resp.Header.Values("Sec-WebSocket-Protocol"); len(got) != 1 || got[0] != "base64.binary.k8s.io" {
			t.Errorf("Sec-WebSocket-Protocol = %q, want [base64.binary.k8s.io]", got)
		}
		if sp := conn.Subprotocol(); sp != "base64.binary.k8s.io" {
			t.Errorf("subprotocol = %q, want %q", sp, "base64.binary.k8s.io")
		}
	})

	t.Run("101 includes nosniff without subprotocol", func(t *testing.T) {
		conn, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("dial error: %v", err)
		}
		defer conn.Close()
		defer resp.Body.Close()

		if got := resp.Header.Values("X-Content-Type-Options"); len(got) != 1 || got[0] != "nosniff" {
			t.Errorf("X-Content-Type-Options = %q, want exactly [nosniff]", got)
		}
	})

	t.Run("queued headers on ResponseWriter do not leak into 101", func(t *testing.T) {
		conn, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("dial error: %v", err)
		}
		defer conn.Close()
		defer resp.Body.Close()

		if got := resp.Header.Values("Set-Cookie"); len(got) != 0 {
			t.Errorf("Set-Cookie = %q, want empty (queued headers should not leak)", got)
		}
	})

	t.Run("connection still works after header change", func(t *testing.T) {
		conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("dial error: %v", err)
		}
		defer conn.Close()

		testMsg := "header-test"
		if err := conn.WriteMessage(websocket.TextMessage, []byte(testMsg)); err != nil {
			t.Fatalf("write error: %v", err)
		}
		_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		_, msg, err := conn.ReadMessage()
		if err != nil {
			t.Fatalf("read error: %v", err)
		}
		if string(msg) != testMsg {
			t.Errorf("got %q, want %q", string(msg), testMsg)
		}
	})
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

func TestBearerSubprotocolIsNeverReflectedToBrowser(t *testing.T) {
	bearer := bearerSubprotocol("CANARY_TOKEN")
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }, Subprotocols: []string{bearer}}
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer c.Close()
		_ = c.SetReadDeadline(time.Now().Add(5 * time.Second))
		_, _, _ = c.ReadMessage()
	}))
	defer backend.Close()
	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()
	handler, err := NewWsProxyHandler(testWsConfig(backend.URL, tracker))
	require.NoError(t, err)
	server := httptest.NewServer(httpcontract.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler.ServeHTTP(w, r.WithContext(identityContext(r, "CANARY_TOKEN")))
	})))
	defer server.Close()
	dialer := websocket.Dialer{Subprotocols: []string{bearer}}
	c, resp, err := dialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/wss/k8s/api/v1/pods", nil)
	require.NoError(t, err)
	defer c.Close()
	require.Empty(t, c.Subprotocol())
	require.Empty(t, resp.Header.Get("Sec-WebSocket-Protocol"))
}

func TestUpgradeVersionFailureRetainsProtocolHeader(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "http://proxy/wss/k8s", nil)
	request.Header.Set("Connection", "Upgrade")
	request.Header.Set("Upgrade", "websocket")
	request.Header.Set(constants.HeaderSecWebSocketVersion, "12")
	response := httptest.NewRecorder()
	upgrader := newUpgrader([]string{"*"})
	_, err := upgrader.Upgrade(response, request, nil)
	require.Error(t, err)
	require.Equal(t, http.StatusBadRequest, response.Code)
	require.Equal(t, constants.WebSocketVersion, response.Header().Get(constants.HeaderSecWebSocketVersion))
	require.Contains(t, response.Header().Get("Content-Type"), "application/json")
	require.Contains(t, response.Body.String(), `"code":"BAD_REQUEST"`)
	require.NotEmpty(t, response.Header().Get(httpcontract.RequestIDHeader))
}
