package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2/responses"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
)

// LlamaStackPassthroughResponseHandler handles POST /api/v1/lsd/responses/passthrough
//
// This endpoint accepts a pre-built OGX API responses template as the request body
// and forwards it to OGX as-is — no transformation. It is designed for consumers
// (like AutoRAG) that already construct the full OGX API request format.
//
// The OGX connection is established via a K8s secret specified by the secretName
// query parameter (handled by AttachOGXClientFromSecret middleware).
func (app *App) LlamaStackPassthroughResponseHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	// Limit request body size to 1 MB (consistent with ReadJSON)
	const maxPassthroughBodyBytes int64 = 1_048_576
	r.Body = http.MaxBytesReader(w, r.Body, maxPassthroughBodyBytes)

	// Parse the raw request body — we treat it as an opaque JSON object
	var requestBody map[string]interface{}
	decoder := json.NewDecoder(r.Body)
	decoder.UseNumber()
	if err := decoder.Decode(&requestBody); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid JSON request body: %w", err))
		return
	}

	// Validate: reject store=true since server-side storage is not supported for passthrough
	if storeVal, ok := requestBody["store"]; ok {
		if storeBool, isBool := storeVal.(bool); isBool && storeBool {
			app.badRequestResponse(w, r, fmt.Errorf("server-side storage is not supported for passthrough requests"))
			return
		}
	}

	// Force streaming mode regardless of template value
	// TODO: Add non-streaming support for passthrough endpoint
	requestBody["stream"] = true

	// Get ready-to-use LlamaStack client from context
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("OGX client not available: %w", err))
		return
	}

	// Create streaming response via raw passthrough
	stream, err := client.CreateResponseStreamRaw(ctx, requestBody)
	if err != nil {
		app.handleLlamaStackClientError(w, r, err)
		return
	}
	defer stream.Close()

	startTime := time.Now()
	var firstTokenTime *time.Time
	var usage *UsageData

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported by client", http.StatusNotImplemented)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Use unified streaming function with custom error handler for response.failed
	if err := app.streamSSEEvents(StreamConfig{
		Stream:         stream,
		Context:        ctx,
		Logger:         logger,
		Flusher:        flusher,
		Writer:         w,
		StartTime:      startTime,
		FirstTokenTime: &firstTokenTime,
		Usage:          &usage,
		CustomErrorHandler: func(event responses.ResponseStreamEventUnion) (errorJSON []byte, shouldTerminate bool) {
			if failedErr := extractResponseFailedError(event); failedErr != "" {
				logger.Error("OGX upstream returned response.failed", "error", failedErr)
				errorData := map[string]interface{}{
					"error": map[string]interface{}{
						"code":    "server_error",
						"message": failedErr,
					},
				}
				errorJSON, _ := json.Marshal(errorData)
				return errorJSON, true
			}
			return nil, false
		},
		UseAdvancedErrorLogic: false,
	}); err != nil {
		logger.Error("Streaming failed", "error", err)
		return
	}

	// Send metrics event
	latencyMs := time.Since(startTime).Milliseconds()
	metricsEvent := MetricsEvent{
		Type: "response.metrics",
		Metrics: ResponseMetrics{
			LatencyMs:          latencyMs,
			TimeToFirstTokenMs: calculateTTFT(startTime, firstTokenTime),
			Usage:              usage,
		},
	}
	eventData, _ := json.Marshal(metricsEvent)
	fmt.Fprintf(w, "data: %s\n\n", eventData)
	flusher.Flush()
}

// extractResponseFailedError checks if a streaming event is a response.failed event
// and extracts the error message. Returns empty string for non-failed events.
func extractResponseFailedError(event responses.ResponseStreamEventUnion) string {
	if event.Type != "response.failed" {
		return ""
	}

	if msg := event.Response.Error.Message; msg != "" {
		return msg
	}

	return "upstream OGX server returned response.failed"
}
