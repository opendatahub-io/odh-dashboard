package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
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

func TestAttachNamespace_SetsNamespaceOnActiveSpan(t *testing.T) {
	exporter := setupTestTracerProvider(t)
	app := &App{}
	tracer := otel.Tracer("test")

	handler := app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		assert.Equal(t, "test-namespace", r.Context().Value(constants.NamespaceQueryParameterKey))
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test?namespace=test-namespace", nil)
	ctx, span := tracer.Start(req.Context(), "test-span")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler(rr, req, nil)
	span.End()

	spans := exporter.GetSpans()
	require.NotEmpty(t, spans)

	var found bool
	for _, s := range spans {
		for _, attr := range s.Attributes {
			if attr.Key == attribute.Key("k8s.namespace.name") && attr.Value.AsString() == "test-namespace" {
				found = true
				break
			}
		}
	}
	assert.True(t, found, "expected k8s.namespace.name span attribute with namespace from query")
}

func TestAttachNamespaceFromPath_SetsNamespaceOnActiveSpan(t *testing.T) {
	exporter := setupTestTracerProvider(t)
	app := &App{}
	tracer := otel.Tracer("test")

	handler := app.AttachNamespaceFromPath(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		assert.Equal(t, "path-namespace", r.Context().Value(constants.NamespaceQueryParameterKey))
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	ctx, span := tracer.Start(req.Context(), "test-span")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler(rr, req, httprouter.Params{{Key: "namespace", Value: "path-namespace"}})
	span.End()

	spans := exporter.GetSpans()
	require.NotEmpty(t, spans)

	var found bool
	for _, s := range spans {
		for _, attr := range s.Attributes {
			if attr.Key == attribute.Key("k8s.namespace.name") && attr.Value.AsString() == "path-namespace" {
				found = true
				break
			}
		}
	}
	assert.True(t, found, "expected k8s.namespace.name span attribute with namespace from path")
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
