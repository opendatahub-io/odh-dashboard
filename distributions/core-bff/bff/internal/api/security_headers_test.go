package api

import (
	"bufio"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
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

	assertBrowserSecurityHeaders(t, rr.Header())
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
	assertBrowserSecurityHeaders(t, rr.Header())
}

// An upstream document reached through a module proxy keeps its own headers. Applying the
// dashboard policy here would impose `frame-ancestors 'none'` and `script-src 'self'` on a
// UI we do not own (for example the MLflow document behind /mlflow).
func TestSetSecurityHeaders_ProxiedHTMLHasNoCSP(t *testing.T) {
	t.Setenv(constants.CSPModeEnvVar, "enforce")

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

	assertNoContentSecurityPolicy(t, rr.Header())
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

	assertNoContentSecurityPolicy(t, rr.Header())
}

func TestWithDocumentCSP_HTMLGetsCSP(t *testing.T) {
	t.Setenv(constants.CSPModeEnvVar, "enforce")
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(constants.HeaderContentType, "text/html; charset=utf-8")
		_, _ = io.WriteString(w, "<html></html>")
	})

	rr := httptest.NewRecorder()
	app.SetSecurityHeaders(withDocumentCSP(inner)).
		ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/projects", nil))

	assertContentSecurityPolicy(t, rr.Header())
	assertBrowserSecurityHeaders(t, rr.Header())
}

func TestWithDocumentCSP_NonDocumentsOmitCSP(t *testing.T) {
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
			app.SetSecurityHeaders(withDocumentCSP(inner)).
				ServeHTTP(rr, httptest.NewRequest(http.MethodGet, tt.path, nil))

			assertNoContentSecurityPolicy(t, rr.Header())
			assertBrowserSecurityHeaders(t, rr.Header())
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
	assert.Equal(t, []string{"'none'"}, directives["object-src"])
	assert.Equal(t, []string{"'self'"}, directives["form-action"])
	assert.Contains(t, directives["worker-src"], "'self'")
	assert.Contains(t, directives["worker-src"], "blob:")
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

// The Swagger UI page is dev-only tooling, not the SPA shell: it is served by its own route
// and never passes through the document CSP middleware, so its own scripts keep working.
func TestSwaggerUIDocumentHasNoCSP(t *testing.T) {
	t.Setenv(constants.CSPModeEnvVar, "enforce")
	app := newTestApp(func(a *App) {
		a.config.DevMode = true
		a.config.StaticAssetsDir = t.TempDir()
	})

	ts := httptest.NewServer(app.Routes())
	defer ts.Close()

	resp, err := http.Get(ts.URL + SwaggerUIPath)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	assertNoContentSecurityPolicy(t, resp.Header)
	assertBrowserSecurityHeaders(t, resp.Header)
}

// End to end through the real mux: the shell documents served by the static handler carry
// the policy — `/`, a direct index.html request, and the deep-link fallback — and nothing
// else does.
func TestStaticHandler_ShellDocumentsGetCSP(t *testing.T) {
	t.Setenv(constants.CSPModeEnvVar, "enforce")

	tmpDir := t.TempDir()
	require.NoError(t, os.WriteFile(
		filepath.Join(tmpDir, "index.html"),
		[]byte(`<html><body><div id="root"></div></body></html>`),
		0600,
	))
	require.NoError(t, os.WriteFile(filepath.Join(tmpDir, "app.abc123.js"), []byte("console.log(1)"), 0600))

	app := newTestApp(func(a *App) { a.config.StaticAssetsDir = tmpDir })
	ts := httptest.NewServer(app.Routes())
	defer ts.Close()

	// http.FileServer redirects /index.html to the directory, so assert the direct response
	// and the destination separately instead of letting http.Get hide the redirect.
	noRedirectClient := &http.Client{
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}
	t.Run("document /index.html direct response", func(t *testing.T) {
		resp, err := noRedirectClient.Get(ts.URL + "/index.html")
		require.NoError(t, err)
		defer resp.Body.Close()

		require.Equal(t, http.StatusMovedPermanently, resp.StatusCode)
		assert.Equal(t, "./", resp.Header.Get("Location"))
		assertNoContentSecurityPolicy(t, resp.Header)
	})

	for _, path := range []string{"/", "/projects", "/gen-ai/models", "/index.html"} {
		t.Run("document "+path, func(t *testing.T) {
			resp, err := http.Get(ts.URL + path)
			require.NoError(t, err)
			defer resp.Body.Close()

			require.Equal(t, http.StatusOK, resp.StatusCode)
			assertContentSecurityPolicy(t, resp.Header)
			assertBrowserSecurityHeaders(t, resp.Header)
		})
	}

	t.Run("static asset", func(t *testing.T) {
		resp, err := http.Get(ts.URL + "/app.abc123.js")
		require.NoError(t, err)
		defer resp.Body.Close()

		require.Equal(t, http.StatusOK, resp.StatusCode)
		assertNoContentSecurityPolicy(t, resp.Header)
	})
}

// A handler that writes a body without an explicit WriteHeader still gets the policy: the
// promoted write path must dispatch through documentCSPWriter's own WriteHeader.
func TestWithDocumentCSP_WriteWithoutWriteHeaderSetsCSP(t *testing.T) {
	t.Setenv(constants.CSPModeEnvVar, "enforce")
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(constants.HeaderContentType, "text/html; charset=utf-8")
		_, _ = io.WriteString(w, "<html></html>")
	})

	rr := httptest.NewRecorder()
	app.SetSecurityHeaders(withDocumentCSP(inner)).
		ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/", nil))

	assertContentSecurityPolicy(t, rr.Header())
}

func TestWithDocumentCSP_ReportOnlyMode(t *testing.T) {
	t.Setenv(constants.CSPModeEnvVar, "report-only")
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(constants.HeaderContentType, "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
	})

	rr := httptest.NewRecorder()
	app.SetSecurityHeaders(withDocumentCSP(inner)).
		ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/projects", nil))

	assertReportOnlyContentSecurityPolicy(t, rr.Header())
	assertBrowserSecurityHeaders(t, rr.Header())
}

// TEMPORARY: unset or empty CSP_MODE now defaults to Report-Only
// so a deployment reports violations instead of blocking them.
func TestWithDocumentCSP_DefaultModeIsReportOnly(t *testing.T) {
	for _, value := range []string{"", "report-only", "REPORT-ONLY"} {
		t.Run("mode="+value, func(t *testing.T) {
			t.Setenv(constants.CSPModeEnvVar, value)
			app := newTestApp()

			inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set(constants.HeaderContentType, "text/html; charset=utf-8")
				w.WriteHeader(http.StatusOK)
			})

			rr := httptest.NewRecorder()
			app.SetSecurityHeaders(withDocumentCSP(inner)).
				ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/projects", nil))

			assertReportOnlyContentSecurityPolicy(t, rr.Header())
		})
	}
}

func TestWithDocumentCSP_UnknownModeFailsClosedToEnforce(t *testing.T) {
	for _, value := range []string{"enforce", "ENFORCE", "off", "nonsense"} {
		t.Run("mode="+value, func(t *testing.T) {
			t.Setenv(constants.CSPModeEnvVar, value)
			app := newTestApp()

			inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set(constants.HeaderContentType, "text/html; charset=utf-8")
				w.WriteHeader(http.StatusOK)
			})

			rr := httptest.NewRecorder()
			app.SetSecurityHeaders(withDocumentCSP(inner)).
				ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/projects", nil))

			assertContentSecurityPolicy(t, rr.Header())
			assert.Empty(t, rr.Header().Get(constants.HeaderCSPReportOnly))
		})
	}
}

func TestCSPModeUnset(t *testing.T) {
	for _, value := range []string{"", "   "} {
		t.Run("mode="+value, func(t *testing.T) {
			t.Setenv(constants.CSPModeEnvVar, value)
			assert.True(t, CSPModeUnset())
			assert.Equal(t, constants.HeaderCSPReportOnly, cspHeaderName())
		})
	}

	for _, value := range []string{"report-only", "enforce", "off"} {
		t.Run("mode="+value, func(t *testing.T) {
			t.Setenv(constants.CSPModeEnvVar, value)
			assert.False(t, CSPModeUnset())
		})
	}
}

// Both modes send the same directive string; only the header name changes.
func TestCSPModesShareTheDirectiveString(t *testing.T) {
	t.Setenv(constants.CSPModeEnvVar, "enforce")
	app := newTestApp()
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(constants.HeaderContentType, "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
	})

	enforced := httptest.NewRecorder()
	app.SetSecurityHeaders(withDocumentCSP(inner)).
		ServeHTTP(enforced, httptest.NewRequest(http.MethodGet, "/", nil))

	t.Setenv(constants.CSPModeEnvVar, "report-only")
	reportOnly := httptest.NewRecorder()
	app.SetSecurityHeaders(withDocumentCSP(inner)).
		ServeHTTP(reportOnly, httptest.NewRequest(http.MethodGet, "/", nil))

	assert.Equal(t,
		enforced.Header().Get(constants.HeaderContentSecurityPolicy),
		reportOnly.Header().Get(constants.HeaderCSPReportOnly),
	)
}

func TestWithDocumentCSP_ReportOnlySkipsNonDocuments(t *testing.T) {
	t.Setenv(constants.CSPModeEnvVar, "report-only")
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
		w.WriteHeader(http.StatusOK)
	})

	rr := httptest.NewRecorder()
	app.SetSecurityHeaders(withDocumentCSP(inner)).
		ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/healthcheck", nil))

	assertNoContentSecurityPolicy(t, rr.Header())
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

	assertBrowserSecurityHeaders(t, rr.Header())
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
	assertBrowserSecurityHeaders(t, rr.Header())
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
	assertBrowserSecurityHeaders(t, rr.Header())
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
	w := &securityHeadersWriter{writeOnce: writeOnce{ResponseWriter: rec}, req: req}

	w.WriteHeader(http.StatusEarlyHints)
	w.WriteHeader(http.StatusNotFound)
	_, err := w.Write([]byte("missing"))
	require.NoError(t, err)

	require.Equal(t, []int{http.StatusEarlyHints, http.StatusNotFound}, rec.codes)
	assert.Equal(t, "missing", string(rec.body))
	assertBrowserSecurityHeaders(t, rec.header)
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
	assertBrowserSecurityHeaders(t, resp.Header)
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
	assertBrowserSecurityHeaders(t, base.Header())
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

func TestRoutesPanicRetainsSecurityHeaders(t *testing.T) {
	for _, tc := range []struct {
		name      string
		committed bool
	}{{name: "before commitment"}, {name: "after commitment", committed: true}} {
		t.Run(tc.name, func(t *testing.T) {
			for _, path := range []string{
				"/api/k8s/api/v1/pods", "/core-bff/api/k8s/api/v1/pods",
				"/wss/k8s/api/v1/pods", "/core-bff/wss/k8s/api/v1/pods",
			} {
				t.Run(path, func(t *testing.T) {
					app := newTestApp(func(a *App) { a.config.AuthMethod = config.AuthMethodDisabled })
					panicHandler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
						if tc.committed {
							_, _ = w.Write([]byte("partial"))
						}
						panic("CANARY_PANIC")
					})
					app.k8sProxy, app.wsProxy = panicHandler, panicHandler
					handler := app.Routes()
					response := httptest.NewRecorder()
					request := httptest.NewRequest(http.MethodGet, path, nil)
					if tc.committed {
						require.PanicsWithValue(t, http.ErrAbortHandler, func() { handler.ServeHTTP(response, request) })
						require.Equal(t, http.StatusOK, response.Code)
						require.Equal(t, "partial", response.Body.String())
					} else {
						handler.ServeHTTP(response, request)
						require.Equal(t, http.StatusInternalServerError, response.Code)
						require.NotContains(t, response.Body.String(), "CANARY")
					}
					result := response.Result()
					defer result.Body.Close()
					assertBrowserSecurityHeaders(t, result.Header)
					assertNoStoreCache(t, result.Header)
					require.NotEmpty(t, result.Header.Get(httpcontract.RequestIDHeader))
				})
			}
		})
	}
}
