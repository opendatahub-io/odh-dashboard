package httpcontract

import (
	"bufio"
	"context"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"sync"

	"github.com/google/uuid"
)

const RequestIDHeader = "X-Request-ID"
const AuditIDHeader = "Audit-ID"

type stateKey struct{}
type state struct {
	id    string
	mu    sync.Mutex
	audit string
}

func RequestID(ctx context.Context) string {
	if s, ok := ctx.Value(stateKey{}).(*state); ok {
		return s.id
	}
	return ""
}
func AuditID(ctx context.Context) string {
	if s, ok := ctx.Value(stateKey{}).(*state); ok {
		s.mu.Lock()
		defer s.mu.Unlock()
		return s.audit
	}
	return ""
}
func CaptureAudit(ctx context.Context, h http.Header) {
	values := h.Values(AuditIDHeader)
	if len(values) != 1 || len(values[0]) != 36 {
		h.Del(AuditIDHeader)
		return
	}
	u, err := uuid.Parse(values[0])
	if err != nil || u.String() != values[0] {
		h.Del(AuditIDHeader)
		return
	}
	if s, ok := ctx.Value(stateKey{}).(*state); ok {
		s.mu.Lock()
		s.audit = u.String()
		s.mu.Unlock()
	}
}
func EnsureID(w http.ResponseWriter, r *http.Request) string {
	id := RequestID(r.Context())
	if id == "" {
		id = uuid.NewString()
		*r = *r.WithContext(context.WithValue(r.Context(), stateKey{}, &state{id: id}))
	}
	w.Header().Set(RequestIDHeader, id)
	return id
}
func Log(logger *slog.Logger, r *http.Request) *slog.Logger { return LogContext(logger, r.Context()) }
func LogContext(logger *slog.Logger, ctx context.Context) *slog.Logger {
	if logger == nil {
		logger = slog.Default()
	}
	return logger.With("request_id", RequestID(ctx), "trace_id", RequestID(ctx), "upstream_audit_id", AuditID(ctx))
}

// Middleware installs correlation before authentication/recovery and tracks response commitment.
func Middleware(next http.Handler, loggers ...*slog.Logger) http.Handler {
	logger := slog.Default()
	if len(loggers) > 0 && loggers[0] != nil {
		logger = loggers[0]
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if RequestID(r.Context()) != "" {
			next.ServeHTTP(w, r)
			return
		}
		ctx := context.WithValue(r.Context(), stateKey{}, &state{id: uuid.NewString()})
		r = r.Clone(ctx)
		r.Header.Del(RequestIDHeader)
		r.Header.Del(AuditIDHeader)
		w.Header().Set(RequestIDHeader, RequestID(ctx))
		next.ServeHTTP(&responseWriter{ResponseWriter: w, ctx: ctx, logger: logger}, r)
	})
}

type responseWriter struct {
	http.ResponseWriter
	ctx       context.Context
	committed bool
	logger    *slog.Logger
}

func (w *responseWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }
func (w *responseWriter) WriteHeader(code int) {
	if w.committed {
		return
	}
	if code >= 200 || code == 101 {
		w.committed = true
	}
	w.Header().Set(RequestIDHeader, RequestID(w.ctx))
	if audit := AuditID(w.ctx); audit != "" {
		w.Header().Set(AuditIDHeader, audit)
	}
	w.ResponseWriter.WriteHeader(code)
}
func (w *responseWriter) Write(b []byte) (int, error) {
	if !w.committed {
		w.WriteHeader(200)
	}
	n, err := w.ResponseWriter.Write(b)
	if err != nil {
		logStreamError(w.logger, w.ctx, "response interrupted", err)
	}
	return n, err
}
func (w *responseWriter) Flush() { _ = w.FlushError() }
func (w *responseWriter) FlushError() error {
	if !w.committed {
		w.WriteHeader(200)
	}
	return http.NewResponseController(w.ResponseWriter).Flush()
}
func (w *responseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	c, b, e := http.NewResponseController(w.ResponseWriter).Hijack()
	if e == nil {
		w.committed = true
	}
	return c, b, e
}
func Committed(w http.ResponseWriter) bool {
	if x, ok := w.(*responseWriter); ok {
		return x.committed
	}
	if x, ok := w.(interface{ Unwrap() http.ResponseWriter }); ok {
		return Committed(x.Unwrap())
	}
	return false
}

type Transport struct {
	Base   http.RoundTripper
	Logger *slog.Logger
}

func (t Transport) RoundTrip(r *http.Request) (*http.Response, error) {
	out := r.Clone(r.Context())
	out.Header.Del(AuditIDHeader)
	if id := RequestID(r.Context()); id != "" {
		out.Header.Set(RequestIDHeader, id)
	} else {
		out.Header.Del(RequestIDHeader)
	}
	base := t.Base
	if base == nil {
		base = http.DefaultTransport
	}
	resp, err := base.RoundTrip(out)
	if resp != nil {
		CaptureAudit(r.Context(), resp.Header)
		if resp.Body != nil {
			resp.Body = &observedBody{ReadCloser: resp.Body, ctx: r.Context(), logger: t.Logger}
		}
	}
	return resp, err
}
func WrapTransport(base http.RoundTripper) http.RoundTripper { return Transport{Base: base} }

type observedBody struct {
	io.ReadCloser
	ctx    context.Context
	logger *slog.Logger
}

func (b *observedBody) Read(p []byte) (int, error) {
	n, err := b.ReadCloser.Read(p)
	if err != nil && !errors.Is(err, io.EOF) {
		logStreamError(b.logger, b.ctx, "upstream stream interrupted", err)
	}
	return n, err
}

func logStreamError(logger *slog.Logger, ctx context.Context, message string, err error) {
	level := slog.LevelError
	code := Classify(err, 502).Error.Code
	if errors.Is(err, context.Canceled) || errors.Is(ctx.Err(), context.Canceled) {
		level, code = slog.LevelDebug, "CANCELED"
	}
	LogContext(logger, ctx).Log(ctx, level, message, "code", code)
}
