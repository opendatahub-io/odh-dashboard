package api

import (
	"context"
	"log/slog"
	"sync"

	"github.com/julienschmidt/httprouter"
	"net/http"
)

func dummyHandler(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}

func trackingHandle() (httprouter.Handle, *bool) {
	var called bool
	return func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		called = true
		w.WriteHeader(http.StatusOK)
	}, &called
}

func trackingHTTPHandler() (http.HandlerFunc, *bool) {
	var called bool
	return func(_ http.ResponseWriter, _ *http.Request) {
		called = true
	}, &called
}

// captureHandler is a slog.Handler that records log records for test assertions.
type captureHandler struct {
	mu      sync.Mutex
	records []slog.Record
	attrs   []slog.Attr
}

func (h *captureHandler) Enabled(_ context.Context, _ slog.Level) bool { return true }

func (h *captureHandler) Handle(_ context.Context, r slog.Record) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.records = append(h.records, r)
	return nil
}

func (h *captureHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &captureHandler{attrs: append(h.attrs, attrs...)}
}

func (h *captureHandler) WithGroup(_ string) slog.Handler { return h }

func (h *captureHandler) findAuditRecord() *slog.Record {
	h.mu.Lock()
	defer h.mu.Unlock()
	for i := range h.records {
		if h.records[i].Message == "audit" {
			rec := h.records[i]
			return &rec
		}
	}
	return nil
}

func auditAttr(r *slog.Record, key string) string {
	var val string
	r.Attrs(func(a slog.Attr) bool {
		if a.Key == key {
			val = a.Value.String()
			return false
		}
		return true
	})
	return val
}

func auditAttrBool(r *slog.Record, key string) bool {
	var val bool
	r.Attrs(func(a slog.Attr) bool {
		if a.Key == key {
			val = a.Value.Bool()
			return false
		}
		return true
	})
	return val
}
