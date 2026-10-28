package api

import (
	"bufio"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"net/url"
	"strings"
	"testing"
	"time"

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

// A module document reached through the host proxy keeps the policy.
// httputil.ReverseProxy copies the upstream Content-Type before writing the status
// line, so the wrapper still classifies the reply as an HTML document.
func TestSetSecurityHeaders_ProxiedHTMLGetsCSP(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set(constants.HeaderContentType, "text/html; charset=utf-8")
		_, _ = io.WriteString(w, "<html></html>")
	}))
	defer upstream.Close()

	target, err := url.Parse(upstream.URL)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	app := newTestApp()
	app.SetSecurityHeaders(httputil.NewSingleHostReverseProxy(target)).
		ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/gen-ai/", nil))

	assertContentSecurityPolicy(t, rr.Header())
}

// The proxy must not turn JSON into a document: no policy on proxied API replies.
func TestSetSecurityHeaders_ProxiedJSONHasNoCSP(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
		_, _ = io.WriteString(w, `{}`)
	}))
	defer upstream.Close()

	target, err := url.Parse(upstream.URL)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	app := newTestApp()
	app.SetSecurityHeaders(httputil.NewSingleHostReverseProxy(target)).
		ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/gen-ai/api/v1/models", nil))

	assert.Empty(t, rr.Header().Get(constants.HeaderContentSecurityPolicy))
}

func TestSetSecurityHeaders_HTMLGetsCSP(t *testing.T) {
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(constants.HeaderContentType, "text/html; charset=utf-8")
		_, _ = io.WriteString(w, "<html></html>")
	})

	rr := httptest.NewRecorder()
	app.SetSecurityHeaders(inner).ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/projects", nil))

	assertContentSecurityPolicy(t, rr.Header())
	assertConsoleSecurityHeaders(t, rr.Header())
}

func TestSetSecurityHeaders_NonDocumentsOmitCSP(t *testing.T) {
	app := newTestApp()

	tests := []struct {
		name        string
		contentType string
		path        string
	}{
		{"JSON API", constants.ContentTypeJSON, "/api/v1/healthcheck"},
		{"JavaScript asset", "application/javascript", "/app.abcdef0123456789.js"},
		{"CSS asset", "text/css", "/app.abcdef0123456789.css"},
		{"image asset", "image/png", "/logo.png"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set(constants.HeaderContentType, tt.contentType)
				w.WriteHeader(http.StatusOK)
			})

			rr := httptest.NewRecorder()
			app.SetSecurityHeaders(inner).ServeHTTP(rr, httptest.NewRequest(http.MethodGet, tt.path, nil))

			assertNoContentSecurityPolicy(t, rr.Header())
			assertConsoleSecurityHeaders(t, rr.Header())
		})
	}
}

func TestIsHTMLResponse(t *testing.T) {
	tests := []struct {
		contentType string
		want        bool
	}{
		{"text/html", true},
		{"text/html; charset=utf-8", true},
		{"TEXT/HTML", true},
		{"", false},
		{"text/plain", false},
		{"application/json; charset=utf-8", false},
		{"application/javascript", false},
		{"text/htmlx", false},
	}
	for _, tt := range tests {
		t.Run(tt.contentType, func(t *testing.T) {
			assert.Equal(t, tt.want, isHTMLResponse(tt.contentType))
		})
	}
}

func TestContentSecurityPolicy(t *testing.T) {
	directives := map[string][]string{}
	for _, part := range strings.Split(constants.ContentSecurityPolicy, "; ") {
		fields := strings.Fields(part)
		require.NotEmpty(t, fields, "empty directive in %q", part)
		directives[fields[0]] = fields[1:]
	}

	assert.Equal(t, []string{"'self'"}, directives["default-src"])
	assert.Equal(t, []string{"'self'"}, directives["base-uri"])
	assert.Equal(t, []string{"'self'"}, directives["object-src"])
	assert.Equal(t, []string{"'none'"}, directives["frame-ancestors"])
	assert.Contains(t, directives["style-src"], "'unsafe-inline'")
	assert.Contains(t, directives["frame-src"], "https:")
	for _, directive := range []string{"img-src", "media-src"} {
		assert.Contains(t, directives[directive], "blob:")
		assert.Contains(t, directives[directive], "data:")
	}

	// The Segment origin belongs to the directives that load and call it, and nowhere else.
	assert.Contains(t, directives["script-src"], constants.SegmentTelemetryOrigin)
	assert.Contains(t, directives["connect-src"], constants.SegmentTelemetryOrigin)
	for directive, values := range directives {
		if directive == "script-src" || directive == "connect-src" {
			continue
		}
		assert.NotContains(t, values, constants.SegmentTelemetryOrigin, directive)
	}

	for directive, values := range directives {
		for _, value := range values {
			assert.NotEqual(t, "http:", value, directive)
			assert.False(t, strings.HasPrefix(value, "http://"), "%s allows %s", directive, value)
		}
	}
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

func TestSetSecurityHeaders_UnwrittenResponseFinalized(t *testing.T) {
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Return without Write/WriteHeader/Flush.
	})

	rr := httptest.NewRecorder()
	app.SetSecurityHeaders(inner).ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/healthcheck", nil))

	assert.Equal(t, http.StatusOK, rr.Code)
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

// statusCaptureWriter records every WriteHeader call so informational + final statuses can be asserted.
type statusCaptureWriter struct {
	header http.Header
	codes  []int
	body   []byte
}

func (w *statusCaptureWriter) Header() http.Header {
	if w.header == nil {
		w.header = make(http.Header)
	}
	return w.header
}

func (w *statusCaptureWriter) WriteHeader(statusCode int) {
	w.codes = append(w.codes, statusCode)
}

func (w *statusCaptureWriter) Write(b []byte) (int, error) {
	if len(w.codes) == 0 {
		w.WriteHeader(http.StatusOK)
	}
	w.body = append(w.body, b...)
	return len(b), nil
}

func TestSecurityHeadersWriter_InformationalThenFinalStatus(t *testing.T) {
	rec := &statusCaptureWriter{}
	req := httptest.NewRequest(http.MethodGet, "/vendor.js", nil)
	w := &securityHeadersWriter{ResponseWriter: rec, req: req}

	w.WriteHeader(http.StatusEarlyHints)
	w.WriteHeader(http.StatusNotFound)
	_, err := w.Write([]byte("missing"))
	require.NoError(t, err)

	require.Equal(t, []int{http.StatusEarlyHints, http.StatusNotFound}, rec.codes)
	assert.Equal(t, "missing", string(rec.body))
	assertConsoleSecurityHeaders(t, rec.header)
}

func TestSetSecurityHeaders_InformationalThenFinalViaHTTPServer(t *testing.T) {
	app := newTestApp()
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Link", "</app.js>; rel=preload; as=script")
		w.WriteHeader(http.StatusEarlyHints)
		w.Header().Set(constants.HeaderContentType, "text/plain")
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = io.WriteString(w, "upstream unavailable")
	})

	server := httptest.NewServer(app.SetSecurityHeaders(inner))
	t.Cleanup(server.Close)

	resp, err := http.Get(server.URL + "/_mf/genAi/app.abcdef123456.js")
	require.NoError(t, err)
	t.Cleanup(func() { _ = resp.Body.Close() })

	assert.Equal(t, http.StatusServiceUnavailable, resp.StatusCode)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.Equal(t, "upstream unavailable", string(body))
	assertConsoleSecurityHeaders(t, resp.Header)
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

// deadlineWriter records ResponseController deadline calls that only reach the
// underlying writer when the security-headers wrapper implements Unwrap.
type deadlineWriter struct {
	http.ResponseWriter
	writeDeadline time.Time
	readDeadline  time.Time
	fullDuplex    bool
}

func (d *deadlineWriter) SetWriteDeadline(deadline time.Time) error {
	d.writeDeadline = deadline
	return nil
}

func (d *deadlineWriter) SetReadDeadline(deadline time.Time) error {
	d.readDeadline = deadline
	return nil
}

func (d *deadlineWriter) EnableFullDuplex() error {
	d.fullDuplex = true
	return nil
}

func TestSetSecurityHeaders_ResponseControllerDeadlines(t *testing.T) {
	app := newTestApp()
	deadline := time.Now().Add(time.Hour).UTC()
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rc := http.NewResponseController(w)
		require.NoError(t, rc.SetWriteDeadline(deadline))
		require.NoError(t, rc.SetReadDeadline(deadline))
		require.NoError(t, rc.EnableFullDuplex())
		w.WriteHeader(http.StatusOK)
	})

	base := httptest.NewRecorder()
	wrapped := &deadlineWriter{ResponseWriter: base}
	app.SetSecurityHeaders(inner).ServeHTTP(wrapped, httptest.NewRequest(http.MethodGet, "/api/v1/stream", nil))

	assert.True(t, deadline.Equal(wrapped.writeDeadline))
	assert.True(t, deadline.Equal(wrapped.readDeadline))
	assert.True(t, wrapped.fullDuplex)
	assertConsoleSecurityHeaders(t, base.Header())
	assertNoStoreCache(t, base.Header())
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
	// Hijacked responses must not be finalized with WriteHeader.
	assert.Empty(t, base.Header().Get(constants.HeaderXContentTypeOptions))
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
