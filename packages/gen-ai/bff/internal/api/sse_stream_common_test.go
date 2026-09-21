package api

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
)

func TestTruncateRunes(t *testing.T) {
	assert.Equal(t, "hello", truncateRunes("hello", 10))
	assert.Equal(t, "", truncateRunes("hello", 0))
	assert.Equal(t, "hé", truncateRunes("héllo", 2))
}

func TestAddStreamingDeltaTraceEvent(t *testing.T) {
	exporter := setupTestTracerProvider(t)
	tracer := otel.Tracer("test")

	ctx, span := tracer.Start(context.Background(), "test-span")
	addStreamingDeltaTraceEvent(ctx, &StreamingEvent{
		Type:           "response.output_text.delta",
		Delta:          "hello",
		SequenceNumber: 7,
		ItemID:         "msg-1",
		OutputIndex:    2,
		ContentIndex:   3,
	}, 4)
	span.End()

	spans := exporter.GetSpans()
	require.Len(t, spans, 1)
	require.Len(t, spans[0].Events, 1)

	event := spans[0].Events[0]
	assert.Equal(t, "response.output_text.delta", event.Name)
	assert.Contains(t, event.Attributes, attribute.Int("gen_ai.streaming.chunk.index", 4))
	assert.Contains(t, event.Attributes, attribute.Int64("gen_ai.streaming.sequence_number", 7))
	assert.Contains(t, event.Attributes, attribute.String("gen_ai.streaming.item_id", "msg-1"))
	assert.NotContains(t, event.Attributes, attribute.Int("gen_ai.streaming.output_index", 2))
	assert.NotContains(t, event.Attributes, attribute.Int("gen_ai.streaming.content_index", 3))
	assert.Contains(t, event.Attributes, attribute.Int("gen_ai.streaming.chunk.bytes", 5))
	assert.Contains(t, event.Attributes, attribute.Int("gen_ai.streaming.chunk.characters", 5))
	assert.Contains(t, event.Attributes, attribute.String("gen_ai.streaming.chunk.preview", "hello"))
}
