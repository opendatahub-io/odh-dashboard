package api

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockLogger implements the Logger interface for testing
type mockLogger struct {
	debugMessages []string
	infoMessages  []string
	warnMessages  []string
	errorMessages []string
	mu            sync.Mutex
}

func newMockLogger() *mockLogger {
	return &mockLogger{
		debugMessages: make([]string, 0),
		infoMessages:  make([]string, 0),
		warnMessages:  make([]string, 0),
		errorMessages: make([]string, 0),
	}
}

func (m *mockLogger) Debug(msg string, args ...interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.debugMessages = append(m.debugMessages, msg)
}

func (m *mockLogger) Info(msg string, args ...interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.infoMessages = append(m.infoMessages, msg)
}

func (m *mockLogger) Warn(msg string, args ...interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.warnMessages = append(m.warnMessages, msg)
}

func (m *mockLogger) Error(msg string, args ...interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.errorMessages = append(m.errorMessages, msg)
}

func TestNewAsyncModerationState(t *testing.T) {
	ctx := context.Background()
	logger := newMockLogger()

	state := NewAsyncModerationState(ctx, logger)
	defer state.Cancel()

	assert.NotNil(t, state)
	assert.NotNil(t, state.chunks)
	assert.NotNil(t, state.resultChan)
	assert.Equal(t, 0, state.nextToSend)
	assert.Equal(t, 0, state.nextChunkSeq)
}

func TestCreateChunk(t *testing.T) {
	ctx := context.Background()
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)
	defer state.Cancel()

	// Create first chunk
	chunk1 := state.CreateChunk()
	assert.Equal(t, 0, chunk1.SequenceNum)
	assert.Empty(t, chunk1.Events)
	assert.Empty(t, chunk1.Text)
	assert.False(t, chunk1.Moderated)
	assert.False(t, chunk1.Safe)

	// Create second chunk
	chunk2 := state.CreateChunk()
	assert.Equal(t, 1, chunk2.SequenceNum)

	// Create third chunk
	chunk3 := state.CreateChunk()
	assert.Equal(t, 2, chunk3.SequenceNum)

	// Verify sequence numbers are incremented
	assert.Equal(t, 3, state.nextChunkSeq)
}

func TestRegisterChunk(t *testing.T) {
	ctx := context.Background()
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)
	defer state.Cancel()

	chunk := state.CreateChunk()
	chunk.Text = "This is a test sentence."
	chunk.Events = []*StreamingEvent{
		{Type: "response.output_text.delta", Delta: "This is a test sentence."},
	}

	state.RegisterChunk(chunk)

	// Verify chunk is registered
	state.mu.Lock()
	registeredChunk, ok := state.chunks[0]
	state.mu.Unlock()

	assert.True(t, ok)
	assert.Equal(t, chunk, registeredChunk)
}

func TestChunkOrdering_InOrder(t *testing.T) {
	ctx := context.Background()
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)
	defer state.Cancel()

	var sentEvents []*StreamingEvent
	var mu sync.Mutex

	sendFunc := func(events []*StreamingEvent) error {
		mu.Lock()
		defer mu.Unlock()
		sentEvents = append(sentEvents, events...)
		return nil
	}

	// Create and register chunks
	chunk0 := state.CreateChunk()
	chunk0.Text = "First sentence."
	chunk0.Events = []*StreamingEvent{{Delta: "First sentence."}}
	state.RegisterChunk(chunk0)

	chunk1 := state.CreateChunk()
	chunk1.Text = "Second sentence."
	chunk1.Events = []*StreamingEvent{{Delta: "Second sentence."}}
	state.RegisterChunk(chunk1)

	chunk2 := state.CreateChunk()
	chunk2.Text = "Third sentence."
	chunk2.Events = []*StreamingEvent{{Delta: "Third sentence."}}
	state.RegisterChunk(chunk2)

	// Simulate moderation results arriving in order
	go func() {
		time.Sleep(10 * time.Millisecond)
		state.resultChan <- AsyncModerationResult{SequenceNum: 0, Safe: true}
		time.Sleep(10 * time.Millisecond)
		state.resultChan <- AsyncModerationResult{SequenceNum: 1, Safe: true}
		time.Sleep(10 * time.Millisecond)
		state.resultChan <- AsyncModerationResult{SequenceNum: 2, Safe: true}
	}()

	// Wait for all pending chunks
	violation := state.WaitForAllPending(sendFunc)
	assert.Empty(t, violation)

	// Verify events were sent in order
	mu.Lock()
	defer mu.Unlock()
	require.Len(t, sentEvents, 3)
	assert.Equal(t, "First sentence.", sentEvents[0].Delta)
	assert.Equal(t, "Second sentence.", sentEvents[1].Delta)
	assert.Equal(t, "Third sentence.", sentEvents[2].Delta)
}

func TestChunkOrdering_OutOfOrder(t *testing.T) {
	ctx := context.Background()
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)
	defer state.Cancel()

	var sentEvents []*StreamingEvent
	var sendOrder []int // Track the order events are sent
	var mu sync.Mutex

	sendFunc := func(events []*StreamingEvent) error {
		mu.Lock()
		defer mu.Unlock()
		for _, e := range events {
			sentEvents = append(sentEvents, e)
			// Extract sequence from delta for verification
			switch e.Delta {
			case "First":
				sendOrder = append(sendOrder, 0)
			case "Second":
				sendOrder = append(sendOrder, 1)
			case "Third":
				sendOrder = append(sendOrder, 2)
			}
		}
		return nil
	}

	// Create and register chunks
	chunk0 := state.CreateChunk()
	chunk0.Text = "First"
	chunk0.Events = []*StreamingEvent{{Delta: "First"}}
	state.RegisterChunk(chunk0)

	chunk1 := state.CreateChunk()
	chunk1.Text = "Second"
	chunk1.Events = []*StreamingEvent{{Delta: "Second"}}
	state.RegisterChunk(chunk1)

	chunk2 := state.CreateChunk()
	chunk2.Text = "Third"
	chunk2.Events = []*StreamingEvent{{Delta: "Third"}}
	state.RegisterChunk(chunk2)

	// Simulate moderation results arriving OUT OF ORDER: 2, 0, 1
	go func() {
		time.Sleep(10 * time.Millisecond)
		// Chunk 2 completes first
		state.resultChan <- AsyncModerationResult{SequenceNum: 2, Safe: true}
		time.Sleep(10 * time.Millisecond)
		// Chunk 0 completes second
		state.resultChan <- AsyncModerationResult{SequenceNum: 0, Safe: true}
		time.Sleep(10 * time.Millisecond)
		// Chunk 1 completes last
		state.resultChan <- AsyncModerationResult{SequenceNum: 1, Safe: true}
	}()

	// Wait for all pending chunks
	violation := state.WaitForAllPending(sendFunc)
	assert.Empty(t, violation)

	// Verify events were sent in CORRECT order (0, 1, 2) despite arriving out of order
	mu.Lock()
	defer mu.Unlock()
	require.Len(t, sendOrder, 3)
	assert.Equal(t, []int{0, 1, 2}, sendOrder, "Events should be sent in sequence order regardless of moderation completion order")
}

func TestChunkOrdering_BatchRelease(t *testing.T) {
	// Test that when chunk 0 arrives after 1 and 2, all three are released together
	ctx := context.Background()
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)
	defer state.Cancel()

	var batchSizes []int
	var mu sync.Mutex

	sendFunc := func(events []*StreamingEvent) error {
		mu.Lock()
		defer mu.Unlock()
		batchSizes = append(batchSizes, len(events))
		return nil
	}

	// Create and register chunks
	for i := 0; i < 3; i++ {
		chunk := state.CreateChunk()
		chunk.Text = "Chunk"
		chunk.Events = []*StreamingEvent{{Delta: "Chunk"}}
		state.RegisterChunk(chunk)
	}

	// Chunks 1 and 2 complete first, then 0
	go func() {
		time.Sleep(10 * time.Millisecond)
		state.resultChan <- AsyncModerationResult{SequenceNum: 1, Safe: true}
		time.Sleep(10 * time.Millisecond)
		state.resultChan <- AsyncModerationResult{SequenceNum: 2, Safe: true}
		time.Sleep(10 * time.Millisecond)
		// When 0 arrives, it should trigger release of 0, 1, and 2
		state.resultChan <- AsyncModerationResult{SequenceNum: 0, Safe: true}
	}()

	violation := state.WaitForAllPending(sendFunc)
	assert.Empty(t, violation)

	// All three chunks should have been sent (possibly in separate calls due to timing)
	mu.Lock()
	total := 0
	for _, size := range batchSizes {
		total += size
	}
	mu.Unlock()
	assert.Equal(t, 3, total, "All three chunks should be sent")
}

func TestGuardrailViolation_StopsProcessing(t *testing.T) {
	ctx := context.Background()
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)
	defer state.Cancel()

	var sentCount int32

	sendFunc := func(events []*StreamingEvent) error {
		atomic.AddInt32(&sentCount, int32(len(events)))
		return nil
	}

	// Create and register chunks
	chunk0 := state.CreateChunk()
	chunk0.Text = "Safe content."
	chunk0.Events = []*StreamingEvent{{Delta: "Safe content."}}
	state.RegisterChunk(chunk0)

	chunk1 := state.CreateChunk()
	chunk1.Text = "Unsafe content that violates guidelines."
	chunk1.Events = []*StreamingEvent{{Delta: "Unsafe content."}}
	state.RegisterChunk(chunk1)

	chunk2 := state.CreateChunk()
	chunk2.Text = "More content."
	chunk2.Events = []*StreamingEvent{{Delta: "More content."}}
	state.RegisterChunk(chunk2)

	// Chunk 0 is safe, chunk 1 is flagged
	go func() {
		time.Sleep(10 * time.Millisecond)
		state.resultChan <- AsyncModerationResult{SequenceNum: 0, Safe: true}
		time.Sleep(10 * time.Millisecond)
		state.resultChan <- AsyncModerationResult{SequenceNum: 1, Safe: false, ViolationReason: "Content policy violation"}
		// Chunk 2 result would come but processing should stop
		time.Sleep(10 * time.Millisecond)
		state.resultChan <- AsyncModerationResult{SequenceNum: 2, Safe: true}
	}()

	violation := state.WaitForAllPending(sendFunc)

	// Should return violation reason
	assert.Equal(t, "Content policy violation", violation)

	// Only chunk 0 should have been sent (before violation)
	assert.Equal(t, int32(1), atomic.LoadInt32(&sentCount))
}

func TestGuardrailViolation_FirstChunkFlagged(t *testing.T) {
	ctx := context.Background()
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)
	defer state.Cancel()

	var sentCount int32

	sendFunc := func(events []*StreamingEvent) error {
		atomic.AddInt32(&sentCount, int32(len(events)))
		return nil
	}

	// Create and register chunk
	chunk0 := state.CreateChunk()
	chunk0.Text = "Harmful content."
	chunk0.Events = []*StreamingEvent{{Delta: "Harmful content."}}
	state.RegisterChunk(chunk0)

	// First chunk is flagged
	go func() {
		time.Sleep(10 * time.Millisecond)
		state.resultChan <- AsyncModerationResult{SequenceNum: 0, Safe: false, ViolationReason: "Harmful content detected"}
	}()

	violation := state.WaitForAllPending(sendFunc)

	// Should return violation reason
	assert.Equal(t, "Harmful content detected", violation)

	// No chunks should have been sent
	assert.Equal(t, int32(0), atomic.LoadInt32(&sentCount))
}

func TestContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)

	sendFunc := func(events []*StreamingEvent) error {
		return nil
	}

	// Register a chunk but don't send result
	chunk := state.CreateChunk()
	chunk.Text = "Test"
	chunk.Events = []*StreamingEvent{{Delta: "Test"}}
	state.RegisterChunk(chunk)

	// Cancel context after a short delay
	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	// WaitForAllPending should return when context is cancelled
	done := make(chan struct{})
	go func() {
		state.WaitForAllPending(sendFunc)
		close(done)
	}()

	select {
	case <-done:
		// Success - returned after context cancellation
	case <-time.After(1 * time.Second):
		t.Fatal("WaitForAllPending did not return after context cancellation")
	}
}

func TestConcurrentChunkRegistration(t *testing.T) {
	ctx := context.Background()
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)
	defer state.Cancel()

	var wg sync.WaitGroup
	numGoroutines := 10

	// Concurrently create and register chunks
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			chunk := state.CreateChunk()
			chunk.Text = "Concurrent test"
			chunk.Events = []*StreamingEvent{{Delta: "Concurrent test"}}
			state.RegisterChunk(chunk)
		}()
	}

	wg.Wait()

	// Verify all chunks were registered with unique sequence numbers
	state.mu.Lock()
	assert.Len(t, state.chunks, numGoroutines)
	assert.Equal(t, numGoroutines, state.nextChunkSeq)
	state.mu.Unlock()
}

func TestProcessResults_ContinuousProcessing(t *testing.T) {
	ctx := context.Background()
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)

	var sentEvents []*StreamingEvent
	var mu sync.Mutex

	sendFunc := func(events []*StreamingEvent) error {
		mu.Lock()
		defer mu.Unlock()
		sentEvents = append(sentEvents, events...)
		return nil
	}

	// Start result processor
	processorDone := make(chan string, 1)
	go func() {
		violation := state.ProcessResults(sendFunc)
		processorDone <- violation
	}()

	// Simulate continuous chunk creation and moderation
	for i := 0; i < 5; i++ {
		chunk := state.CreateChunk()
		chunk.Text = "Chunk"
		chunk.Events = []*StreamingEvent{{Delta: "Chunk", SequenceNumber: int64(i)}}
		state.RegisterChunk(chunk)

		// Send result immediately
		state.resultChan <- AsyncModerationResult{SequenceNum: i, Safe: true}

		// Give processor time to process
		time.Sleep(20 * time.Millisecond)
	}

	// Cancel to stop processor
	state.Cancel()

	select {
	case violation := <-processorDone:
		assert.Empty(t, violation)
	case <-time.After(1 * time.Second):
		t.Fatal("ProcessResults did not return after cancellation")
	}

	// All events should have been sent
	mu.Lock()
	assert.Len(t, sentEvents, 5)
	mu.Unlock()
}

func TestEmptyChunk(t *testing.T) {
	ctx := context.Background()
	logger := newMockLogger()
	state := NewAsyncModerationState(ctx, logger)
	defer state.Cancel()

	var sentCount int

	sendFunc := func(events []*StreamingEvent) error {
		sentCount += len(events)
		return nil
	}

	// Register chunk with no events
	chunk := state.CreateChunk()
	chunk.Text = ""
	chunk.Events = []*StreamingEvent{} // Empty
	state.RegisterChunk(chunk)

	go func() {
		time.Sleep(10 * time.Millisecond)
		state.resultChan <- AsyncModerationResult{SequenceNum: 0, Safe: true}
	}()

	state.WaitForAllPending(sendFunc)

	// No events should be sent for empty chunk
	assert.Equal(t, 0, sentCount)
}
