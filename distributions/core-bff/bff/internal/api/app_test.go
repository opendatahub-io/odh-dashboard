package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()

	tmpDir := t.TempDir()
	indexHTML := filepath.Join(tmpDir, "index.html")
	err := os.WriteFile(indexHTML, []byte("<html><body>test</body></html>"), 0600)
	require.NoError(t, err)

	app := newTestApp(func(a *App) {
		a.config.StaticAssetsDir = tmpDir
	})

	return httptest.NewServer(app.Routes())
}

func TestRoutes_HealthcheckEndpoint(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := http.Get(ts.URL + HealthCheckPath)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]any
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)
	assert.Equal(t, "available", body["status"])
}

func TestRoutes_ApiHealthcheckEndpoint(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := http.Get(ts.URL + APIHealthCheckPath)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestRoutes_BareApiReturns404(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := http.Get(ts.URL + APIPathPrefix)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNotFound, resp.StatusCode)

	var body map[string]any
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	errObj, ok := body["error"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "NOT_FOUND", errObj["code"])
}

func TestRoutes_PrefixedBareApiReturns404(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := http.Get(ts.URL + PathPrefix + APIPathPrefix)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNotFound, resp.StatusCode)

	var body map[string]any
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	errObj, ok := body["error"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "NOT_FOUND", errObj["code"])
}

func TestRoutes_UnknownApiRouteReturns404(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := http.Get(ts.URL + APIPathPrefix + APIVersion + "/doesnotexist")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNotFound, resp.StatusCode)

	var body map[string]any
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	errObj, ok := body["error"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "NOT_FOUND", errObj["code"])
}

func TestRoutes_SPAFallback(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Contains(t, string(body), "<html>")
}

func TestRoutes_MethodNotAllowed(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := http.Post(ts.URL+APIHealthCheckPath, "application/json", nil)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusMethodNotAllowed, resp.StatusCode)
}

func TestRoutes_PrefixedApiHealthcheck(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := http.Get(ts.URL + PathPrefix + APIHealthCheckPath)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestRoutes_OpenAPIJSON(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := http.Get(ts.URL + OpenAPIJSONPath)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "application/json", resp.Header.Get("Content-Type"))

	var body map[string]any
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)
	assert.Equal(t, "3.0.3", body["openapi"])
}

func TestRoutes_OpenAPIYAML(t *testing.T) {
	ts := newTestServer(t)
	defer ts.Close()

	resp, err := http.Get(ts.URL + OpenAPIYAMLPath)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "text/yaml", resp.Header.Get("Content-Type"))

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Contains(t, string(body), "openapi:")
}

func TestRoutes_K8sProxyPaths(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Got-Path", r.URL.Path)
		w.Header().Set("X-Got-Auth", r.Header.Get("Authorization"))
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"kind":"PodList"}`))
	}))
	defer backend.Close()

	k8sProxyHandler, err := proxy.NewK8sProxyHandler(proxy.K8sProxyConfig{
		K8sHost:   backend.URL,
		AllowHTTP: true,
		Logger:    testLogger(),
	})
	require.NoError(t, err)

	tmpDir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte("<html></html>"), 0600))

	app := newTestApp(func(a *App) {
		a.config.StaticAssetsDir = tmpDir
		a.k8sProxy = k8sProxyHandler
	})

	ts := httptest.NewServer(app.Routes())
	defer ts.Close()

	tests := []struct {
		name     string
		path     string
		wantPath string
	}{
		{"bare path", "/api/k8s/api/v1/pods", "/api/v1/pods"},
		{"prefixed path", "/core-bff/api/k8s/api/v1/pods", "/api/v1/pods"},
		{"bare namespaced", "/api/k8s/apis/apps/v1/namespaces/test/deployments", "/apis/apps/v1/namespaces/test/deployments"},
		{"prefixed namespaced", "/core-bff/api/k8s/apis/apps/v1/namespaces/test/deployments", "/apis/apps/v1/namespaces/test/deployments"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.Get(ts.URL + tt.path)
			require.NoError(t, err)
			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode)
			assert.Equal(t, tt.wantPath, resp.Header.Get("X-Got-Path"))
			assert.NotEmpty(t, resp.Header.Get("X-Got-Auth"), "auth header should be set by middleware")
		})
	}
}

func TestRoutes_WsProxyPaths(t *testing.T) {
	wsBackend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
	defer wsBackend.Close()

	tracker := proxy.NewConnectionTracker(testLogger())
	defer tracker.Stop()

	wsHandler, err := proxy.NewWsProxyHandler(proxy.WsProxyConfig{
		K8sHost:        wsBackend.URL,
		AllowHTTP:      true,
		AllowedOrigins: []string{"*"},
		Tracker:        tracker,
		Logger:         testLogger(),
	})
	require.NoError(t, err)

	tmpDir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte("<html></html>"), 0600))

	app := newTestApp(func(a *App) {
		a.config.StaticAssetsDir = tmpDir
		a.wsProxy = wsHandler
		a.wsTracker = tracker
	})

	ts := httptest.NewServer(app.Routes())
	defer ts.Close()

	paths := []struct {
		name string
		path string
	}{
		{"bare path", "/wss/k8s/api/v1/pods"},
		{"prefixed path", "/core-bff/wss/k8s/api/v1/pods"},
	}

	for _, tt := range paths {
		t.Run(tt.name, func(t *testing.T) {
			wsURL := "ws" + strings.TrimPrefix(ts.URL, "http") + tt.path
			conn, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
			require.NoError(t, err, "WebSocket dial should succeed for %s", tt.path)
			defer conn.Close()

			assert.Equal(t, http.StatusSwitchingProtocols, resp.StatusCode)

			testMsg := "hello"
			require.NoError(t, conn.WriteMessage(websocket.TextMessage, []byte(testMsg)))

			_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
			_, msg, err := conn.ReadMessage()
			require.NoError(t, err)
			assert.Equal(t, "echo:"+testMsg, string(msg))
		})
	}
}
