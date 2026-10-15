package api

import (
	"bufio"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSetSecurityHeaders_APIGetsNoStore(t *testing.T) {
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
		w.WriteHeader(http.StatusOK)
	})

	rr := httptest.NewRecorder()
	app.SetSecurityHeaders(inner).ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/healthcheck", nil))

	assertConsoleSecurityHeaders(t, rr.Header())
	assertNoStoreCache(t, rr.Header())
}

func TestSetSecurityHeaders_NonAPIDoesNotForceNoStore(t *testing.T) {
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(constants.HeaderCacheControl, "public, max-age=31536000, immutable")
		w.WriteHeader(http.StatusOK)
	})

	rr := httptest.NewRecorder()
	app.SetSecurityHeaders(inner).ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/app.abcdef0123456789.js", nil))

	assert.Equal(t, "public, max-age=31536000, immutable", rr.Header().Get(constants.HeaderCacheControl))
	assertConsoleSecurityHeaders(t, rr.Header())
}

func TestSetSecurityHeaders_FlushAppliesHeaders(t *testing.T) {
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
	})

	rr := httptest.NewRecorder()
	app.SetSecurityHeaders(inner).ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/healthcheck", nil))

	assertConsoleSecurityHeaders(t, rr.Header())
	assertNoStoreCache(t, rr.Header())
}

func TestSetSecurityHeaders_DuplicateWriteHeaderIgnored(t *testing.T) {
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.WriteHeader(http.StatusInternalServerError)
	})

	rr := httptest.NewRecorder()
	app.SetSecurityHeaders(inner).ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/healthcheck", nil))

	assert.Equal(t, http.StatusOK, rr.Code)
	assertConsoleSecurityHeaders(t, rr.Header())
}

type hijackRecorder struct {
	http.ResponseWriter
	hijacked bool
}

func (h *hijackRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h.hijacked = true
	c1, c2 := net.Pipe()
	_ = c2.Close()
	return c1, bufio.NewReadWriter(bufio.NewReader(c1), bufio.NewWriter(c1)), nil
}

func TestSetSecurityHeaders_Hijack(t *testing.T) {
	app := newTestApp()
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hijacker, ok := w.(http.Hijacker)
		require.True(t, ok)
		conn, _, err := hijacker.Hijack()
		require.NoError(t, err)
		_ = conn.Close()
	})

	base := httptest.NewRecorder()
	wrapped := &hijackRecorder{ResponseWriter: base}
	app.SetSecurityHeaders(inner).ServeHTTP(wrapped, httptest.NewRequest(http.MethodGet, "/wss/k8s", nil))
	assert.True(t, wrapped.hijacked)
}

func TestIsApiPath(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{"/api", true},
		{"/api/v1/user", true},
		{"/core-bff/api/v1/user", true},
		{"/gen-ai/api/v1/models", true},
		{"/wss", true},
		{"/wss/k8s", true},
		{"/core-bff/wss/k8s", true},
		{"/_bff/mlflow/api", true},
		{"/_bff/mlflow/api/v1", true},
		{"/", false},
		{"/projects", false},
		{"/vendor.js", false},
		{"/_mf/genAi/remoteEntry.js", false},
		{"/agent-ops/healthcheck", false},
		{"/_bff/foo/bar/api", false},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			assert.Equal(t, tt.want, isApiPath(tt.path))
		})
	}
}

func TestForceNoStoreCacheHeaders(t *testing.T) {
	resp := &http.Response{Header: make(http.Header)}
	resp.Header.Set(constants.HeaderCacheControl, "public, max-age=60")
	require.NoError(t, forceNoStoreCacheHeaders(resp))
	assertNoStoreCache(t, resp.Header)
}
