package api

import (
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/stretchr/testify/assert"
)

func TestEndsWithSentenceBoundary(t *testing.T) {
	tests := []struct {
		name     string
		text     string
		expected bool
	}{
		// Positive cases - should detect sentence boundaries
		{
			name:     "ends with period",
			text:     "This is a complete sentence.",
			expected: true,
		},
		{
			name:     "ends with exclamation mark",
			text:     "This is exciting!",
			expected: true,
		},
		{
			name:     "ends with question mark",
			text:     "Is this a question?",
			expected: true,
		},
		{
			name:     "ends with period and trailing space",
			text:     "Sentence with trailing space. ",
			expected: true,
		},
		{
			name:     "ends with period and trailing tab",
			text:     "Sentence with trailing tab.\t",
			expected: true,
		},
		{
			name:     "ends with period and multiple trailing spaces",
			text:     "Sentence with spaces.   ",
			expected: true,
		},

		// Negative cases - should not detect sentence boundaries
		{
			name:     "ends with comma",
			text:     "This is incomplete,",
			expected: false,
		},
		{
			name:     "ends with word",
			text:     "This is incomplete",
			expected: false,
		},
		{
			name:     "ends with colon",
			text:     "Here is a list:",
			expected: false,
		},
		{
			name:     "empty string",
			text:     "",
			expected: false,
		},
		{
			name:     "only whitespace",
			text:     "   ",
			expected: false,
		},
		{
			name:     "ends with number",
			text:     "The answer is 42",
			expected: false,
		},
		{
			name:     "code block without sentence ending",
			text:     "func main() {",
			expected: false,
		},
		{
			name:     "URL ending with slash",
			text:     "Visit https://example.com/",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := EndsWithSentenceBoundary(tt.text)
			assert.Equal(t, tt.expected, result, "EndsWithSentenceBoundary(%q) = %v, want %v", tt.text, result, tt.expected)
		})
	}
}

func TestShouldTriggerModeration(t *testing.T) {
	tests := []struct {
		name            string
		accumulatedText string
		wordCount       int
		expected        bool
	}{
		// Primary trigger: sentence boundary with minimum word count (10 words)
		{
			name:            "sentence boundary at minimum word count",
			accumulatedText: "This is a complete sentence with exactly ten words here.",
			wordCount:       constants.MinModerationWordCount,
			expected:        true,
		},
		{
			name:            "sentence boundary above minimum word count",
			accumulatedText: "This is a longer sentence that definitely has more than the minimum required word count here.",
			wordCount:       15,
			expected:        true,
		},
		{
			name:            "question above minimum word count",
			accumulatedText: "Is this a question that has enough words to trigger moderation check?",
			wordCount:       12,
			expected:        true,
		},
		{
			name:            "exclamation above minimum word count",
			accumulatedText: "Hello world this is an exciting message with many words!",
			wordCount:       10,
			expected:        true,
		},

		// Below minimum word count - should NOT trigger even with sentence boundary
		{
			name:            "sentence boundary below minimum word count",
			accumulatedText: "This is a short sentence.",
			wordCount:       5,
			expected:        false,
		},
		{
			name:            "question below minimum word count",
			accumulatedText: "Is this working?",
			wordCount:       3,
			expected:        false,
		},
		{
			name:            "exclamation below minimum word count",
			accumulatedText: "Hello world!",
			wordCount:       2,
			expected:        false,
		},

		// Fallback trigger: word count threshold
		{
			name:            "word count at threshold without sentence boundary",
			accumulatedText: "This is a long piece of text that continues without ending",
			wordCount:       constants.ModerationChunkSize,
			expected:        true,
		},
		{
			name:            "word count above threshold without sentence boundary",
			accumulatedText: "This is a very long piece of text that keeps going and going",
			wordCount:       constants.ModerationChunkSize + 10,
			expected:        true,
		},

		// No trigger cases
		{
			name:            "no sentence boundary and below word threshold",
			accumulatedText: "This is incomplete",
			wordCount:       3,
			expected:        false,
		},
		{
			name:            "sentence boundary but no words yet",
			accumulatedText: ".",
			wordCount:       0,
			expected:        false,
		},
		{
			name:            "empty text and zero words",
			accumulatedText: "",
			wordCount:       0,
			expected:        false,
		},
		{
			name:            "code block below threshold",
			accumulatedText: "func main() {\n  fmt.Println",
			wordCount:       5,
			expected:        false,
		},

		// Edge cases
		{
			name:            "just below word threshold without boundary",
			accumulatedText: "Almost there but not quite enough words yet",
			wordCount:       constants.ModerationChunkSize - 1,
			expected:        false,
		},
		{
			name:            "just below minimum word count with boundary",
			accumulatedText: "Almost at minimum words here.",
			wordCount:       constants.MinModerationWordCount - 1,
			expected:        false,
		},
		{
			name:            "multiple sentences above minimum word count",
			accumulatedText: "First sentence here with enough words. Second sentence.",
			wordCount:       10,
			expected:        true,
		},
		{
			name:            "multiple sentences below minimum word count",
			accumulatedText: "First. Second.",
			wordCount:       2,
			expected:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ShouldTriggerModeration(tt.accumulatedText, tt.wordCount)
			assert.Equal(t, tt.expected, result, "ShouldTriggerModeration(%q, %d) = %v, want %v",
				tt.accumulatedText, tt.wordCount, result, tt.expected)
		})
	}
}

func TestShouldTriggerModeration_RealWorldScenarios(t *testing.T) {
	// Test realistic streaming scenarios
	tests := []struct {
		name            string
		accumulatedText string
		wordCount       int
		expected        bool
		description     string
	}{
		{
			name:            "LLM response with complete thought above min words",
			accumulatedText: "I'd be happy to help you with that question about the topic.",
			wordCount:       12,
			expected:        true,
			description:     "Should trigger at sentence end for readable chunks when above minimum word count",
		},
		{
			name:            "LLM response complete but below min words",
			accumulatedText: "I'd be happy to help you.",
			wordCount:       6,
			expected:        false,
			description:     "Should NOT trigger below minimum word count even with sentence boundary",
		},
		{
			name:            "LLM response mid-sentence",
			accumulatedText: "I'd be happy to help you with",
			wordCount:       7,
			expected:        false,
			description:     "Should wait for sentence completion",
		},
		{
			name:            "Code generation without punctuation",
			accumulatedText: "```python\ndef calculate_sum(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total",
			wordCount:       35,
			expected:        true,
			description:     "Should fallback to word count for code blocks",
		},
		{
			name:            "Bullet list item below min words",
			accumulatedText: "Here are the key points:\n- First item.",
			wordCount:       7,
			expected:        false,
			description:     "Should NOT trigger on short list items to prevent false positives",
		},
		{
			name:            "Bullet list with enough words",
			accumulatedText: "Here are the key points that I want to discuss:\n- First item details.",
			wordCount:       12,
			expected:        true,
			description:     "Should trigger on list items when above minimum word count",
		},
		{
			name:            "Non-English text simulation (continuous)",
			accumulatedText: "这是一段连续的中文文本没有明显的句号分隔符持续输出直到达到词数阈值",
			wordCount:       35,
			expected:        true,
			description:     "Should fallback to word count for non-English without boundaries",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ShouldTriggerModeration(tt.accumulatedText, tt.wordCount)
			assert.Equal(t, tt.expected, result, "%s: ShouldTriggerModeration returned %v, want %v",
				tt.description, result, tt.expected)
		})
	}
}
