package telemetry

import (
	"context"
	"log/slog"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

func Setup(logger *slog.Logger) func(context.Context) error {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		logger.Debug("OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled")
		return func(context.Context) error { return nil }
	}

	serviceName := os.Getenv("OTEL_SERVICE_NAME")
	if serviceName == "" {
		serviceName = "gen-ai-bff"
	}

	ctx := context.Background()

	exporter, err := otlptracehttp.New(ctx)
	if err != nil {
		logger.Error("failed to create OTLP trace exporter", "error", err)
		return func(context.Context) error { return nil }
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(semconv.ServiceName(serviceName)),
		resource.WithFromEnv(),
	)
	if err != nil {
		logger.Error("failed to create OTel resource", "error", err)
		return func(context.Context) error { return nil }
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

	logger.Info("OpenTelemetry tracing configured", "endpoint", endpoint, "service", serviceName)

	return tp.Shutdown
}
