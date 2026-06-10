package helpers

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRequestLogValuer_NilRequest(t *testing.T) {
	v := RequestLogValuer{Request: nil}
	got := v.LogValue()
	assert.Equal(t, slog.KindGroup, got.Kind())
}

func TestRequestLogValuer_ValidRequest(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/test", nil)
	v := RequestLogValuer{Request: req}
	got := v.LogValue()
	assert.Equal(t, slog.KindGroup, got.Kind())
}

func TestResponseLogValuer_NilResponse(t *testing.T) {
	v := ResponseLogValuer{Response: nil}
	got := v.LogValue()
	assert.Equal(t, slog.KindGroup, got.Kind())
}

func TestResponseLogValuer_ValidResponse(t *testing.T) {
	resp := &http.Response{
		StatusCode: 200,
		Status:     "200 OK",
		Header:     http.Header{},
	}
	v := ResponseLogValuer{Response: resp}
	got := v.LogValue()
	assert.Equal(t, slog.KindGroup, got.Kind())
}

func TestHeaderLogValuer_SensitiveHeadersRedacted(t *testing.T) {
	h := http.Header{}
	h.Set("Authorization", "Bearer secret")
	h.Set("Content-Type", "application/json")

	v := HeaderLogValuer{Header: h}
	got := v.LogValue()
	assert.Equal(t, slog.KindGroup, got.Kind())

	attrs := map[string]string{}
	for _, a := range got.Group() {
		attrs[a.Key] = a.Value.String()
	}
	assert.Equal(t, "[REDACTED]", attrs["Authorization"])
	assert.Equal(t, "application/json", attrs["Content-Type"])
}
