package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
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
		if writeErr := sendEvent(buildStreamingErrorEvent(code, message, "guardrails", retriable)); writeErr != nil {
			app.logger.Debug("Failed to write guardrail error event to client", "error", writeErr)
		}
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

	// When no output moderation, use regular streaming (no delta buffering)
	if !outputModeration {
		if err := app.streamSSEEvents(StreamConfig{
			Stream:                stream,
			Context:               ctx,
			Logger:                app.logger,
			Flusher:               flusher,
			Writer:                w,
			WriteMu:               &writeMu,
			StartTime:             startTime,
			FirstTokenTime:        &firstTokenTime,
			Usage:                 &usage,
			UseAdvancedErrorLogic: true,
		}); err != nil {
			app.logger.Error("Streaming failed", "error", err)
			return
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
		eventData, _ := json.Marshal(metricsEvent)
		if writeErr := sendEvent(eventData); writeErr != nil {
			app.logger.Debug("Failed to write metrics event to client", "error", writeErr)
		}
		return
	}

	// Output moderation: buffer chunks and moderate asynchronously
	modState := NewAsyncModerationState(ctx, app.logger)
	defer modState.Cancel()

	// Thread-safe helper to send multiple events
	sendEvents := func(events []*StreamingEvent) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		for _, event := range events {
			eventData, err := json.Marshal(event)
			if err != nil {
				continue
			}
			_, err = fmt.Fprintf(w, "data: %s\n\n", eventData)
			if err != nil {
				return err
			}
			flusher.Flush()
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

	defer func() {
		modState.Cancel()
		<-done
	}()

	// Current chunk being accumulated
	var currentChunk *ModerationChunk
	var wordCount int

	// Delta handler: buffer and chunk text for async moderation
	onDelta := func(event *StreamingEvent) ([]*StreamingEvent, bool, error) {
		// Check for violation
		select {
		case violation := <-violationChan:
			app.logger.Info("Output blocked by guardrails (async)", "reason", violation)
			sendGuardrailError("output blocked by safety guardrails", constants.GuardrailOutputViolationCode, false)
			return nil, false, nil // Terminate stream
		default:
		}

		// Initialize chunk if needed
		if currentChunk == nil {
			currentChunk = modState.CreateChunk()
		}

		currentChunk.Events = append(currentChunk.Events, event)
		currentChunk.Text += event.Delta
		wordCount += len(strings.Fields(event.Delta))

		// Check if we should trigger moderation
		if ShouldTriggerModeration(currentChunk.Text, wordCount) {
			modState.RegisterChunk(currentChunk)
			modState.ModerateChunkAsync(app, currentChunk, params.GuardrailOpts)
			currentChunk = nil
			wordCount = 0
		}

		return nil, true, nil // Buffer, don't send yet
	}

	// Flush handler: finalize pending chunk and wait for moderation
	onFlush := func() (bool, error) {
		// Finalize any pending chunk
		if currentChunk != nil && len(currentChunk.Events) > 0 {
			modState.RegisterChunk(currentChunk)
			modState.ModerateChunkAsync(app, currentChunk, params.GuardrailOpts)
			currentChunk = nil
			wordCount = 0
		}

		// Wait for all pending chunks to be moderated and sent
		if violation := modState.WaitForAllPending(sendEvents); violation != "" {
			app.logger.Info("Output blocked by guardrails (final check)", "reason", violation)
			sendGuardrailError("output blocked by safety guardrails", constants.GuardrailOutputViolationCode, false)
			return false, nil // Terminate
		}

		return true, nil
	}

	// Use unified streaming with delta buffering for async moderation
	if err := app.streamSSEEvents(StreamConfig{
		Stream:                stream,
		Context:               ctx,
		Logger:                app.logger,
		Flusher:               flusher,
		Writer:                w,
		WriteMu:               &writeMu,
		StartTime:             startTime,
		FirstTokenTime:        &firstTokenTime,
		Usage:                 &usage,
		OnDelta:               onDelta,
		OnFlush:               onFlush,
		UseAdvancedErrorLogic: true,
	}); err != nil {
		app.logger.Error("Streaming failed", "error", err)
		return
	}

	// Flush any remaining chunk after stream completes
	if currentChunk != nil && len(currentChunk.Events) > 0 {
		modState.RegisterChunk(currentChunk)
		modState.ModerateChunkAsync(app, currentChunk, params.GuardrailOpts)
	}

	// Final wait for all pending moderation
	if violation := modState.WaitForAllPending(sendEvents); violation != "" {
		app.logger.Info("Output blocked by guardrails (stream end)", "reason", violation)
		sendGuardrailError("output blocked by safety guardrails", constants.GuardrailOutputViolationCode, false)
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
	if writeErr := sendEvent(eventData); writeErr != nil {
		app.logger.Debug("Failed to write metrics event to client", "error", writeErr)
	}
}
