package api

import (
	"bufio"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
)

// SetSecurityHeaders applies the browser security headers that belong on every response.
// The CSP is not one of them: only the documents this server produces itself get it, from
// withDocumentCSP. Cache-Control is selective (no-store on API paths). Module proxy replies
// force no-store in ModifyResponse (see forceNoStoreCacheHeaders).
func (app *App) SetSecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sw := &securityHeadersWriter{
			writeOnce: writeOnce{ResponseWriter: w},
			req:       r,
		}
		next.ServeHTTP(sw, r)
		// Handlers that return without writing leave headers unset; finalize so
		// security headers and /api no-store still apply. Skip after Hijack.
		if !sw.wroteHeader && !sw.hijacked {
			sw.WriteHeader(http.StatusOK)
		}
	})
}

// writeOnce owns the status-line bookkeeping shared by the response wrappers.
// Informational 1xx responses are not final, so they do not mark the writer committed and
// a later final status (for example 404 after 103) can still be written.
type writeOnce struct {
	http.ResponseWriter
	wroteHeader bool
}

func (w *writeOnce) WriteHeader(statusCode int) {
	if w.wroteHeader {
		return
	}
	if statusCode >= 100 && statusCode < 200 {
		w.ResponseWriter.WriteHeader(statusCode)
		return
	}
	w.wroteHeader = true
	w.ResponseWriter.WriteHeader(statusCode)
}

// Unwrap lets http.ResponseController reach the underlying writer.
func (w *writeOnce) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

type securityHeadersWriter struct {
	writeOnce
	req      *http.Request
	hijacked bool
}

func (w *securityHeadersWriter) WriteHeader(statusCode int) {
	if !w.wroteHeader {
		applySecurityHeaders(w.Header(), w.req.URL.Path)
	}
	w.writeOnce.WriteHeader(statusCode)
}

// Write must dispatch through this wrapper's WriteHeader, so it is not inherited.
func (w *securityHeadersWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(b)
}

func (w *securityHeadersWriter) Flush() {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Flush and Hijack are implemented directly on this wrapper; Unwrap is promoted from
// writeOnce so http.ResponseController can reach SetReadDeadline, SetWriteDeadline, and
// EnableFullDuplex.
func (w *securityHeadersWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := w.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, fmt.Errorf("response writer does not support hijacking")
	}
	conn, rw, err := h.Hijack()
	if err == nil {
		w.hijacked = true
	}
	return conn, rw, err
}

func applySecurityHeaders(h http.Header, urlPath string) {
	h.Set(constants.HeaderXContentTypeOptions, constants.XContentTypeOptionsNoSniff)
	h.Set(constants.HeaderCrossOriginOpenerPolicy, constants.CrossOriginOpenerPolicySameOrigin)
	h.Set(constants.HeaderXFrameOptions, constants.XFrameOptionsDeny)
	h.Set(constants.HeaderXDNSPrefetchControl, constants.XDNSPrefetchControlOff)
	h.Set(constants.HeaderReferrerPolicy, constants.ReferrerPolicyStrictOriginWhenCrossOrigin)
	if !isApiPath(urlPath) {
		return
	}

	h.Set(constants.HeaderCacheControl, constants.CacheControlNoStore)
}

// withDocumentCSP applies the CSP to the HTML documents served by next.
//
// It is mounted only on the SPA static handler, which is where this server produces its own
// documents: index.html for `/`, for a direct index.html request, and as the fallback that
// renders deep links. Other handlers can also return HTML, but those documents are not this
// application's shell and own their own headers — module proxy replies belong to an upstream
// UI (for example the MLflow document), and the Swagger UI page is dev-only tooling.
// Attaching the dashboard policy to them would impose `frame-ancestors 'none'` and
// `script-src 'self'` on a document this project does not control.
//
// The content type is only known once the handler writes the status line, hence the wrapper.
func withDocumentCSP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		docWriter := &documentCSPWriter{writeOnce{ResponseWriter: w}}
		next.ServeHTTP(docWriter, r)
		if !docWriter.wroteHeader {
			docWriter.WriteHeader(http.StatusOK)
		}
	})
}

// documentCSPWriter adds the CSP when the handler is about to write a document.
type documentCSPWriter struct {
	writeOnce
}

func (w *documentCSPWriter) WriteHeader(statusCode int) {
	if !w.wroteHeader && isHTMLResponse(w.Header().Get(constants.HeaderContentType)) {
		w.Header().Set(cspHeaderName(), constants.ContentSecurityPolicy)
	}
	w.writeOnce.WriteHeader(statusCode)
}

// Write must dispatch through this wrapper's WriteHeader, so it is not inherited.
func (w *documentCSPWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(b)
}

// cspHeaderName resolves the CSP header name from CSP_MODE. "report-only" emits the
// Report-Only header; "enforce" and any unknown value emit the enforcing header so a
// typo fails closed. Both modes send the same directive string — only the name changes.
//
// TEMPORARY: unset or empty also emits the Report-Only header. Switch this branch to the
// enforcing header once deployments running Report-Only have been observed to report no
// unexpected violations.
func cspHeaderName() string {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(constants.CSPModeEnvVar))) {
	case "", "report-only":
		return constants.HeaderCSPReportOnly
	default:
		return constants.HeaderContentSecurityPolicy
	}
}

// CSPModeUnset reports whether CSP_MODE is unset or empty: the TEMPORARY case where the
// policy is served as Report-Only without an explicit operator choice. Callers warn at
// startup so the fallback is visible instead of silent.
func CSPModeUnset() bool {
	return strings.TrimSpace(os.Getenv(constants.CSPModeEnvVar)) == ""
}

// isHTMLResponse reports whether the handler set an HTML document content type.
// Only documents get a CSP; JSON APIs and static assets do not. Handlers set Content-Type
// before WriteHeader, so it is final by the time the CSP wrapper decides.
func isHTMLResponse(contentType string) bool {
	mediaType, _, _ := strings.Cut(contentType, ";")
	return strings.EqualFold(strings.TrimSpace(mediaType), constants.ContentTypeHTML)
}

// isApiPath reports host and module API paths after PathPrefix strip.
// Node only treats /api and /wss as API paths. Module proxy replies force no-store
// via forceNoStoreCacheHeaders.
func isApiPath(urlPath string) bool {
	path := strings.TrimPrefix(urlPath, PathPrefix)
	if path == APIPathPrefix || strings.HasPrefix(path, APIPathPrefix+"/") {
		return true
	}
	if path == "/wss" || strings.HasPrefix(path, "/wss/") {
		return true
	}
	trimmed := strings.Trim(path, "/")
	parts := strings.Split(trimmed, "/")
	// /_bff/{module}/api/...
	if len(parts) >= 3 && parts[0] == "_bff" && parts[2] == "api" {
		return true
	}
	// Federated module APIs: /gen-ai/api, /maas/api, ...
	return len(parts) >= 2 && parts[1] == "api"
}

// forceNoStoreCacheHeaders forces no-store on proxied module replies (Node rewriteNoStoreCacheHeaders parity).
func forceNoStoreCacheHeaders(resp *http.Response) error {
	resp.Header.Set(constants.HeaderCacheControl, constants.CacheControlNoStore)
	return nil
}

// chainModifyResponse runs ModifyResponse callbacks in order; the first error wins.
func chainModifyResponse(fns ...func(*http.Response) error) func(*http.Response) error {
	return func(resp *http.Response) error {
		for _, fn := range fns {
			if fn == nil {
				continue
			}
			if err := fn(resp); err != nil {
				return err
			}
		}
		return nil
	}
}
