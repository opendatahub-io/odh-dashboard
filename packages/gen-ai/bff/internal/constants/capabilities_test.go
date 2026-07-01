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
			name:     "unknown capability is filtered out",
			input:    []string{"vision", "unknown-cap"},
			expected: []string{"text-generation", "vision"},
		},
		{
			name:     "all unknown capabilities returns nil",
			input:    []string{"unknown-1", "unknown-2"},
			expected: nil,
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := BuildCapabilities(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
