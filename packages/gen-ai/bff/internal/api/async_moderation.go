package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/openai/openai-go/v2/packages/ssestream"
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
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

// ModerateChunkAsync fires off a moderation request asynchronously
func (s *AsyncModerationState) ModerateChunkAsync(app *App, chunk *ModerationChunk, shieldID string) {
	go func() {
		result := AsyncModerationResult{SequenceNum: chunk.SequenceNum}

		// Check if context is already cancelled
		select {
		case <-s.ctx.Done():
			return
		default:
		}

		modResult, err := app.checkModeration(s.ctx, chunk.Text, shieldID)
		if err != nil {
			// Fail open - treat as safe if moderation service is unavailable
			s.logger.Warn("Async moderation failed, treating as safe",
				"error", err,
				"chunk", chunk.SequenceNum)
			result.Safe = true
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

// handleStreamingResponseAsync handles streaming response with async moderation
func (app *App) handleStreamingResponseAsync(w http.ResponseWriter, r *http.Request, ctx context.Context, params llamastack.CreateResponseParams) {
	// Check if ResponseWriter supports streaming - fail fast if not
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported by client", http.StatusNotImplemented)
		return
	}

	// Create streaming response
	stream, err := app.repositories.Responses.CreateResponseStream(ctx, params)
	if err != nil {
		// Check if this is a mock streaming error - delegate to mock client
		if _, ok := err.(*lsmocks.MockStreamError); ok {
			if client, clientErr := app.repositories.Responses.GetClient(r.Context()); clientErr == nil {
				if mockClient, ok := client.(*lsmocks.MockLlamaStackClient); ok {
					mockClient.HandleMockStreaming(ctx, w, flusher, params)
					return
				}
			}
		}
		// Check if this is a model not found error
		if ModelNotFoundError(err) {
			app.modelNotFoundResponse(w, r, params.Model)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}
	defer stream.Close()

	// Set SSE headers only after successful stream creation
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	moderationEnabled := params.OutputShieldID != ""

	// If moderation is disabled, use the simple streaming path
	if !moderationEnabled {
		app.streamWithoutModeration(w, flusher, stream, ctx)
		return
	}

	// Initialize async moderation state
	modState := NewAsyncModerationState(ctx, app.logger)
	defer modState.Cancel()

	// Track response metadata for guardrail violation reporting
	var responseID, responseModel, currentItemID string
	var lastSequenceNum int64

	// Mutex for thread-safe writes to response writer
	var writeMu sync.Mutex

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

	// Helper to send guardrail violation in streaming format
	sendGuardrailViolation := func(violationReason string) {
		message := constants.GuardrailViolationMessage
		if violationReason != "" {
			message = violationReason
		}

		// Send guardrail violation message as delta
		violationEvent := &StreamingEvent{
			Type:           "response.output_text.delta",
			SequenceNumber: lastSequenceNum,
			ItemID:         currentItemID,
			OutputIndex:    0,
			Delta:          message,
		}
		if eventData, err := json.Marshal(violationEvent); err == nil {
			_ = sendEvent(eventData) // Best effort - client may have disconnected
		}

		// Send content part done
		doneEvent := &StreamingEvent{
			Type:           "response.content_part.done",
			SequenceNumber: lastSequenceNum + 1,
			ItemID:         currentItemID,
			OutputIndex:    0,
		}
		if eventData, err := json.Marshal(doneEvent); err == nil {
			_ = sendEvent(eventData) // Best effort - client may have disconnected
		}

		// Send response completed with guardrail flag
		completedEvent := map[string]interface{}{
			"type":            "response.completed",
			"sequence_number": 0,
			"item_id":         "",
			"output_index":    0,
			"delta":           "",
			"response": map[string]interface{}{
				"id":                  responseID,
				"model":               responseModel,
				"status":              "completed",
				"created_at":          0,
				"guardrail_triggered": true,
				"violation_reason":    violationReason,
				"output": []map[string]interface{}{
					{
						"id":     currentItemID,
						"type":   "message",
						"role":   "assistant",
						"status": "completed",
						"content": []map[string]interface{}{
							{
								"type": "output_text",
								"text": message,
							},
						},
					},
				},
			},
		}
		if eventData, err := json.Marshal(completedEvent); err == nil {
			_ = sendEvent(eventData) // Best effort - client may have disconnected
		}
	}

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
				"shield_id", params.OutputShieldID,
				"reason", violation)
			sendGuardrailViolation(violation)
			return
		default:
			// Continue processing
		}

		event := stream.Current()

		// Convert to clean streaming event
		streamingEvent := convertToStreamingEvent(event)
		if streamingEvent == nil {
			continue
		}

		// Track metadata from response.created event
		if streamingEvent.Type == "response.created" && streamingEvent.Response != nil {
			responseID = streamingEvent.Response.ID
			responseModel = streamingEvent.Response.Model
			// Send response.created immediately (not moderated)
			if eventData, err := json.Marshal(streamingEvent); err == nil {
				_ = sendEvent(eventData) // Best effort - client may have disconnected
			}
			continue
		}

		// Track item ID and sequence number
		if streamingEvent.ItemID != "" {
			currentItemID = streamingEvent.ItemID
		}
		lastSequenceNum = streamingEvent.SequenceNumber

		// Handle output moderation for text delta events
		if streamingEvent.Type == "response.output_text.delta" && streamingEvent.Delta != "" {
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
				modState.ModerateChunkAsync(app, currentChunk, params.OutputShieldID)

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
			modState.ModerateChunkAsync(app, currentChunk, params.OutputShieldID)
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

		// For content_part.done and response.completed, wait for all pending moderation
		if streamingEvent.Type == "response.content_part.done" || streamingEvent.Type == "response.completed" {
			// Wait for all pending chunks to be moderated and sent
			if violation := modState.WaitForAllPending(sendEvents); violation != "" {
				app.logger.Info("Output blocked by guardrails (final check)",
					"shield_id", params.OutputShieldID,
					"reason", violation)
				sendGuardrailViolation(violation)
				return
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
		modState.ModerateChunkAsync(app, currentChunk, params.OutputShieldID)
	}

	// Wait for all pending moderation to complete
	if violation := modState.WaitForAllPending(sendEvents); violation != "" {
		app.logger.Info("Output blocked by guardrails (stream end)",
			"shield_id", params.OutputShieldID,
			"reason", violation)
		sendGuardrailViolation(violation)
		return
	}

	// Cancel the result processor and wait for it to finish
	modState.Cancel()
	<-done

	// Check for stream errors
	if err := stream.Err(); err != nil {
		app.logger.Error("Streaming error", "error", err)
		errorData := map[string]interface{}{
			"error": map[string]interface{}{
				"message": "Streaming error occurred",
				"code":    "500",
			},
		}
		errorJSON, _ := json.Marshal(errorData)
		fmt.Fprintf(w, "data: %s\n\n", errorJSON)
	}
}

// streamWithoutModeration handles streaming when moderation is disabled
func (app *App) streamWithoutModeration(w http.ResponseWriter, flusher http.Flusher, stream *ssestream.Stream[responses.ResponseStreamEventUnion], ctx context.Context) {
	sendEvent := func(eventData []byte) error {
		_, err := fmt.Fprintf(w, "data: %s\n\n", eventData)
		if err != nil {
			return err
		}
		flusher.Flush()
		return nil
	}

	for stream.Next() {
		select {
		case <-ctx.Done():
			app.logger.Info("Client disconnected, stopping stream processing",
				"context_error", ctx.Err())
			return
		default:
		}

		event := stream.Current()
		streamingEvent := convertToStreamingEvent(event)
		if streamingEvent == nil {
			continue
		}

		eventData, err := json.Marshal(streamingEvent)
		if err != nil {
			continue
		}

		if err := sendEvent(eventData); err != nil {
			app.logger.Error("Failed to write streaming event", "error", err)
			return
		}
	}

	if err := stream.Err(); err != nil {
		app.logger.Error("Streaming error", "error", err)
		errorData := map[string]interface{}{
			"error": map[string]interface{}{
				"message": "Streaming error occurred",
				"code":    "500",
			},
		}
		errorJSON, _ := json.Marshal(errorData)
		fmt.Fprintf(w, "data: %s\n\n", errorJSON)
	}
}
