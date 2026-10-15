package api

import (
	"bufio"
	"fmt"
	"net"
	"net/http"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
)

// SetSecurityHeaders applies Console-equivalent browser security headers on normal HTTP replies.
// Common security headers are set on every response (including static `/` and `/_mf/`).
// no-store is applied on API paths (`/api`, `/wss`, module APIs). Federated module proxy
// replies also force no-store via ModifyResponse (see forceNoStoreCacheHeaders).
func (app *App) SetSecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(&securityHeadersWriter{ResponseWriter: w, req: r}, r)
	})
}

type securityHeadersWriter struct {
	http.ResponseWriter
	req         *http.Request
	wroteHeader bool
}

func (w *securityHeadersWriter) WriteHeader(statusCode int) {
	if w.wroteHeader {
		return
	}
	applySecurityHeaders(w.Header(), w.req.URL.Path)
	// Informational 1xx responses are not final; HTTP allows a later final status.
	// Do not mark the writer committed so the real status (e.g. 404 after 103) can still be written.
	if statusCode >= 100 && statusCode < 200 {
		w.ResponseWriter.WriteHeader(statusCode)
		return
	}
	w.wroteHeader = true
	w.ResponseWriter.WriteHeader(statusCode)
}

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

func (w *securityHeadersWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := w.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, fmt.Errorf("response writer does not support hijacking")
	}
	return h.Hijack()
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

// isApiPath matches Node backend securityHeaders.isApiPath (after PathPrefix strip).
// Module proxy paths that are not /…/api (e.g. /agent-ops/healthcheck) get no-store via
// forceNoStoreCacheHeaders on the reverse proxy instead.
func isApiPath(urlPath string) bool {
	path := strings.TrimPrefix(urlPath, PathPrefix)
	if path == APIPathPrefix || strings.HasPrefix(path, APIPathPrefix+"/") {
		return true
	}
	wssPrefix := strings.TrimSuffix(proxy.WssProxyPrefix, "/")
	if path == wssPrefix || strings.HasPrefix(path, wssPrefix+"/") || path == "/wss" || strings.HasPrefix(path, "/wss/") {
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

// forceNoStoreCacheHeaders forces no-store on proxied module API replies (Node rewriteNoStoreCacheHeaders parity).
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
