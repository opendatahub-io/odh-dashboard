package helper

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strings"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
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
}

func isSensitiveHeader(h string) bool {
	return slices.Contains(sensitiveHeaders, http.CanonicalHeaderKey(h))
}

type HeaderLogValuer struct {
	Header http.Header
}

func (h HeaderLogValuer) LogValue() slog.Value {
	var values []slog.Attr

	for k, v := range h.Header {
		if len(v) == 0 {
			values = append(values, slog.String(k, ""))
			continue
		}

		if isSensitiveHeader(k) {
			values = append(values, slog.String(k, "[REDACTED]"))
			continue
		}

		values = append(values, slog.String(k, v[0]))
	}

	return slog.GroupValue(values...)
}

// RequestLogValuer provides request metadata without logging request contents.
type RequestLogValuer struct {
	Request *http.Request
}

func (r RequestLogValuer) LogValue() slog.Value {
	if r.Request == nil {
		return slog.GroupValue()
	}

	requestID, _ := r.Request.Context().Value(constants.TraceIdKey).(string)
	return slog.GroupValue(
		slog.String("method", r.Request.Method),
		slog.String("path", r.Request.URL.Path),
		slog.Int64("content_length", r.Request.ContentLength),
		slog.String("request_id", requestID))
}

type ResponseLogValuer struct {
	Response *http.Response
	Body     []byte
}

func (r ResponseLogValuer) LogValue() slog.Value {
	return slog.GroupValue(
		slog.Any("status_code", r.Response.StatusCode),
		slog.String("status", r.Response.Status),
		slog.Any("body", r.Body),
		slog.Any("headers", HeaderLogValuer{Header: r.Response.Header}))
}

var (
	// URL-shaped values are sanitized conservatively so ordinary error text is not
	// rewritten. The second pattern handles endpoint forms without a scheme, which
	// are used by some Milvus clients.
	schemedURLPattern   = regexp.MustCompile(`(?i)\b[a-z][a-z0-9+.-]*://[^\s"'<>]+`)
	unschemedURLPattern = regexp.MustCompile(`(?i)(?:[^\s"'<>/@]+@)?(?:\[[0-9a-f:.]+\]|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])):\d+(?:[/?#][^\s"'<>]*)?`)
)

// SafeErrorForLog removes URL credentials and endpoint details that may contain
// tokens from an error before it is written to logs. It preserves only the
// scheme, host, and port for URL-shaped values.
func SafeErrorForLog(err error) string {
	if err == nil {
		return ""
	}

	safe := schemedURLPattern.ReplaceAllStringFunc(err.Error(), sanitizeURLMatch)
	return unschemedURLPattern.ReplaceAllStringFunc(safe, sanitizeURLMatch)
}

// SafeURLForLog preserves only the scheme, host, and port of a URL.
func SafeURLForLog(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme == "" || parsed.Hostname() == "" {
		return "<invalid URL>"
	}
	return parsed.Scheme + "://" + parsed.Host
}

func sanitizeURLMatch(match string) string {
	trailing := strings.TrimRight(match, ".,;:!?)]}")
	punctuation := match[len(trailing):]
	if trailing == "" {
		return match
	}

	parsed, err := url.Parse(trailing)
	if !strings.Contains(trailing, "://") {
		parsed, err = url.Parse("//" + trailing)
	}
	if err != nil || parsed.Hostname() == "" {
		return match
	}

	userinfo := ""
	if parsed.User != nil {
		userinfo = "<redacted>@"
	}
	if parsed.Scheme != "" {
		return parsed.Scheme + "://" + userinfo + parsed.Host + punctuation
	}
	return userinfo + parsed.Host + punctuation
}
