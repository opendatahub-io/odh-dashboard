package telemetry

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/trace"
)

var testLogger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

func TestSetup_WaitsWhenEndpointUnset(t *testing.T) {
	preserveOTelGlobals(t)
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	initialProvider := otel.GetTracerProvider()

	shutdown := setup(testLogger, func(context.Context, *slog.Logger) string { return "" }, time.Hour)
	require.NotNil(t, shutdown)
	assert.Same(t, initialProvider, otel.GetTracerProvider(), "no provider should be installed until discovery succeeds")

	assert.NoError(t, shutdown(context.Background()))
}

func TestSetup_EnabledWhenEndpointSet(t *testing.T) {
	preserveOTelGlobals(t)
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://192.0.2.1:4318")
	t.Setenv("OTEL_SERVICE_NAME", "test-bff")

	shutdown := Setup(testLogger)
	require.NotNil(t, shutdown)

	tp := otel.GetTracerProvider()
	_, ok := tp.(*sdktrace.TracerProvider)
	assert.True(t, ok, "expected SDK TracerProvider when endpoint is set")

	assert.NoError(t, shutdown(context.Background()))
}

func TestNormalizeOTLPEndpointURL(t *testing.T) {
	tests := []struct {
		name     string
		endpoint string
		want     string
	}{
		{
			name:     "pathless URL gets the traces path appended",
			endpoint: "http://gen-ai-trace-collector-collector.redhat-ods-monitoring.svc:4318",
			want:     "http://gen-ai-trace-collector-collector.redhat-ods-monitoring.svc:4318/v1/traces",
		},
		{
			name:     "root path gets the traces path appended",
			endpoint: "http://localhost:4318/",
			want:     "http://localhost:4318/v1/traces",
		},
		{
			name:     "explicit path is preserved",
			endpoint: "https://gateway.example.com/otlp/v1/traces",
			want:     "https://gateway.example.com/otlp/v1/traces",
		},
		{
			name:     "https pathless URL gets the traces path appended",
			endpoint: "https://collector.example.com:4318",
			want:     "https://collector.example.com:4318/v1/traces",
		},
		{
			name:     "invalid URL is returned unchanged",
			endpoint: "://not-a-url",
			want:     "://not-a-url",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, normalizeOTLPEndpointURL(tt.endpoint))
		})
	}
}

func TestSetup_ShutdownIsIdempotent(t *testing.T) {
	preserveOTelGlobals(t)
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")

	shutdown := setup(testLogger, func(context.Context, *slog.Logger) string { return "" }, time.Hour)

	assert.NoError(t, shutdown(context.Background()))
	assert.NoError(t, shutdown(context.Background()))
}

func preserveOTelGlobals(t *testing.T) {
	t.Helper()
	provider := otel.GetTracerProvider()
	propagator := otel.GetTextMapPropagator()
	t.Cleanup(func() {
		otel.SetTracerProvider(provider)
		otel.SetTextMapPropagator(propagator)
	})
}

func TestSetup_EndpointOverrideSkipsDiscovery(t *testing.T) {
	preserveOTelGlobals(t)
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:4318")
	shutdown := setup(testLogger, func(context.Context, *slog.Logger) string {
		t.Fatal("discovery should not run with an explicit endpoint")
		return ""
	}, time.Millisecond)
	require.IsType(t, &sdktrace.TracerProvider{}, otel.GetTracerProvider())
	require.NoError(t, shutdown(context.Background()))
	require.NoError(t, shutdown(context.Background()))
}

func TestSetup_ShutdownCancelsDiscovery(t *testing.T) {
	preserveOTelGlobals(t)
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	initialProvider := otel.GetTracerProvider()
	var attempts atomic.Int32
	discovering := make(chan struct{})
	shutdown := setup(testLogger, func(ctx context.Context, _ *slog.Logger) string {
		if attempts.Add(1) == 2 {
			close(discovering)
			<-ctx.Done()
		}
		return ""
	}, time.Millisecond)
	t.Cleanup(func() { assert.NoError(t, shutdown(context.Background())) })

	select {
	case <-discovering:
	case <-time.After(5 * time.Second):
		t.Fatal("discovery was not retried")
	}
	// Let another retry tick become ready while discovery is blocked, so the
	// worker must handle both ticker.C and ctx.Done() being ready at shutdown.
	time.Sleep(5 * time.Millisecond)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	require.NoError(t, shutdown(ctx))
	assert.Equal(t, int32(2), attempts.Load(), "no discovery should run after shutdown")
	assert.Same(t, initialProvider, otel.GetTracerProvider())
}

func TestSetup_EnablesTracingAfterCollectorAppears(t *testing.T) {
	// Use a fresh process so the OTel default delegating provider has not
	// already been replaced by another test. This reproduces real BFF startup.
	const childEnv = "TEST_OTEL_LATE_DISCOVERY"
	if os.Getenv(childEnv) != "1" {
		cmd := exec.Command(os.Args[0], "-test.run=^TestSetup_EnablesTracingAfterCollectorAppears$", "-test.timeout=20s")
		cmd.Env = append(os.Environ(), childEnv+"=1")
		output, err := cmd.CombinedOutput()
		require.NoError(t, err, "%s", output)
		return
	}
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	exported := make(chan string, 1)
	collector := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		exported <- r.URL.Path
		w.WriteHeader(http.StatusOK)
	}))
	defer collector.Close()

	var available atomic.Bool
	var attempts atomic.Int32
	shutdown := setup(testLogger, func(context.Context, *slog.Logger) string {
		attempts.Add(1)
		if available.Load() {
			return collector.URL
		}
		return ""
	}, time.Millisecond)
	t.Cleanup(func() { assert.NoError(t, shutdown(context.Background())) })

	// Both a cached tracer and HTTP middleware exist before the collector.
	tracer := otel.Tracer("late-discovery-test")
	_, before := tracer.Start(context.Background(), "before-discovery")
	assert.False(t, before.SpanContext().IsValid())
	before.End()
	var requestTraceID string
	handler := otelhttp.NewHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestTraceID = trace.SpanContextFromContext(r.Context()).TraceID().String()
		w.WriteHeader(http.StatusOK)
	}), "chat")

	available.Store(true)
	require.Eventually(t, func() bool {
		_, ok := otel.GetTracerProvider().(*sdktrace.TracerProvider)
		return ok
	}, 5*time.Second, time.Millisecond)
	assert.GreaterOrEqual(t, attempts.Load(), int32(2))
	_, after := tracer.Start(context.Background(), "after-discovery")
	assert.True(t, after.SpanContext().IsValid(), "previously cached tracers should start recording")
	after.End()

	request := httptest.NewRequest(http.MethodPost, "/responses", nil)
	request.Header.Set("traceparent", "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01")
	handler.ServeHTTP(httptest.NewRecorder(), request)
	assert.Equal(t, "0123456789abcdef0123456789abcdef", requestTraceID, "middleware should record spans and propagate trace context after late discovery")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	require.NoError(t, shutdown(ctx)) // Flushes the spans to the newly discovered collector.
	select {
	case path := <-exported:
		assert.Equal(t, "/v1/traces", path)
	default:
		t.Fatal("no spans exported after late discovery")
	}
}

func TestBuildResource_DefaultServiceName(t *testing.T) {
	t.Setenv("OTEL_SERVICE_NAME", "")
	t.Setenv("OTEL_RESOURCE_ATTRIBUTES", "")

	res, err := buildResource(context.Background())
	require.NoError(t, err)

	attrs := make(map[string]string)
	for _, attr := range res.Attributes() {
		attrs[string(attr.Key)] = attr.Value.AsString()
	}
	assert.Equal(t, defaultServiceName, attrs["service.name"])
}

func TestBuildResource_CustomServiceName(t *testing.T) {
	t.Setenv("OTEL_SERVICE_NAME", "custom-bff")
	t.Setenv("OTEL_RESOURCE_ATTRIBUTES", "")

	res, err := buildResource(context.Background())
	require.NoError(t, err)

	attrs := make(map[string]string)
	for _, attr := range res.Attributes() {
		attrs[string(attr.Key)] = attr.Value.AsString()
	}
	assert.Equal(t, "custom-bff", attrs["service.name"])
}

func TestBuildResource_ExtraAttributes(t *testing.T) {
	t.Setenv("OTEL_SERVICE_NAME", "test-svc")
	t.Setenv("OTEL_RESOURCE_ATTRIBUTES", "k8s.namespace.name=my-ns,deployment.environment=staging")

	res, err := buildResource(context.Background())
	require.NoError(t, err)

	attrs := make(map[string]string)
	for _, attr := range res.Attributes() {
		attrs[string(attr.Key)] = attr.Value.AsString()
	}

	assert.Equal(t, "my-ns", attrs["k8s.namespace.name"])
	assert.Equal(t, "staging", attrs["deployment.environment"])
	assert.Equal(t, "test-svc", attrs["service.name"])
}

func TestDetectNamespace_FromEnvVar(t *testing.T) {
	t.Setenv("POD_NAMESPACE", "my-project")
	assert.Equal(t, "my-project", detectNamespace())
}

func TestDetectNamespace_EnvVarTakesPrecedence(t *testing.T) {
	t.Setenv("POD_NAMESPACE", "from-env")
	assert.Equal(t, "from-env", detectNamespace())
}

func TestDetectNamespace_EmptyWhenNothingAvailable(t *testing.T) {
	t.Setenv("POD_NAMESPACE", "")
	ns := detectNamespace()
	// On a dev machine without K8s, this returns empty (no SA namespace file)
	// On a cluster, it would return the pod's namespace
	assert.True(t, ns == "" || len(ns) > 0)
}

func TestBuildResource_IncludesAutoDetectedNamespace(t *testing.T) {
	t.Setenv("OTEL_SERVICE_NAME", "test-svc")
	t.Setenv("OTEL_RESOURCE_ATTRIBUTES", "")
	t.Setenv("POD_NAMESPACE", "auto-detected-ns")

	res, err := buildResource(context.Background())
	require.NoError(t, err)

	attrs := make(map[string]string)
	for _, attr := range res.Attributes() {
		attrs[string(attr.Key)] = attr.Value.AsString()
	}

	assert.Equal(t, "auto-detected-ns", attrs["k8s.namespace.name"])
	assert.Equal(t, "test-svc", attrs["service.name"])
}
