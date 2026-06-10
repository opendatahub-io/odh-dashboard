package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// DeltaEventHandler processes delta events (output_text.delta, reasoning_text.delta).
// Returns:
//   - sendNow: events to send immediately (nil for buffering, non-nil for pass-through)
//   - shouldContinue: false to terminate the stream (e.g., guardrail violation)
//   - error: non-nil to terminate with error
//
// Regular streaming: return ([]*StreamingEvent{event}, true, nil) to send immediately
// Async moderation: return (nil, true, nil) to buffer, then flush via OnFlush callback
type DeltaEventHandler func(event *StreamingEvent) (sendNow []*StreamingEvent, shouldContinue bool, err error)

// OnFlushHandler is called when non-delta events require flushing buffered chunks.
// Returns:
//   - shouldContinue: false to terminate (e.g., guardrail violation)
//   - error: non-nil to terminate with error
type OnFlushHandler func() (shouldContinue bool, err error)

// StreamConfig configures the unified SSE streaming function.
type StreamConfig struct {
	Stream  llamastack.ResponseStreamIterator
	Context context.Context
	Logger  *slog.Logger
	Flusher flusher
	Writer  writer
	WriteMu *sync.Mutex // Optional mutex for thread-safe writes

	// Timing (modified in-place)
	StartTime      time.Time
	FirstTokenTime **time.Time // Pointer to pointer so we can update caller's var
	Usage          **UsageData // Pointer to pointer so we can update caller's var

	// Optional delta handler for chunked streaming (async moderation)
	// If nil, delta events are sent immediately (regular streaming)
	OnDelta DeltaEventHandler

	// Optional flush handler (called before sending completion/content_part.done events)
	// Only used when OnDelta is provided
	OnFlush OnFlushHandler

	// Custom error handler (called BEFORE standard error checks)
	// Return (errorJSON, shouldTerminate) to override default behavior
	CustomErrorHandler func(event responses.ResponseStreamEventUnion) (errorJSON []byte, shouldTerminate bool)

	// Use advanced error logic for stream.Err() (extractStreamingError vs simple envelope)
	UseAdvancedErrorLogic bool
}

// flusher interface allows mocking http.Flusher in tests
type flusher interface {
	Flush()
}

// writer interface allows mocking http.ResponseWriter in tests
type writer interface {
	Write([]byte) (int, error)
}

// streamSSEEvents is the unified SSE streaming handler.
// Handles both regular streaming and async moderation streaming via pluggable callbacks.
//
// Regular streaming: pass OnDelta=nil, delta events are sent immediately
// Async moderation: pass OnDelta callback to buffer chunks, OnFlush to finalize
func (app *App) streamSSEEvents(cfg StreamConfig) error {
	stream := cfg.Stream
	ctx := cfg.Context
	logger := cfg.Logger

	// Thread-safe event sender
	sendEvent := func(data []byte) error {
		if cfg.WriteMu != nil {
			cfg.WriteMu.Lock()
			defer cfg.WriteMu.Unlock()
		}
		_, err := fmt.Fprintf(cfg.Writer, "data: %s\n\n", data)
		if err != nil {
			return err
		}
		cfg.Flusher.Flush()
		return nil
	}

	// Helper to send multiple events
	sendEvents := func(events []*StreamingEvent) error {
		for _, event := range events {
			eventData, err := json.Marshal(event)
			if err != nil {
				continue
			}
			if err := sendEvent(eventData); err != nil {
				return err
			}
		}
		return nil
	}

	// Main streaming loop
	for stream.Next() {
		// Check for client disconnect
		select {
		case <-ctx.Done():
			logger.Info("Client disconnected, stopping stream processing")
			return ctx.Err()
		default:
		}

		event := stream.Current()

		// Allow custom error handling (e.g., passthrough's response.failed check)
		if cfg.CustomErrorHandler != nil {
			if errorJSON, shouldTerminate := cfg.CustomErrorHandler(event); shouldTerminate {
				_ = sendEvent(errorJSON)
				return nil
			}
		}

		// Intercept OGX error events (type: "error")
		if event.Type == "error" {
			logger.Error("OGX error event received", "code", event.Code, "message", event.Message)
			component := llamastack.ResolveComponent(event.Code)
			statusCode, err := strconv.Atoi(event.Code)
			if err != nil {
				statusCode = 0
			}
			retriable := app.isRetriable(event.Code, statusCode)
			errorJSON := buildStreamingErrorEvent(event.Code, event.Message, component, retriable)
			_ = sendEvent(errorJSON)
			return nil
		}

		// Convert to clean streaming event
		streamingEvent := convertToStreamingEvent(event)
		if streamingEvent == nil {
			continue
		}

		// Intercept response.failed
		if streamingEvent.Type == "response.failed" {
			errorCode := string(event.Response.Error.Code)
			errorMessage := event.Response.Error.Message
			if errorMessage == "" {
				errorMessage = "Response generation failed"
			}
			logger.Error("Response failed event received", "code", errorCode, "message", errorMessage)
			component := llamastack.ResolveComponent(errorCode)
			retriable := app.isRetriable(errorCode, 0)
			errorJSON := buildStreamingErrorEvent(errorCode, errorMessage, component, retriable)
			_ = sendEvent(errorJSON)
			return nil
		}

		// Track TTFT on first answer token (reasoning tokens excluded)
		if streamingEvent.Type == "response.output_text.delta" && *cfg.FirstTokenTime == nil {
			now := time.Now()
			*cfg.FirstTokenTime = &now
		}

		// Handle delta events (output_text.delta, reasoning_text.delta)
		isDelta := streamingEvent.Type == "response.output_text.delta" || streamingEvent.Type == "response.reasoning_text.delta"
		if isDelta {
			if cfg.OnDelta != nil {
				// Async moderation path: buffer and chunk
				toSend, shouldContinue, err := cfg.OnDelta(streamingEvent)
				if err != nil {
					return err
				}
				if !shouldContinue {
					return nil
				}
				if toSend != nil {
					if err := sendEvents(toSend); err != nil {
						return err
					}
				}
			} else {
				// Regular streaming: send immediately
				eventData, err := json.Marshal(streamingEvent)
				if err != nil {
					logger.Error("Failed to marshal streaming event",
						"error", err,
						"event_type", streamingEvent.Type,
						"item_id", streamingEvent.ItemID,
						"sequence", streamingEvent.SequenceNumber)
					continue
				}
				if err := sendEvent(eventData); err != nil {
					logger.Error("Failed to write streaming event", "error", err)
					return err
				}
			}
			continue
		}

		// Non-delta events: flush any buffered chunks first
		if cfg.OnFlush != nil {
			shouldContinue, err := cfg.OnFlush()
			if err != nil {
				return err
			}
			if !shouldContinue {
				return nil
			}
		}

		// Handle response.created (send immediately, not moderated)
		if streamingEvent.Type == "response.created" {
			eventData, err := json.Marshal(streamingEvent)
			if err != nil {
				logger.Error("Failed to marshal response.created event", "error", err)
				continue
			}
			_ = sendEvent(eventData) // Best effort - client may have disconnected
			continue
		}

		// Handle response.content_part.added (send immediately)
		if streamingEvent.Type == "response.content_part.added" {
			eventData, err := json.Marshal(streamingEvent)
			if err != nil {
				logger.Error("Failed to marshal content_part.added event", "error", err)
				continue
			}
			_ = sendEvent(eventData) // Best effort - client may have disconnected
			continue
		}

		// Extract usage and process citations on completion
		if streamingEvent.Type == "response.completed" {
			*cfg.Usage = extractUsageFromEvent(event)
			if streamingEvent.Response != nil {
				processResponseCitations(streamingEvent.Response)
			}
		}

		// Send the event (completion, content_part.done, etc.)
		eventData, err := json.Marshal(streamingEvent)
		if err != nil {
			logger.Error("Failed to marshal streaming event", "error", err)
			continue
		}
		_ = sendEvent(eventData)
	}

	// Final flush for any remaining buffered chunks
	if cfg.OnFlush != nil {
		if _, err := cfg.OnFlush(); err != nil {
			return err
		}
	}

	// Check for stream errors
	if err := stream.Err(); err != nil {
		logger.Error("Streaming error", "error", err, "error_type", fmt.Sprintf("%T", err))
		var errorJSON []byte
		if cfg.UseAdvancedErrorLogic {
			message, code, component, retriable := app.extractStreamingError(err)
			errorJSON = buildStreamingErrorEvent(code, message, component, retriable)
		} else {
			errorData := map[string]interface{}{
				"error": map[string]interface{}{
					"message": "Streaming error occurred",
					"code":    "500",
				},
			}
			errorJSON, _ = json.Marshal(errorData)
		}
		_ = sendEvent(errorJSON)
	}

	return nil
}
