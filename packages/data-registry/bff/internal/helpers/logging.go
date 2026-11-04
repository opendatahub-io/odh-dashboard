package helper

import (
	"context"
	"log/slog"
	"net/http"
	"slices"
	"strings"

	"github.com/opendatahub-io/data-registry/bff/internal/constants"
)

func GetContextLoggerFromReq(r *http.Request) *slog.Logger {
	return GetContextLogger(r.Context())
}

func GetContextLogger(ctx context.Context) *slog.Logger {
	logger, ok := ctx.Value(constants.TraceLoggerKey).(*slog.Logger)

	if !ok {
		logger = slog.New(slog.Default().Handler())
		logger.Warn("Unable to get context logger for tracing, falling back to default")
	}

	return logger
}

var sensitiveHeaders = []string{
	"Authorization",
	"Cookie",
	"Set-Cookie",
	"Proxy-Authorization",
	// Kubernetes WebSocket authentication may carry a base64url-encoded bearer token here.
	// This uses Go's canonical header spelling for Sec-WebSocket-Protocol.
	"Sec-Websocket-Protocol",
}

var sensitiveHeaderMarkers = []string{
	"auth",
	"token",
	"cookie",
	"secret",
	"credential",
	"password",
	"api-key",
	"apikey",
}

func isSensitiveHeader(h string, additionalSensitiveHeaders ...string) bool {
	header := http.CanonicalHeaderKey(h)
	if slices.Contains(sensitiveHeaders, header) {
		return true
	}

	for _, sensitiveHeader := range additionalSensitiveHeaders {
		if header == http.CanonicalHeaderKey(sensitiveHeader) {
			return true
		}
	}

	// Auth token headers can be configured, so redact credential-like names as well as
	// the standard headers listed above.
	for _, marker := range sensitiveHeaderMarkers {
		if strings.Contains(strings.ToLower(header), marker) {
			return true
		}
	}

	return false
}

type HeaderLogValuer struct {
	Header           http.Header
	SensitiveHeaders []string
}

func (h HeaderLogValuer) LogValue() slog.Value {
	var values []slog.Attr

	for k, v := range h.Header {
		if len(v) == 0 {
			values = append(values, slog.String(k, ""))
			continue
		}

		if isSensitiveHeader(k, h.SensitiveHeaders...) {
			values = append(values, slog.String(k, "[REDACTED]"))
			continue
		}

		values = append(values, slog.String(k, v[0]))
	}

	return slog.GroupValue(values...)
}

type RequestLogValuer struct {
	Request          *http.Request
	SensitiveHeaders []string
}

func (r RequestLogValuer) LogValue() slog.Value {
	requestURL := ""
	if r.Request.URL != nil {
		safeURL := *r.Request.URL
		safeURL.User = nil
		safeURL.RawQuery = ""
		safeURL.ForceQuery = false
		safeURL.Fragment = ""
		safeURL.RawFragment = ""
		requestURL = safeURL.String()
	}

	return slog.GroupValue(
		slog.String("method", r.Request.Method),
		slog.String("url", requestURL),
		slog.Any("headers", HeaderLogValuer{Header: r.Request.Header, SensitiveHeaders: r.SensitiveHeaders}))
}

type ResponseLogValuer struct {
	Response *http.Response
}

func (r ResponseLogValuer) LogValue() slog.Value {
	return slog.GroupValue(
		slog.Any("status_code", r.Response.StatusCode),
		slog.String("status", r.Response.Status),
		slog.Any("headers", HeaderLogValuer{Header: r.Response.Header}))
}
