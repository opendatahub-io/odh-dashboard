package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/nemo"
)

// ModerationChunk represents a chunk of text awaiting or completed moderation
type ModerationChunk struct {
	SequenceNum     int               // Order in which this chunk was created
	Events          []*StreamingEvent // Buffered streaming events for this chunk
	Text            string            // Accumulated text for moderation
	Moderated       bool              // Has moderation completed?
	Safe            bool              // Did it pass moderation?
	ViolationReason string            // If flagged, the reason why
}

// AsyncModerationResult represents the result of an async moderation check
type AsyncModerationResult struct {
	SequenceNum     int
	Safe            bool
	ViolationReason string
	Err             error
}

// AsyncModerationState manages the async moderation queue with proper ordering
type AsyncModerationState struct {
	mu           sync.Mutex
	chunks       map[int]*ModerationChunk // All chunks indexed by sequence number
	nextToSend   int                      // Next sequence number to send to client
	nextChunkSeq int                      // Next sequence number to assign to new chunk
	resultChan   chan AsyncModerationResult
	ctx          context.Context
	cancel       context.CancelFunc
	logger       Logger
}

// Logger interface for dependency injection
type Logger interface {
	Debug(msg string, args ...interface{})
	Info(msg string, args ...interface{})
	Warn(msg string, args ...interface{})
	Error(msg string, args ...interface{})
}

// NewAsyncModerationState creates a new async moderation state manager
func NewAsyncModerationState(ctx context.Context, logger Logger) *AsyncModerationState {
	modCtx, cancel := context.WithCancel(ctx)
	return &AsyncModerationState{
		chunks:       make(map[int]*ModerationChunk),
		nextToSend:   0,
		nextChunkSeq: 0,
		resultChan:   make(chan AsyncModerationResult, constants.AsyncModerationResultBufferSize),
		ctx:          modCtx,
		cancel:       cancel,
		logger:       logger,
	}
}

// Cancel cancels all pending moderation operations
func (s *AsyncModerationState) Cancel() {
	s.cancel()
}

// Context returns the moderation context
func (s *AsyncModerationState) Context() context.Context {
	return s.ctx
}

// CreateChunk creates a new moderation chunk and returns it
func (s *AsyncModerationState) CreateChunk() *ModerationChunk {
	s.mu.Lock()
	defer s.mu.Unlock()

	chunk := &ModerationChunk{
		SequenceNum: s.nextChunkSeq,
		Events:      make([]*StreamingEvent, 0),
	}
	s.nextChunkSeq++
	return chunk
}

// RegisterChunk adds a chunk to the pending map for tracking
func (s *AsyncModerationState) RegisterChunk(chunk *ModerationChunk) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.chunks[chunk.SequenceNum] = chunk
	s.logger.Debug("Registered chunk for moderation",
		"sequence", chunk.SequenceNum,
		"wordCount", len(strings.Fields(chunk.Text)))
}

// ModerateChunkAsync fires off a moderation request asynchronously.
// opts is the guardrail config to use; output moderation always runs as RoleAssistant.
func (s *AsyncModerationState) ModerateChunkAsync(app *App, chunk *ModerationChunk, opts nemo.GuardrailsOptions) {
	go func() {
		result := AsyncModerationResult{SequenceNum: chunk.SequenceNum}

		// Check if context is already cancelled
		select {
		case <-s.ctx.Done():
			return
		default:
		}

		modResult, err := app.checkModeration(s.ctx, []nemo.Message{{Role: nemo.RoleAssistant, Content: chunk.Text}}, opts)
		if err != nil {
			s.logger.Error("Async moderation check failed, blocking chunk",
				"error", err,
				"chunk", chunk.SequenceNum)
			result.Safe = false
			result.ViolationReason = "guardrail service error"
			result.Err = err
		} else if modResult.Flagged {
			result.Safe = false
			result.ViolationReason = modResult.ViolationReason
			s.logger.Info("Chunk flagged by moderation",
				"chunk", chunk.SequenceNum,
				"reason", modResult.ViolationReason)
		} else {
			result.Safe = true
		}

		// Send result to channel (non-blocking with context check)
		select {
		case s.resultChan <- result:
		case <-s.ctx.Done():
			// Context cancelled, don't send
		}
	}()
}

// ProcessResults processes moderation results and sends ready chunks in order.
// Returns violation reason if content was flagged, empty string otherwise.
// This should be called in a goroutine.
func (s *AsyncModerationState) ProcessResults(sendFunc func([]*StreamingEvent) error) (violationReason string) {
	for {
		select {
		case <-s.ctx.Done():
			return ""
		case result := <-s.resultChan:
			s.mu.Lock()

			// Update chunk with result
			if chunk, ok := s.chunks[result.SequenceNum]; ok {
				chunk.Moderated = true
				chunk.Safe = result.Safe
				chunk.ViolationReason = result.ViolationReason
			}

			// Check if flagged - stop everything
			if !result.Safe {
				s.mu.Unlock()
				s.cancel() // Cancel all pending operations
				return result.ViolationReason
			}

			// Try to send all consecutive ready chunks
			if err := s.sendReadyChunksLocked(sendFunc); err != nil {
				s.logger.Error("Failed to send ready chunks", "error", err)
				s.mu.Unlock()
				s.cancel()
				return ""
			}

			s.mu.Unlock()
		}
	}
}

// sendReadyChunksLocked sends all consecutive chunks that are ready (moderated & safe)
// Must be called with lock held
func (s *AsyncModerationState) sendReadyChunksLocked(sendFunc func([]*StreamingEvent) error) error {
	for {
		chunk, ok := s.chunks[s.nextToSend]
		if !ok {
			// Chunk doesn't exist yet - waiting for more chunks
			break
		}
		if !chunk.Moderated {
			// Chunk not moderated yet - wait for result
			break
		}
		if !chunk.Safe {
			// Should have been caught in ProcessResults, but safety check
			break
		}

		// Send this chunk's events
		if len(chunk.Events) > 0 {
			if err := sendFunc(chunk.Events); err != nil {
				return err
			}
			s.logger.Debug("Sent chunk events",
				"sequence", chunk.SequenceNum,
				"eventCount", len(chunk.Events))
		}

		// Clean up and advance
		delete(s.chunks, s.nextToSend)
		s.nextToSend++
	}
	return nil
}

// WaitForAllPending waits for all pending chunks to be processed.
// Returns violation reason if content was flagged.
func (s *AsyncModerationState) WaitForAllPending(sendFunc func([]*StreamingEvent) error) (violationReason string) {
	for {
		s.mu.Lock()

		// Check for violations
		for _, chunk := range s.chunks {
			if chunk.Moderated && !chunk.Safe {
				violation := chunk.ViolationReason
				s.mu.Unlock()
				return violation
			}
		}

		// Check if done
		if len(s.chunks) == 0 {
			s.mu.Unlock()
			return ""
		}
		s.mu.Unlock()

		// Context cancelled or brief sleep
		select {
		case <-s.ctx.Done():
			return ""
		default:
			time.Sleep(5 * time.Millisecond)
		}
	}
}

// HasPendingChunks returns true if there are chunks waiting to be sent
func (s *AsyncModerationState) HasPendingChunks() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.chunks) > 0
}

// FlushPendingChunks sends any pending chunks that have been moderated.
// Returns violation reason if any content was flagged.
func (s *AsyncModerationState) FlushPendingChunks(sendFunc func([]*StreamingEvent) error) (violationReason string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check all chunks for violations first
	for _, chunk := range s.chunks {
		if chunk.Moderated && !chunk.Safe {
			return chunk.ViolationReason
		}
	}

	// Send all ready chunks
	if err := s.sendReadyChunksLocked(sendFunc); err != nil {
		s.logger.Error("Failed to flush pending chunks", "error", err)
	}

	return ""
}

// handleStreamingResponseWithModeration handles streaming response with guardrails moderation
func (app *App) handleStreamingResponseWithModeration(w http.ResponseWriter, r *http.Request, ctx context.Context, params llamastack.CreateResponseParams, inputMessages []nemo.Message) {
	// Track start time for latency and TTFT calculation
	startTime := time.Now()
	var firstTokenTime *time.Time
	var usage *UsageData

	// Check if ResponseWriter supports streaming - fail fast if not
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported by client", http.StatusNotImplemented)
		return
	}

	// Create streaming response
	stream, err := app.repositories.Responses.CreateResponseStream(ctx, params)
	if err != nil {
		app.handleLlamaStackClientError(w, r, err)
		return
	}
	defer stream.Close()

	// Set SSE headers only after successful stream creation
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Mutex for thread-safe writes to response writer
	var writeMu sync.Mutex

	// Start heartbeat to keep the connection alive through HAProxy during slow operations
	hb := newSSEHeartbeat(w, flusher, &writeMu, app.logger)
	go hb.start(ctx)
	defer hb.stop()

	// Helper to send SSE event (thread-safe)
	sendEvent := func(eventData []byte) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		_, err := fmt.Fprintf(w, "data: %s\n\n", eventData)
		if err != nil {
			return err
		}
		flusher.Flush()
		return nil
	}

	sendGuardrailError := func(message string, code string, retriable bool) {
		_ = sendEvent(buildStreamingErrorEvent(code, message, "guardrails", retriable))
	}

	// Run input moderation after heartbeat is active (prevents HAProxy timeout)
	if len(inputMessages) > 0 {
		flagged, _, modErr := app.checkInputModeration(ctx, inputMessages, params.GuardrailOpts)
		if modErr != nil {
			sendGuardrailError("guardrail service unavailable", constants.GuardrailServiceUnavailableCode, true)
			return
		}
		if flagged {
			sendGuardrailError("input blocked by safety guardrails", constants.GuardrailInputViolationCode, false)
			return
		}
	}

	outputModeration := hasOutputModeration(params.GuardrailOpts)

	// When no output moderation, stream events directly to the client
	if !outputModeration {
		for stream.Next() {
			select {
			case <-ctx.Done():
				app.logger.Info("Client disconnected, stopping stream processing")
				return
			default:
			}

			event := stream.Current()
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

			if eventData, err := json.Marshal(streamingEvent); err == nil {
				_ = sendEvent(eventData) // Best effort - client may have disconnected
			}
		}

		if err := stream.Err(); err != nil {
			app.logger.Error("Streaming error", "error", err, "error_type", fmt.Sprintf("%T", err))
			message, code, component, retriable := app.extractStreamingError(err)
			_ = sendEvent(buildStreamingErrorEvent(code, message, component, retriable))
		}

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
			app.logger.Error("failed to marshal metrics event", "error", err)
			return
		}
		_ = sendEvent(eventData)
		return
	}

	// Output moderation: buffer chunks and moderate asynchronously
	modState := NewAsyncModerationState(ctx, app.logger)
	defer modState.Cancel()

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

	// Channel to signal guardrail violation from result processor
	violationChan := make(chan string, 1)
	done := make(chan struct{})

	// Start the result processor goroutine
	go func() {
		defer close(done)
		if violation := modState.ProcessResults(sendEvents); violation != "" {
			select {
			case violationChan <- violation:
			default:
			}
		}
	}()

	// Ensure the result processor goroutine is cleaned up on all exit paths
	// (error returns, guardrail violations, normal completion).
	defer func() {
		modState.Cancel()
		<-done
	}()

	// Current chunk being accumulated
	var currentChunk *ModerationChunk
	var wordCount int

	// Main streaming loop
	for stream.Next() {
		// Check if client disconnected or violation detected
		select {
		case <-ctx.Done():
			app.logger.Info("Client disconnected, stopping stream processing")
			return
		case violation := <-violationChan:
			app.logger.Info("Output blocked by guardrails (async)",
				"reason", violation)
			sendGuardrailError("output blocked by safety guardrails", constants.GuardrailOutputViolationCode, false)
			return
		default:
			// Continue processing
		}

		event := stream.Current()

		// Intercept OGX error events before convertToStreamingEvent filters them out.
		// event.Code may be an HTTP status string (e.g. "404", "500") or a named error
		// code (e.g. "timeout", "server_error"). Parse it so isRetriable can apply the
		// 429/5xx fallback for HTTP statuses.
		if event.Type == "error" {
			app.logger.Error("OGX error event received", "code", event.Code, "message", event.Message)
			component := llamastack.ResolveComponent(event.Code)
			statusCode, err := strconv.Atoi(event.Code)
			if err != nil {
				// event.Code is not an HTTP status - isRetriable will match via code switch
				statusCode = 0
			}
			retriable := app.isRetriable(event.Code, statusCode)
			_ = sendEvent(buildStreamingErrorEvent(event.Code, event.Message, component, retriable))
			return
		}

		// Convert to clean streaming event
		streamingEvent := convertToStreamingEvent(event)
		if streamingEvent == nil {
			continue
		}

		// Intercept response.failed — extract error details from the raw SDK event
		if streamingEvent.Type == "response.failed" {
			errorCode := string(event.Response.Error.Code)
			errorMessage := event.Response.Error.Message
			if errorMessage == "" {
				errorMessage = "Response generation failed"
			}
			app.logger.Error("Response failed event received", "code", errorCode, "message", errorMessage)
			component := llamastack.ResolveComponent(errorCode)
			retriable := app.isRetriable(errorCode, 0)
			_ = sendEvent(buildStreamingErrorEvent(errorCode, errorMessage, component, retriable))
			return
		}

		// Send response.created immediately (not moderated)
		if streamingEvent.Type == "response.created" {
			if eventData, err := json.Marshal(streamingEvent); err == nil {
				_ = sendEvent(eventData) // Best effort - client may have disconnected
			}
			continue
		}

		// Handle output moderation for text and reasoning delta events
		if (streamingEvent.Type == "response.output_text.delta" || streamingEvent.Type == "response.reasoning_text.delta") && streamingEvent.Delta != "" {
			// TTFT tracks first answer token only — reasoning tokens are excluded
			if streamingEvent.Type == "response.output_text.delta" && firstTokenTime == nil {
				now := time.Now()
				firstTokenTime = &now
			}

			// Initialize chunk if needed
			if currentChunk == nil {
				currentChunk = modState.CreateChunk()
			}

			currentChunk.Events = append(currentChunk.Events, streamingEvent)
			currentChunk.Text += streamingEvent.Delta
			wordCount += len(strings.Fields(streamingEvent.Delta))

			// Check if we should trigger moderation
			if ShouldTriggerModeration(currentChunk.Text, wordCount) {
				// Register and fire async moderation
				modState.RegisterChunk(currentChunk)
				modState.ModerateChunkAsync(app, currentChunk, params.GuardrailOpts)

				// Reset for next chunk
				currentChunk = nil
				wordCount = 0
			}
			continue
		}

		// For non-delta events (content_part.added, content_part.done, completed)
		// First, finalize any pending chunk
		if currentChunk != nil && len(currentChunk.Events) > 0 {
			modState.RegisterChunk(currentChunk)
			modState.ModerateChunkAsync(app, currentChunk, params.GuardrailOpts)
			currentChunk = nil
			wordCount = 0
		}

		// For content_part.added, send immediately (before text deltas)
		if streamingEvent.Type == "response.content_part.added" {
			if eventData, err := json.Marshal(streamingEvent); err == nil {
				_ = sendEvent(eventData) // Best effort - client may have disconnected
			}
			continue
		}

		// For content_part.done, reasoning_text.done, and response.completed, wait for all pending moderation
		if streamingEvent.Type == "response.content_part.done" || streamingEvent.Type == "response.reasoning_text.done" || streamingEvent.Type == "response.completed" {
			// Wait for all pending chunks to be moderated and sent
			if violation := modState.WaitForAllPending(sendEvents); violation != "" {
				app.logger.Info("Output blocked by guardrails (final check)",
					"reason", violation)
				sendGuardrailError("output blocked by safety guardrails", constants.GuardrailOutputViolationCode, false)
				return
			}

			// Process citation markers in the completed response.
			// NOTE: Async moderation chunks accumulated before this point contain
			// raw citation markers (<|uuid|>). This is low-risk because markers are
			// structured tokens that guardrail models won't misinterpret as harmful.
			if streamingEvent.Type == "response.completed" {
				usage = extractUsageFromEvent(event)
				if streamingEvent.Response != nil {
					processResponseCitations(streamingEvent.Response)
				}
			}

			// Now send the completion event
			if eventData, err := json.Marshal(streamingEvent); err == nil {
				_ = sendEvent(eventData) // Best effort - client may have disconnected
			}
		}
	}

	// Flush any remaining chunk
	if currentChunk != nil && len(currentChunk.Events) > 0 {
		modState.RegisterChunk(currentChunk)
		modState.ModerateChunkAsync(app, currentChunk, params.GuardrailOpts)
	}

	// Wait for all pending moderation to complete
	if violation := modState.WaitForAllPending(sendEvents); violation != "" {
		app.logger.Info("Output blocked by guardrails (stream end)",
			"reason", violation)
		sendGuardrailError("output blocked by safety guardrails", constants.GuardrailOutputViolationCode, false)
		return
	}

	// Check for stream errors (transport-level: connection drops, malformed SSE)
	if err := stream.Err(); err != nil {
		app.logger.Error("Streaming error", "error", err, "error_type", fmt.Sprintf("%T", err))
		message, code, component, retriable := app.extractStreamingError(err)
		_ = sendEvent(buildStreamingErrorEvent(code, message, component, retriable))
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
		app.logger.Error("failed to marshal metrics event", "error", err)
		return
	}
	_ = sendEvent(eventData)
}
