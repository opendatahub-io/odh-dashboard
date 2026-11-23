package api

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

func assertSpanErrorEvent(t *testing.T, events []sdktrace.Event, category string) {
	t.Helper()
	descriptions := map[string]string{
		"invalid_request":    "Request validation failed.",
		"connection_failure": "Connection failed.",
		"upstream_failure":   "Upstream request failed.",
	}
	description, ok := descriptions[category]
	require.True(t, ok, "expected a controlled error category")
	require.Len(t, events, 1)
	assert.Equal(t, "exception", events[0].Name)
	assert.ElementsMatch(t, []attribute.KeyValue{
		attribute.String("exception.type", category),
		attribute.String("exception.message", description),
	}, events[0].Attributes, "only a controlled category and fixed description may be exported")
}

func TestResponseErrorSpanMetadata(t *testing.T) {
	// These values must not be copied into any of the new telemetry fields.
	const sensitiveMessage = "api_key=test-secret-sentinel prompt=private-prompt-sentinel"
	app := &App{logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
	failedEvent := responses.ResponseStreamEventUnion{
		Type: "response.failed",
		Response: responses.Response{Error: responses.ResponseError{
			Code: "server_error", Message: sensitiveMessage,
		}},
	}

	for _, tc := range []struct {
		name      string
		category  string
		component string
		status    codes.Code
		run       func(*testing.T, context.Context)
	}{
		{
			name:     "local validation failure marks the operation as Error",
			category: "invalid_request", component: llamastack.ComponentBFF, status: codes.Error,
			run: func(t *testing.T, ctx context.Context) {
				rr := httptest.NewRecorder()
				req := httptest.NewRequest(http.MethodPost, "/responses", nil).WithContext(ctx)
				app.handleLlamaStackClientError(rr, req, llamastack.NewInvalidRequestError(sensitiveMessage))
				assert.Equal(t, http.StatusBadRequest, rr.Code)
				assert.Contains(t, rr.Body.String(), sensitiveMessage, "chat error contract remains unchanged")
			},
		},
		{
			name:     "HTTP server failure normalizes arbitrary code and component",
			category: "upstream_failure", component: "unknown", status: codes.Error,
			run: func(t *testing.T, ctx context.Context) {
				rr := httptest.NewRecorder()
				req := httptest.NewRequest(http.MethodPost, "/responses", nil).WithContext(ctx)
				app.handleLlamaStackClientError(rr, req, &llamastack.LlamaStackError{
					Code: sensitiveMessage, ErrorCode: sensitiveMessage, Component: sensitiveMessage,
					Message: sensitiveMessage, StatusCode: http.StatusInternalServerError,
				})
				assert.Equal(t, http.StatusInternalServerError, rr.Code)
			},
		},
		{
			name:     "streaming upstream error event normalizes arbitrary code",
			category: "upstream_failure", component: llamastack.ComponentOGX, status: codes.Error,
			run: func(t *testing.T, ctx context.Context) {
				rr := httptest.NewRecorder()
				require.NoError(t, app.streamSSEEvents(StreamConfig{
					Context: ctx, Logger: app.logger, Writer: rr, Flusher: rr,
					Stream: lsmocks.NewMockStreamIterator([]responses.ResponseStreamEventUnion{{
						Type: "error", Code: sensitiveMessage, Message: sensitiveMessage,
					}}),
				}))
			},
		},
		{
			name:     "streaming response.failed event",
			category: "upstream_failure", component: llamastack.ComponentOGX, status: codes.Error,
			run: func(t *testing.T, ctx context.Context) {
				rr := httptest.NewRecorder()
				require.NoError(t, app.streamSSEEvents(StreamConfig{
					Context: ctx, Logger: app.logger, Writer: rr, Flusher: rr,
					Stream: lsmocks.NewMockStreamIterator([]responses.ResponseStreamEventUnion{failedEvent}),
				}))
			},
		},
		{
			name:     "advanced iterator error omits raw message and metadata",
			category: "upstream_failure", component: "unknown", status: codes.Error,
			run: func(t *testing.T, ctx context.Context) {
				rr := httptest.NewRecorder()
				require.NoError(t, app.streamSSEEvents(StreamConfig{
					Context: ctx, Logger: app.logger, Writer: rr, Flusher: rr,
					UseAdvancedErrorLogic: true,
					Stream: &errorTraceStream{
						MockStreamIterator: lsmocks.NewMockStreamIterator(nil),
						err: &llamastack.LlamaStackError{
							Code: sensitiveMessage, ErrorCode: sensitiveMessage, Component: sensitiveMessage,
							Message: sensitiveMessage, StatusCode: 500,
						},
					},
				}))
			},
		},
		{
			name:     "simple iterator error omits raw message",
			category: "upstream_failure", component: llamastack.ComponentBFF, status: codes.Error,
			run: func(t *testing.T, ctx context.Context) {
				rr := httptest.NewRecorder()
				require.NoError(t, app.streamSSEEvents(StreamConfig{
					Context: ctx, Logger: app.logger, Writer: rr, Flusher: rr,
					Stream: &errorTraceStream{
						MockStreamIterator: lsmocks.NewMockStreamIterator(nil), err: errors.New(sensitiveMessage),
					},
				}))
			},
		},
		{
			name:     "custom passthrough failure",
			category: "upstream_failure", component: llamastack.ComponentOGX, status: codes.Error,
			run: func(t *testing.T, ctx context.Context) {
				ctx = context.WithValue(ctx, constants.LlamaStackClientKey, &errorTracePassthroughClient{
					stream: lsmocks.NewMockStreamIterator([]responses.ResponseStreamEventUnion{failedEvent}),
				})
				req := httptest.NewRequest(http.MethodPost, "/responses/passthrough", strings.NewReader(`{"model":"test","input":"hello"}`)).WithContext(ctx)
				rr := httptest.NewRecorder()
				app.LlamaStackPassthroughResponseHandler(rr, req, nil)
				assert.Equal(t, http.StatusOK, rr.Code)
			},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			exporter := tracetest.NewInMemoryExporter()
			tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
			t.Cleanup(func() { require.NoError(t, tp.Shutdown(context.Background())) })
			ctx, span := tp.Tracer("test").Start(context.Background(), "request")
			tc.run(t, ctx)
			span.End()

			spans := exporter.GetSpans()
			require.Len(t, spans, 1, "metadata belongs on the existing span, not a new child")
			assert.ElementsMatch(t, []attribute.KeyValue{
				attribute.String("error.type", tc.category),
				attribute.String("error.component", tc.component),
			}, spans[0].Attributes, "only controlled metadata may be exported")
			assertSpanErrorEvent(t, spans[0].Events, tc.category)
			assert.Equal(t, tc.status, spans[0].Status.Code)
			assert.Equal(t, tc.category, spans[0].Status.Description)
		})
	}
}

func TestPassthroughFailureSpanMetadata(t *testing.T) {
	const sensitiveMessage = "api_key=test-secret-sentinel prompt=private-prompt-sentinel"
	for _, tc := range []struct {
		name      string
		code      responses.ResponseErrorCode
		category  string
		component string
	}{
		{"invalid prompt", llamastack.OGXErrInvalidPrompt, "invalid_request", llamastack.ComponentModel},
		{"invalid image format", llamastack.OGXErrInvalidImageFormat, "invalid_request", llamastack.ComponentModel},
		{"vector store timeout", llamastack.OGXErrVectorStoreTimeout, "upstream_failure", llamastack.ComponentRAG},
		{"untrusted code", sensitiveMessage, "upstream_failure", llamastack.ComponentOGX},
	} {
		t.Run(tc.name, func(t *testing.T) {
			exporter := tracetest.NewInMemoryExporter()
			tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
			t.Cleanup(func() { require.NoError(t, tp.Shutdown(context.Background())) })
			ctx, span := tp.Tracer("test").Start(context.Background(), "request")
			ctx = context.WithValue(ctx, constants.LlamaStackClientKey, &errorTracePassthroughClient{
				stream: lsmocks.NewMockStreamIterator([]responses.ResponseStreamEventUnion{{
					Type: "response.failed",
					Response: responses.Response{Error: responses.ResponseError{
						Code: tc.code, Message: sensitiveMessage,
					}},
				}}),
			})
			req := httptest.NewRequest(http.MethodPost, "/responses/passthrough", strings.NewReader(`{"model":"test","input":"hello"}`)).WithContext(ctx)
			rr := httptest.NewRecorder()
			app := &App{logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
			app.LlamaStackPassthroughResponseHandler(rr, req, nil)
			span.End()

			assert.Equal(t, http.StatusOK, rr.Code)
			payload := strings.TrimPrefix(strings.SplitN(rr.Body.String(), "\n\n", 2)[0], "data: ")
			data := assertErrorTraceID(t, []byte(payload), ctx)
			assert.Equal(t, map[string]interface{}{
				"code": "server_error", "message": sensitiveMessage,
			}, data["error"], "client error payload remains unchanged")

			spans := exporter.GetSpans()
			require.Len(t, spans, 1)
			assert.ElementsMatch(t, []attribute.KeyValue{
				attribute.String("error.type", tc.category),
				attribute.String("error.component", tc.component),
			}, spans[0].Attributes)
			assertSpanErrorEvent(t, spans[0].Events, tc.category)
			assert.Equal(t, codes.Error, spans[0].Status.Code)
			assert.Equal(t, tc.category, spans[0].Status.Description)
		})
	}
}

func TestRecordSpanErrorCategories(t *testing.T) {
	for _, tc := range []struct {
		code     string
		category string
	}{
		{llamastack.ErrCodeInvalidRequest, "invalid_request"},
		{llamastack.OGXErrInvalidPrompt, "invalid_request"},
		{llamastack.OGXErrInvalidImage, "invalid_request"},
		{llamastack.OGXErrInvalidImageFormat, "invalid_request"},
		{llamastack.OGXErrInvalidBase64Image, "invalid_request"},
		{llamastack.OGXErrInvalidImageURL, "invalid_request"},
		{llamastack.OGXErrImageTooLarge, "invalid_request"},
		{llamastack.OGXErrImageTooSmall, "invalid_request"},
		{llamastack.OGXErrInvalidImageMode, "invalid_request"},
		{llamastack.OGXErrImageFileTooLarge, "invalid_request"},
		{llamastack.OGXErrUnsupportedImageMediaType, "invalid_request"},
		{llamastack.OGXErrEmptyImageFile, "invalid_request"},
		{"400", "invalid_request"},
		{llamastack.ErrCodeConnectionFailed, "connection_failure"},
		{llamastack.OGXErrServerError, "upstream_failure"},
		{llamastack.OGXErrFailedToDownloadImage, "upstream_failure"},
		{"arbitrary-provider-code", "upstream_failure"},
	} {
		t.Run(tc.code, func(t *testing.T) {
			exporter := tracetest.NewInMemoryExporter()
			tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
			t.Cleanup(func() { require.NoError(t, tp.Shutdown(context.Background())) })
			ctx, span := tp.Tracer("test").Start(context.Background(), "request")
			recordSpanError(ctx, tc.code, llamastack.ComponentModel)
			span.End()
			spans := exporter.GetSpans()
			require.Len(t, spans, 1)
			assert.ElementsMatch(t, []attribute.KeyValue{
				attribute.String("error.type", tc.category),
				attribute.String("error.component", llamastack.ComponentModel),
			}, spans[0].Attributes)
			assert.Equal(t, codes.Error, spans[0].Status.Code)
			assert.Equal(t, tc.category, spans[0].Status.Description)
			assertSpanErrorEvent(t, spans[0].Events, tc.category)
		})
	}
}

func TestRecordSpanErrorComponents(t *testing.T) {
	for _, tc := range []struct {
		name      string
		component string
		expected  string
	}{
		{"bff", llamastack.ComponentBFF, "bff"},
		{"ogx", llamastack.ComponentOGX, "ogx"},
		{"model", llamastack.ComponentModel, "model"},
		{"rag", llamastack.ComponentRAG, "rag"},
		{"asr", llamastack.ComponentASR, "asr"},
		{"empty", "", "unknown"},
		{"untrusted", "api_key=component-secret-sentinel", "unknown"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			exporter := tracetest.NewInMemoryExporter()
			tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
			t.Cleanup(func() { require.NoError(t, tp.Shutdown(context.Background())) })
			ctx, span := tp.Tracer("test").Start(context.Background(), "request")
			recordSpanError(ctx, "server_error", tc.component)
			span.End()

			spans := exporter.GetSpans()
			require.Len(t, spans, 1)
			assert.ElementsMatch(t, []attribute.KeyValue{
				attribute.String("error.type", "upstream_failure"),
				attribute.String("error.component", tc.expected),
			}, spans[0].Attributes)
			assertSpanErrorEvent(t, spans[0].Events, "upstream_failure")
		})
	}
}

func TestStreamSSESuccessDoesNotRecordErrorMetadata(t *testing.T) {
	exporter := tracetest.NewInMemoryExporter()
	tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
	t.Cleanup(func() { require.NoError(t, tp.Shutdown(context.Background())) })
	ctx, span := tp.Tracer("test").Start(context.Background(), "request")
	rr := httptest.NewRecorder()
	app := &App{}
	require.NoError(t, app.streamSSEEvents(StreamConfig{
		Context: ctx, Logger: slog.New(slog.NewTextHandler(io.Discard, nil)), Writer: rr, Flusher: rr,
		Stream: lsmocks.NewMockStreamIterator([]responses.ResponseStreamEventUnion{{Type: "response.created"}}),
	}))
	span.End()

	assert.Contains(t, rr.Body.String(), "response.created")
	spans := exporter.GetSpans()
	require.Len(t, spans, 1)
	assert.Empty(t, spans[0].Attributes)
	assert.Empty(t, spans[0].Events)
	assert.Equal(t, codes.Unset, spans[0].Status.Code)
	assert.Empty(t, spans[0].Status.Description)
}

func TestRecordSpanErrorWithoutSpan(t *testing.T) {
	assert.NotPanics(t, func() {
		recordSpanError(context.Background(), "INVALID_REQUEST", "bff")
	})
}
