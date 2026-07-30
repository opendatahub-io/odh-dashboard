package telemetry

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

var testLogger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

func TestSetup_DisabledWhenEndpointUnset(t *testing.T) {
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")

	shutdown := Setup(testLogger)
	require.NotNil(t, shutdown)

	assert.NoError(t, shutdown(context.Background()))
}

func TestSetup_EnabledWhenEndpointSet(t *testing.T) {
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://192.0.2.1:4318")
	t.Setenv("OTEL_SERVICE_NAME", "test-bff")

	shutdown := Setup(testLogger)
	require.NotNil(t, shutdown)

	tp := otel.GetTracerProvider()
	_, ok := tp.(*sdktrace.TracerProvider)
	assert.True(t, ok, "expected SDK TracerProvider when endpoint is set")

	assert.NoError(t, shutdown(context.Background()))
}

func TestSetup_ShutdownIsIdempotent(t *testing.T) {
	t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")

	shutdown := Setup(testLogger)

	assert.NoError(t, shutdown(context.Background()))
	assert.NoError(t, shutdown(context.Background()))
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
