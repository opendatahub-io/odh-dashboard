package telemetry

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

const defaultServiceName = "gen-ai-bff"

// Setup initialises the OpenTelemetry TracerProvider with an OTLP/HTTP exporter.
// Tracing is opt-in: when OTEL_EXPORTER_OTLP_ENDPOINT is unset or empty, Setup
// returns a noop shutdown function and tracing has zero runtime cost.
//
// Standard OTel env vars are respected:
//   - OTEL_EXPORTER_OTLP_ENDPOINT — collector endpoint (required to enable tracing)
//   - OTEL_SERVICE_NAME — service name resource attribute (default: gen-ai-bff)
//   - OTEL_RESOURCE_ATTRIBUTES — comma-separated key=value pairs for resource attributes
func Setup() (shutdown func(context.Context) error, err error) {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		slog.Info("OTel tracing disabled (OTEL_EXPORTER_OTLP_ENDPOINT not set)")
		return func(context.Context) error { return nil }, nil
	}

	ctx := context.Background()

	exporter, err := otlptracehttp.New(ctx)
	if err != nil {
		return nil, fmt.Errorf("creating OTLP trace exporter: %w", err)
	}

	res, err := buildResource(ctx)
	if err != nil {
		return nil, fmt.Errorf("building OTel resource: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	slog.Info("OTel tracing enabled", "endpoint", endpoint, "service", res.String())

	return tp.Shutdown, nil
}

func buildResource(ctx context.Context) (*resource.Resource, error) {
	serviceName := os.Getenv("OTEL_SERVICE_NAME")
	if serviceName == "" {
		serviceName = defaultServiceName
	}

	attrs := []attribute.KeyValue{
		semconv.ServiceName(serviceName),
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
		resource.WithTelemetrySDK(),
		resource.WithProcess(),
	)
}
