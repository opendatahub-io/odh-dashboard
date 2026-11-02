package api

import (
	"context"
	"encoding/json"
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
	"go.opentelemetry.io/otel/trace"
)

// Use an explicit span context without changing the global tracer provider.
func errorTraceContext(t *testing.T, enabled bool) context.Context {
	t.Helper()
	ctx := context.Background()
	if !enabled {
		return ctx
	}
	traceID, err := trace.TraceIDFromHex("0123456789abcdef0123456789abcdef")
	require.NoError(t, err)
	spanID, err := trace.SpanIDFromHex("0123456789abcdef")
	require.NoError(t, err)
	return trace.ContextWithSpanContext(ctx, trace.NewSpanContext(trace.SpanContextConfig{
		TraceID: traceID,
		SpanID:  spanID,
	}))
}

func assertErrorTraceID(t *testing.T, payload []byte, ctx context.Context) map[string]interface{} {
	t.Helper()
	var data map[string]interface{}
	require.NoError(t, json.Unmarshal(payload, &data))
	if expected := trace.SpanContextFromContext(ctx).TraceID(); expected.IsValid() {
		assert.Equal(t, expected.String(), data["trace_id"])
	} else {
		assert.NotContains(t, data, "trace_id")
	}
	return data
}

func TestLlamaStackClientErrorTraceID(t *testing.T) {
	app := &App{logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
	for _, enabled := range []bool{true, false} {
		t.Run(map[bool]string{true: "tracing enabled", false: "tracing disabled"}[enabled], func(t *testing.T) {
			ctx := errorTraceContext(t, enabled)
			req := httptest.NewRequest(http.MethodPost, "/responses", nil).WithContext(ctx)
			rr := httptest.NewRecorder()
			app.handleLlamaStackClientError(rr, req, &llamastack.LlamaStackError{
				StatusCode: http.StatusInternalServerError,
				Code:       llamastack.ErrCodeInternalError,
				ErrorCode:  "server_error",
				Component:  "ogx",
				Message:    "Upstream inference failed",
			})
			assert.Equal(t, http.StatusInternalServerError, rr.Code)
			data := assertErrorTraceID(t, rr.Body.Bytes(), ctx)
			assert.Equal(t, map[string]interface{}{
				"code": "server_error", "component": "ogx",
				"message": "Upstream inference failed", "retriable": true,
			}, data["error"])
		})
	}
}

type errorTraceStream struct {
	*lsmocks.MockStreamIterator
	err error
}

func (s *errorTraceStream) Err() error { return s.err }

func TestStreamSSEErrorTraceID(t *testing.T) {
	app := &App{}
	for _, tc := range []struct {
		name     string
		events   []responses.ResponseStreamEventUnion
		err      error
		advanced bool
		code     string
		message  string
	}{
		{
			name: "upstream error event",
			events: []responses.ResponseStreamEventUnion{{
				Type: "error", Code: "500", Message: "Upstream inference failed",
			}},
			code: "500", message: "Upstream inference failed",
		},
		{
			name: "response.failed event",
			events: []responses.ResponseStreamEventUnion{{
				Type: "response.failed",
				Response: responses.Response{Error: responses.ResponseError{
					Code: "server_error", Message: "Upstream inference failed",
				}},
			}},
			code: "server_error", message: "Upstream inference failed",
		},
		{
			name: "advanced iterator error", advanced: true,
			err: &llamastack.LlamaStackError{
				Code: "server_error", Message: "Upstream inference failed", StatusCode: 500,
			},
			code: "server_error", message: "Upstream inference failed",
		},
		{
			name: "simple iterator error", err: errors.New("connection reset"),
			code: "500", message: "Streaming error occurred",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			for _, enabled := range []bool{true, false} {
				t.Run(map[bool]string{true: "tracing enabled", false: "tracing disabled"}[enabled], func(t *testing.T) {
					ctx := errorTraceContext(t, enabled)
					rr := httptest.NewRecorder()
					err := app.streamSSEEvents(StreamConfig{
						Stream:  &errorTraceStream{MockStreamIterator: lsmocks.NewMockStreamIterator(tc.events), err: tc.err},
						Context: ctx, Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
						Writer: rr, Flusher: rr, UseAdvancedErrorLogic: tc.advanced,
					})
					require.NoError(t, err)
					require.True(t, rr.Flushed)
					payload := strings.TrimSuffix(strings.TrimPrefix(rr.Body.String(), "data: "), "\n\n")
					data := assertErrorTraceID(t, []byte(payload), ctx)
					detail, ok := data["error"].(map[string]interface{})
					require.True(t, ok)
					assert.Equal(t, tc.code, detail["code"])
					assert.Equal(t, tc.message, detail["message"])
				})
			}
		})
	}
}

type errorTracePassthroughClient struct {
	llamastack.LlamaStackClientInterface
	stream llamastack.ResponseStreamIterator
}

func (c *errorTracePassthroughClient) CreateResponseStreamRaw(context.Context, map[string]interface{}) (llamastack.ResponseStreamIterator, error) {
	return c.stream, nil
}

func TestPassthroughErrorTraceID(t *testing.T) {
	app := &App{logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
	for _, enabled := range []bool{true, false} {
		t.Run(map[bool]string{true: "tracing enabled", false: "tracing disabled"}[enabled], func(t *testing.T) {
			ctx := errorTraceContext(t, enabled)
			client := &errorTracePassthroughClient{stream: lsmocks.NewMockStreamIterator([]responses.ResponseStreamEventUnion{{
				Type: "response.failed",
				Response: responses.Response{Error: responses.ResponseError{
					Code: "server_error", Message: "Upstream inference failed",
				}},
			}})}
			ctx = context.WithValue(ctx, constants.LlamaStackClientKey, client)
			req := httptest.NewRequest(http.MethodPost, "/responses/passthrough", strings.NewReader(`{"model":"test-model","input":"hello"}`)).WithContext(ctx)
			rr := httptest.NewRecorder()
			app.LlamaStackPassthroughResponseHandler(rr, req, nil)
			assert.Equal(t, http.StatusOK, rr.Code)
			assert.Contains(t, rr.Header().Get("Content-Type"), "text/event-stream")
			payload := strings.TrimPrefix(strings.SplitN(rr.Body.String(), "\n\n", 2)[0], "data: ")
			data := assertErrorTraceID(t, []byte(payload), ctx)
			assert.Equal(t, map[string]interface{}{
				"code": "server_error", "message": "Upstream inference failed",
			}, data["error"])
		})
	}
}
