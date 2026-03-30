package lsmocks

import (
	"github.com/openai/openai-go/v2/responses"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// MockStreamIterator yields pre-built streaming events for mock mode.
// It replaces the HandleMockStreaming approach by providing events through
// the standard ResponseStreamIterator interface.
type MockStreamIterator struct {
	events  []responses.ResponseStreamEventUnion
	index   int
	current responses.ResponseStreamEventUnion
}

// Ensure interface compliance at compile time.
var _ llamastack.ResponseStreamIterator = (*MockStreamIterator)(nil)

// NewMockStreamIterator creates an iterator over the given events.
func NewMockStreamIterator(events []responses.ResponseStreamEventUnion) *MockStreamIterator {
	return &MockStreamIterator{events: events, index: -1}
}

func (m *MockStreamIterator) Next() bool {
	m.index++
	if m.index >= len(m.events) {
		return false
	}
	m.current = m.events[m.index]
	return true
}

func (m *MockStreamIterator) Current() responses.ResponseStreamEventUnion {
	return m.current
}

func (m *MockStreamIterator) Err() error {
	return nil
}

func (m *MockStreamIterator) Close() error {
	return nil
}
