package helper

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"slices"

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

const maxBodySize = 10 * 1024 * 1024 // 10 MB

func CloneBody(r *http.Request) ([]byte, error) {
	if r.Body == nil {
		return nil, fmt.Errorf("no body provided")
	}
	// Read one byte beyond the limit so we can distinguish "exactly at limit"
	// from "over limit" without consuming an unbounded stream.
	buf, err := io.ReadAll(io.LimitReader(r.Body, maxBodySize+1))
	if err != nil {
		// Restore whatever was read so downstream handlers are not left with a drained body.
		r.Body = io.NopCloser(bytes.NewBuffer(buf))
		return nil, fmt.Errorf("reading request body: %w", err)
	}
	if int64(len(buf)) > maxBodySize {
		// Restore the partially-read bytes before returning so downstream handlers
		// can still inspect the body (e.g., to emit a 413 response).
		r.Body = io.NopCloser(bytes.NewBuffer(buf))
		return nil, fmt.Errorf("request body too large: exceeds %d bytes", maxBodySize)
	}
	// Restore r.Body with the full, untruncated content for downstream handlers.
	r.Body = io.NopCloser(bytes.NewBuffer(buf))
	return buf, nil
}

type RequestLogValuer struct {
	Request *http.Request
}

func (r RequestLogValuer) LogValue() slog.Value {
	body := ""

	if r.Request.Body != nil {
		cloneBody, err := CloneBody(r.Request)
		if err != nil {
			body = fmt.Sprintf("error: %v", err)
		} else {
			body = string(cloneBody)
		}
	}

	return slog.GroupValue(
		slog.String("method", r.Request.Method),
		slog.String("url", r.Request.URL.String()),
		slog.String("body", body),
		slog.Any("headers", HeaderLogValuer{Header: r.Request.Header}))
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
