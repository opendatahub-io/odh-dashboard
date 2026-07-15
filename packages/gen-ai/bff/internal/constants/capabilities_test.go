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
			name:     "audio-transcription only prepends text-generation",
			input:    []string{"audio-transcription"},
			expected: []string{"text-generation", "audio-transcription"},
		},
		{
			name:     "both capabilities prepends text-generation",
			input:    []string{"vision", "audio-transcription"},
			expected: []string{"text-generation", "vision", "audio-transcription"},
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
			name:     "duplicate capabilities are deduplicated",
			input:    []string{"vision", "vision", "audio-transcription"},
			expected: []string{"text-generation", "vision", "audio-transcription"},
		},
		{
			name:     "all duplicates of same capability reduces to one",
			input:    []string{"vision", "vision", "vision"},
			expected: []string{"text-generation", "vision"},
		},
		{
			name:     "aliases are normalized before dedup",
			input:    []string{"image-text-inferencing", "vision"},
			expected: []string{"text-generation", "vision"},
		},
		{
			name:     "MaaS alias audio-speech-recognition normalizes to audio-transcription",
			input:    []string{"audio-speech-recognition"},
			expected: []string{"text-generation", "audio-transcription"},
		},
		{
			name:     "mixed known and custom capabilities all pass through",
			input:    []string{"vision", "audio-transcription", "function-calling", "streaming"},
			expected: []string{"text-generation", "vision", "audio-transcription", "function-calling", "streaming"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := BuildCapabilities(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsKnownCapability(t *testing.T) {
	assert.True(t, IsKnownCapability("vision"))
	assert.True(t, IsKnownCapability("audio-transcription"))
	assert.True(t, IsKnownCapability("text-generation"))
	assert.False(t, IsKnownCapability("unknown-cap"))
	assert.False(t, IsKnownCapability("code-generation"))
}

func TestNormalizeCapability(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "maps image-text-inferencing to vision",
			input:    "image-text-inferencing",
			expected: "vision",
		},
		{
			name:     "maps audio-speech-recognition to audio-transcription",
			input:    "audio-speech-recognition",
			expected: "audio-transcription",
		},
		{
			name:     "passes through text-generation unchanged",
			input:    "text-generation",
			expected: "text-generation",
		},
		{
			name:     "passes through vision unchanged",
			input:    "vision",
			expected: "vision",
		},
		{
			name:     "passes through unknown capability unchanged",
			input:    "some-unknown-cap",
			expected: "some-unknown-cap",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeCapability(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
