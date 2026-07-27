package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

func setupTestTracerProvider(t *testing.T) *tracetest.InMemoryExporter {
	t.Helper()
	exporter := tracetest.NewInMemoryExporter()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
	otel.SetTracerProvider(tp)
	t.Cleanup(func() {
		_ = tp.Shutdown(t.Context())
	})
	return exporter
}

func TestEnableTelemetry_SetsSessionIDSpanAttribute(t *testing.T) {
	exporter := setupTestTracerProvider(t)
	app := &App{}

	tracer := otel.Tracer("test")

	handler := app.EnableTelemetry(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Session-ID", "test-session-abc-123")

	ctx, span := tracer.Start(req.Context(), "test-span")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	span.End()

	spans := exporter.GetSpans()
	require.NotEmpty(t, spans)

	var found bool
	for _, s := range spans {
		for _, attr := range s.Attributes {
			if attr.Key == attribute.Key("session.id") && attr.Value.AsString() == "test-session-abc-123" {
				found = true
				break
			}
		}
	}
	assert.True(t, found, "expected session.id span attribute with value 'test-session-abc-123'")
}

func TestEnableTelemetry_NoSessionIDWhenHeaderAbsent(t *testing.T) {
	exporter := setupTestTracerProvider(t)
	app := &App{}

	tracer := otel.Tracer("test")

	handler := app.EnableTelemetry(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)

	ctx, span := tracer.Start(req.Context(), "test-span")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	span.End()

	spans := exporter.GetSpans()
	require.NotEmpty(t, spans)

	for _, s := range spans {
		for _, attr := range s.Attributes {
			assert.NotEqual(t, attribute.Key("session.id"), attr.Key, "session.id should not be set when header is absent")
		}
	}
}
