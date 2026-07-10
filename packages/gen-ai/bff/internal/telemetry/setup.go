package telemetry

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

const defaultServiceName = "gen-ai-bff"

// Setup initialises the OpenTelemetry TracerProvider with an OTLP/HTTP exporter.
// The collector endpoint is resolved in this order:
//  1. OTEL_EXPORTER_OTLP_ENDPOINT env var (local dev override)
//  2. Auto-discovery from the platform OpenTelemetryCollector CR (in-cluster)
//  3. If neither is available, tracing is disabled (zero runtime cost)
//
// Standard OTel env vars are also respected:
//   - OTEL_SERVICE_NAME — service name resource attribute (default: gen-ai-bff)
//   - OTEL_RESOURCE_ATTRIBUTES — comma-separated key=value pairs for resource attributes
func Setup(logger *slog.Logger) func(context.Context) error {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		endpoint = discoverCollectorEndpoint(logger)
	}
	if endpoint == "" {
		logger.Info("OTel tracing disabled (no collector endpoint configured or discovered)")
		return func(context.Context) error { return nil }
	}
	ctx := context.Background()

	exporter, err := otlptracehttp.New(ctx, otlptracehttp.WithEndpointURL(endpoint))
	if err != nil {
		logger.Error("failed to create OTLP trace exporter", "error", err)
		return func(context.Context) error { return nil }
	}

	res, err := buildResource(ctx)
	if err != nil {
		logger.Error("failed to build OTel resource", "error", err)
		return func(context.Context) error { return nil }
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSpanProcessor(&namespaceSpanProcessor{}),
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	logger.Info("OTel tracing enabled", "endpoint", endpoint)

	return tp.Shutdown
}

const namespacePath = "/var/run/secrets/kubernetes.io/serviceaccount/namespace"

// detectNamespace returns the Kubernetes namespace this pod is running in.
// It checks POD_NAMESPACE env var first (explicit override for dev/testing),
// then falls back to the service account namespace file that K8s automatically
// mounts into every pod at /var/run/secrets/kubernetes.io/serviceaccount/namespace.
// Returns empty string when running outside K8s (e.g. local development).
func detectNamespace() string {
	if ns := os.Getenv("POD_NAMESPACE"); ns != "" {
		return ns
	}
	if data, err := os.ReadFile(namespacePath); err == nil {
		return strings.TrimSpace(string(data))
	}
	return ""
}

// discoverCollectorEndpoint determines the OTLP/HTTP endpoint for the gen-ai
// trace collector. The gen-ai collector CR may not exist yet at BFF startup —
// it's created on first playground install with tracing enabled. We construct
// the endpoint deterministically from the namespace where the platform
// collector lives, so the OTel SDK exporter retries in the background until
// the gen-ai collector is created by EnsureRoute.
func discoverCollectorEndpoint(logger *slog.Logger) string {
	restCfg, err := rest.InClusterConfig()
	if err != nil {
		loadedCfg, loadErr := clientcmd.NewDefaultClientConfigLoadingRules().Load()
		if loadErr != nil {
			return ""
		}
		restCfg, err = clientcmd.NewDefaultClientConfig(*loadedCfg, &clientcmd.ConfigOverrides{}).ClientConfig()
		if err != nil {
			return ""
		}
	}

	dynClient, err := dynamic.NewForConfig(restCfg)
	if err != nil {
		return ""
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	list, err := dynClient.Resource(constants.OTelCollectorGVR).Namespace("").List(ctx, metav1.ListOptions{})
	if err != nil {
		logger.Debug("collector auto-discovery failed", "error", err)
		return ""
	}

	// Find the namespace from either the gen-ai collector or the platform
	// collector, then always target the gen-ai collector endpoint.
	for _, item := range list.Items {
		name := item.GetName()
		ns := item.GetNamespace()
		if name == constants.GenAICollectorName {
			endpoint := fmt.Sprintf("http://%s-collector.%s.svc:4318", constants.GenAICollectorName, ns)
			logger.Info("auto-discovered gen-ai trace collector endpoint", "endpoint", endpoint)
			return endpoint
		}
	}

	// Gen-ai collector doesn't exist yet — derive its future endpoint from
	// the platform collector's namespace (same namespace used by EnsureRoute).
	for _, item := range list.Items {
		if item.GetName() == constants.PlatformCollectorName {
			ns := item.GetNamespace()
			endpoint := fmt.Sprintf("http://%s-collector.%s.svc:4318", constants.GenAICollectorName, ns)
			logger.Info("gen-ai collector not yet created, targeting future endpoint from platform collector namespace", "endpoint", endpoint)
			return endpoint
		}
	}

	return ""
}

func buildResource(ctx context.Context) (*resource.Resource, error) {
	serviceName := os.Getenv("OTEL_SERVICE_NAME")
	if serviceName == "" {
		serviceName = defaultServiceName
	}

	attrs := []attribute.KeyValue{
		semconv.ServiceName(serviceName),
	}

	// Attach the pod's namespace so the OTel Collector routing connector can
	// dispatch spans to the correct per-namespace backend (Tempo/MLflow).
	if ns := detectNamespace(); ns != "" {
		attrs = append(attrs, semconv.K8SNamespaceName(ns))
	}

	if extra := os.Getenv("OTEL_RESOURCE_ATTRIBUTES"); extra != "" {
		for _, pair := range strings.Split(extra, ",") {
			k, v, ok := strings.Cut(pair, "=")
			if ok && k != "" {
				attrs = append(attrs, attribute.String(strings.TrimSpace(k), strings.TrimSpace(v)))
			}
		}
	}

	return resource.New(ctx,
		resource.WithAttributes(attrs...),
		resource.WithFromEnv(),
		resource.WithTelemetrySDK(),
		resource.WithProcess(),
	)
}

// namespaceSpanProcessor sets k8s.namespace.name on every span from the
// request context. This ensures ALL BFF spans (including child spans like
// the HTTP client span created by otelhttp.NewTransport) carry the
// namespace attribute, so the collector's span-context routing rule can
// route the entire trace to the correct per-namespace MLflow exporter.
type namespaceSpanProcessor struct{}

func (p *namespaceSpanProcessor) OnStart(ctx context.Context, span sdktrace.ReadWriteSpan) {
	if ns, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok && ns != "" {
		span.SetAttributes(attribute.String("k8s.namespace.name", ns))
	}
}

func (p *namespaceSpanProcessor) OnEnd(sdktrace.ReadOnlySpan)      {}
func (p *namespaceSpanProcessor) Shutdown(context.Context) error   { return nil }
func (p *namespaceSpanProcessor) ForceFlush(context.Context) error { return nil }
