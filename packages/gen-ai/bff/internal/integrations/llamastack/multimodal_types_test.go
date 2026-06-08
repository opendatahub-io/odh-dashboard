package llamastack

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInputUnion_UnmarshalJSON(t *testing.T) {
	tests := []struct {
		name      string
		data      string
		wantText  string
		wantParts int
		wantErr   string
	}{
		{
			name:     "plain string",
			data:     `"hello world"`,
			wantText: "hello world",
		},
		{
			name:      "array of content parts",
			data:      `[{"type":"input_text","text":"hello"},{"type":"input_image","file_id":"file-abc123def456"}]`,
			wantParts: 2,
		},
		{
			name:    "invalid JSON (number)",
			data:    `42`,
			wantErr: "input must be a string or array of content parts",
		},
		{
			name:    "invalid JSON (object)",
			data:    `{"key":"value"}`,
			wantErr: "input must be a string or array of content parts",
		},
		{
			name:     "empty string",
			data:     `""`,
			wantText: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var u InputUnion
			err := json.Unmarshal([]byte(tt.data), &u)
			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.wantParts > 0 {
				assert.Len(t, u.Parts, tt.wantParts)
				assert.Empty(t, u.Text)
			} else {
				assert.Equal(t, tt.wantText, u.Text)
				assert.Empty(t, u.Parts)
			}
		})
	}
}

func TestInputUnion_UnmarshalJSON_ContentPartFields(t *testing.T) {
	data := []byte(`[{"type":"input_text","text":"hello"},{"type":"input_image","file_id":"file-abc123def456"}]`)
	var u InputUnion
	require.NoError(t, json.Unmarshal(data, &u))

	assert.Equal(t, "input_text", u.Parts[0].Type)
	assert.Equal(t, "hello", u.Parts[0].Text)
	assert.Empty(t, u.Parts[0].FileID)

	assert.Equal(t, "input_image", u.Parts[1].Type)
	assert.Equal(t, "file-abc123def456", u.Parts[1].FileID)
	assert.Empty(t, u.Parts[1].Text)
}

func TestInputUnion_MarshalJSON(t *testing.T) {
	tests := []struct {
		name     string
		input    InputUnion
		contains string
	}{
		{
			name:     "string variant",
			input:    InputUnion{Text: "hello"},
			contains: `"hello"`,
		},
		{
			name:     "array variant",
			input:    InputUnion{Parts: []InputContentPart{{Type: "input_text", Text: "hello"}}},
			contains: `"type":"input_text"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(tt.input)
			require.NoError(t, err)
			assert.Contains(t, string(data), tt.contains)
		})
	}
}

func TestInputUnion_RoundTrip(t *testing.T) {
	tests := []struct {
		name  string
		input InputUnion
	}{
		{
			name:  "string round-trip",
			input: InputUnion{Text: "round trip"},
		},
		{
			name: "array round-trip",
			input: InputUnion{Parts: []InputContentPart{
				{Type: "input_text", Text: "describe"},
				{Type: "input_image", FileID: "file-abc123"},
			}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(tt.input)
			require.NoError(t, err)
			var restored InputUnion
			require.NoError(t, json.Unmarshal(data, &restored))
			if tt.input.IsMultimodal() {
				assert.Equal(t, tt.input.Parts, restored.Parts)
				assert.Empty(t, restored.Text, "Text should be cleared for multimodal input")
			} else {
				assert.Equal(t, tt.input.Text, restored.Text)
				assert.Empty(t, restored.Parts, "Parts should be cleared for string input")
			}
		})
	}
}

func TestInputUnion_IsMultimodal(t *testing.T) {
	assert.False(t, InputUnion{Text: "text"}.IsMultimodal())
	assert.True(t, InputUnion{Parts: []InputContentPart{{Type: "input_text", Text: "hi"}}}.IsMultimodal())
	assert.False(t, InputUnion{}.IsMultimodal())
}

func TestInputUnion_TextContent(t *testing.T) {
	tests := []struct {
		name  string
		input InputUnion
		want  string
	}{
		{
			name:  "string input returns text directly",
			input: InputUnion{Text: "plain string"},
			want:  "plain string",
		},
		{
			name: "multimodal extracts text parts only",
			input: InputUnion{Parts: []InputContentPart{
				{Type: "input_text", Text: "describe"},
				{Type: "input_image", FileID: "file-abc123"},
				{Type: "input_text", Text: "this image"},
			}},
			want: "describe this image",
		},
		{
			name: "image-only returns empty string",
			input: InputUnion{Parts: []InputContentPart{
				{Type: "input_image", FileID: "file-abc123"},
			}},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, tt.input.TextContent())
		})
	}
}

func TestValidateFileID(t *testing.T) {
	tests := []struct {
		name    string
		fileID  string
		wantErr string
	}{
		{name: "valid OGX file ID", fileID: "file-abc123def456"},
		{name: "empty file_id", fileID: "", wantErr: "file_id is required for input_image"},
		{name: "HTTP URL", fileID: "http://evil.com/image.jpg", wantErr: "invalid file_id"},
		{name: "HTTPS URL", fileID: "https://evil.com/image.jpg", wantErr: "invalid file_id"},
		{name: "file:// path", fileID: "file:///etc/passwd", wantErr: "invalid file_id"},
		{name: "arbitrary string", fileID: "not-a-valid-id", wantErr: "expected format 'file-<hex>'"},
		{name: "uppercase hex rejected", fileID: "file-ABC123DEF456", wantErr: "invalid file_id"},
		{name: "bare prefix", fileID: "file-", wantErr: "invalid file_id"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateFileID(tt.fileID)
			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateInputParts(t *testing.T) {
	tests := []struct {
		name    string
		parts   []InputContentPart
		wantErr string
	}{
		{
			name: "valid text + image",
			parts: []InputContentPart{
				{Type: "input_text", Text: "describe this"},
				{Type: "input_image", FileID: "file-abc123def456"},
			},
		},
		{
			name:    "empty array",
			parts:   []InputContentPart{},
			wantErr: "at least one content part",
		},
		{
			name:    "unknown type",
			parts:   []InputContentPart{{Type: "input_audio", Text: "x"}},
			wantErr: "unsupported content part type",
		},
		{
			name:    "empty text in input_text",
			parts:   []InputContentPart{{Type: "input_text", Text: ""}},
			wantErr: "non-empty text",
		},
		{
			name:    "invalid file_id in input_image",
			parts:   []InputContentPart{{Type: "input_image", FileID: "https://evil.com"}},
			wantErr: "invalid file_id",
		},
		{
			name:  "image-only (valid)",
			parts: []InputContentPart{{Type: "input_image", FileID: "file-abc123def456"}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateInputParts(tt.parts)
			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestCountImageParts(t *testing.T) {
	tests := []struct {
		name        string
		input       InputUnion
		chatContext []ChatContextMessage
		want        int
	}{
		{
			name:  "text-only input, no context",
			input: InputUnion{Text: "hello"},
			want:  0,
		},
		{
			name: "one image in input",
			input: InputUnion{Parts: []InputContentPart{
				{Type: "input_text", Text: "hello"},
				{Type: "input_image", FileID: "file-abc123"},
			}},
			want: 1,
		},
		{
			name:  "image in chat context only",
			input: InputUnion{Text: "follow up"},
			chatContext: []ChatContextMessage{{
				Role: "user",
				Content: InputUnion{Parts: []InputContentPart{
					{Type: "input_image", FileID: "file-abc123"},
				}},
			}},
			want: 1,
		},
		{
			name: "images in both input and history",
			input: InputUnion{Parts: []InputContentPart{
				{Type: "input_image", FileID: "file-111111"},
			}},
			chatContext: []ChatContextMessage{{
				Role: "user",
				Content: InputUnion{Parts: []InputContentPart{
					{Type: "input_image", FileID: "file-222222"},
				}},
			}},
			want: 2,
		},
		{
			name:  "string content in chat context (no images)",
			input: InputUnion{Text: "hi"},
			chatContext: []ChatContextMessage{
				{Role: "user", Content: InputUnion{Text: "hello"}},
				{Role: "assistant", Content: InputUnion{Text: "hi there"}},
			},
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, CountImageParts(tt.input, tt.chatContext))
		})
	}
}
