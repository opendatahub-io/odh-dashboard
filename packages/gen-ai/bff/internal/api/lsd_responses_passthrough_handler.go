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
	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
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

	// Track start time for latency and TTFT calculation
	startTime := time.Now()
	var firstTokenTime *time.Time
	var usage *UsageData

	// Check if ResponseWriter supports streaming
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported by client", http.StatusNotImplemented)
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Stream events to client — reuse the same transformation pipeline as the regular handler
	for stream.Next() {
		// Check if client disconnected
		select {
		case <-ctx.Done():
			logger.Info("Client disconnected, stopping passthrough stream",
				"context_error", ctx.Err())
			return
		default:
		}

		event := stream.Current()

		// Check for response.failed events before the standard filter.
		// response.failed is NOT in supportedEventTypes — only the passthrough handler needs this.
		if failedErr := extractResponseFailedError(event); failedErr != "" {
			logger.Error("OGX upstream returned response.failed", "error", failedErr)
			errorData := map[string]interface{}{
				"error": map[string]interface{}{
					"code":    "server_error",
					"message": failedErr,
				},
			}
			errorJSON, marshalErr := json.Marshal(errorData)
			if marshalErr != nil {
				logger.Error("Failed to marshal error event", "error", marshalErr)
				fmt.Fprintf(w, "data: {\"error\":{\"message\":\"Internal error\"}}\n\n")
			} else {
				fmt.Fprintf(w, "data: %s\n\n", errorJSON)
			}
			flusher.Flush()
			return // Terminate the stream immediately
		}

		// Convert to clean streaming event (reuses existing filter + transform)
		streamingEvent := convertToStreamingEvent(event)
		if streamingEvent == nil {
			continue
		}

		// Track TTFT on first text delta event
		if streamingEvent.Type == "response.output_text.delta" && firstTokenTime == nil {
			now := time.Now()
			firstTokenTime = &now
		}

		// Extract usage and process citations from completed event
		if streamingEvent.Type == "response.completed" {
			usage = extractUsageFromEvent(event)
			if streamingEvent.Response != nil {
				processResponseCitations(streamingEvent.Response)
			}
		}

		eventData, err := json.Marshal(streamingEvent)
		if err != nil {
			logger.Error("Failed to marshal passthrough streaming event",
				"error", err,
				"event_type", streamingEvent.Type)
			continue
		}

		_, err = fmt.Fprintf(w, "data: %s\n\n", eventData)
		if err != nil {
			logger.Error("Failed to write passthrough streaming event", "error", err)
			return
		}
		flusher.Flush()
	}

	// Check for stream errors
	if err = stream.Err(); err != nil {
		logger.Error("Passthrough streaming error", "error", err)
		errorData := map[string]interface{}{
			"error": map[string]interface{}{
				"message": "Streaming error occurred",
				"code":    "500",
			},
		}
		errorJSON, marshalErr := json.Marshal(errorData)
		if marshalErr != nil {
			logger.Error("Failed to marshal error event", "error", marshalErr)
			fmt.Fprintf(w, "data: {\"error\":{\"message\":\"Streaming error occurred\"}}\n\n")
		} else {
			fmt.Fprintf(w, "data: %s\n\n", errorJSON)
		}
	}

	// Send metrics event after stream completes
	latencyMs := time.Since(startTime).Milliseconds()
	metricsEvent := MetricsEvent{
		Type: "response.metrics",
		Metrics: ResponseMetrics{
			LatencyMs:          latencyMs,
			TimeToFirstTokenMs: calculateTTFT(startTime, firstTokenTime),
			Usage:              usage,
		},
	}
	eventData, err := json.Marshal(metricsEvent)
	if err != nil {
		logger.Error("failed to marshal passthrough metrics event", "error", err)
		return
	}
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
