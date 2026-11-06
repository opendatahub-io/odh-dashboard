package proxy

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
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
	req.Header.Set(constants.HeaderSecWebSocketVersion, constants.WebSocketVersion)
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

func TestWsProxy_DevFallbackToken(t *testing.T) {
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

	tracker := NewConnectionTracker(testLogger())
	defer tracker.Stop()

	cfg := testWsConfig(k8sWS.URL, tracker)
	cfg.DevFallbackToken = "kubeconfig-real-token"
	handler, err := NewWsProxyHandler(cfg)
	if err != nil {
		t.Fatalf("NewWsProxyHandler() error = %v", err)
	}

	proxyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := newDevFallbackIdentityContext("FAKE_CLUSTER_ADMIN_TOKEN")
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

	if obs.auth != "Bearer kubeconfig-real-token" {
		t.Errorf("Authorization = %q, want %q", obs.auth, "Bearer kubeconfig-real-token")
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
	if string(decoded) != "kubeconfig-real-token" {
		t.Errorf("decoded bearer token = %q, want %q", string(decoded), "kubeconfig-real-token")
	}
}

func TestWsProxy_DevFallbackToken_NotUsedForNormalIdentity(t *testing.T) {
	obsCh := make(chan string, 1)

	k8sWS := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		obsCh <- r.Header.Get("Authorization")
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

	cfg := testWsConfig(k8sWS.URL, tracker)
	cfg.DevFallbackToken = "kubeconfig-real-token"
	handler, err := NewWsProxyHandler(cfg)
	if err != nil {
		t.Fatalf("NewWsProxyHandler() error = %v", err)
	}

	proxyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := newIdentityContext("user-bearer-token")
		handler.ServeHTTP(w, r.WithContext(ctx))
	}))
	defer proxyServer.Close()

	wsURL := "ws" + strings.TrimPrefix(proxyServer.URL, "http") + "/wss/k8s/api/v1/pods"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer conn.Close()

	auth := <-obsCh
	if auth != "Bearer user-bearer-token" {
		t.Errorf("Authorization = %q, want %q", auth, "Bearer user-bearer-token")
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
