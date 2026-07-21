package constants

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildCapabilities(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected []string
	}{
		{
			name:     "nil input returns nil",
			input:    nil,
			expected: nil,
		},
		{
			name:     "empty input returns nil",
			input:    []string{},
			expected: nil,
		},
		{
			name:     "vision only prepends text-generation",
			input:    []string{"vision"},
			expected: []string{"text-generation", "vision"},
		},
		{
			name:     "audio-transcription only does NOT prepend text-generation (ASR-only model)",
			input:    []string{"audio-transcription"},
			expected: []string{"audio-transcription"},
		},
		{
			name:     "vision + audio-transcription DOES prepend text-generation (multimodal, not pure ASR)",
			input:    []string{"vision", "audio-transcription"},
			expected: []string{"text-generation", "vision", "audio-transcription"},
		},
		{
			name:     "text-generation + audio-transcription preserves both (multimodal LLM with ASR)",
			input:    []string{"text-generation", "audio-transcription"},
			expected: []string{"text-generation", "audio-transcription"},
		},
		{
			name:     "text-generation included does not duplicate",
			input:    []string{"text-generation", "vision"},
			expected: []string{"text-generation", "vision"},
		},
		{
			name:     "unknown capabilities pass through",
			input:    []string{"vision", "code-generation", "tool-use"},
			expected: []string{"text-generation", "vision", "code-generation", "tool-use"},
		},
		{
			name:     "all custom capabilities pass through with text-generation prepended",
			input:    []string{"custom-1", "custom-2"},
			expected: []string{"text-generation", "custom-1", "custom-2"},
		},
		{
			name:     "text-generation alone is preserved",
			input:    []string{"text-generation"},
			expected: []string{"text-generation"},
		},
		{
			name:     "duplicate capabilities are deduplicated (multimodal with vision+ASR gets text-gen)",
			input:    []string{"vision", "vision", "audio-transcription"},
			expected: []string{"text-generation", "vision", "audio-transcription"},
		},
		{
			name:     "all duplicates of same capability reduces to one",
			input:    []string{"vision", "vision", "vision"},
			expected: []string{"text-generation", "vision"},
		},
		{
			name:     "mixed with vision+ASR injects text-generation (multimodal)",
			input:    []string{"vision", "audio-transcription", "function-calling", "streaming"},
			expected: []string{"text-generation", "vision", "audio-transcription", "function-calling", "streaming"},
		},
		{
			name:     "text-generation + vision + audio-transcription preserves all (explicit text-gen)",
			input:    []string{"text-generation", "vision", "audio-transcription"},
			expected: []string{"text-generation", "vision", "audio-transcription"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := BuildCapabilities(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsASROnlyCapabilities(t *testing.T) {
	assert.True(t, IsASROnlyCapabilities([]string{"audio-transcription"}))
	assert.True(t, IsASROnlyCapabilities([]string{"audio-transcription", "vision"}))
	assert.False(t, IsASROnlyCapabilities([]string{"text-generation", "audio-transcription"}))
	assert.False(t, IsASROnlyCapabilities([]string{"vision"}))
	assert.False(t, IsASROnlyCapabilities([]string{}))
	assert.False(t, IsASROnlyCapabilities(nil))
}

func TestInferModelTypeFromCapabilities(t *testing.T) {
	assert.Equal(t, "transcription", InferModelTypeFromCapabilities([]string{"audio-transcription"}))
	assert.Equal(t, "transcription", InferModelTypeFromCapabilities([]string{"audio-transcription", "vision"}))
	assert.Equal(t, "", InferModelTypeFromCapabilities([]string{"text-generation", "audio-transcription"}))
	assert.Equal(t, "", InferModelTypeFromCapabilities([]string{"vision"}))
	assert.Equal(t, "", InferModelTypeFromCapabilities([]string{}))
}

func TestIsKnownCapability(t *testing.T) {
	assert.True(t, IsKnownCapability("vision"))
	assert.True(t, IsKnownCapability("audio-transcription"))
	assert.True(t, IsKnownCapability("text-generation"))
	assert.False(t, IsKnownCapability("unknown-cap"))
	assert.False(t, IsKnownCapability("code-generation"))
}
