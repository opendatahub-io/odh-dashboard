package api

import "testing"

func TestChatCompletionsURL(t *testing.T) {
	tests := []struct {
		name    string
		baseURL string
		want    string
	}{
		{
			name:    "adds v1 for a bare OpenAI-compatible base URL",
			baseURL: "https://models.example.com",
			want:    "https://models.example.com/v1/chat/completions",
		},
		{
			name:    "preserves a standard v1 base URL",
			baseURL: "https://api.openai.com/v1/",
			want:    "https://api.openai.com/v1/chat/completions",
		},
		{
			name:    "preserves the Google OpenAI-compatible base URL",
			baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
			want:    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := chatCompletionsURL(tt.baseURL); got != tt.want {
				t.Errorf("chatCompletionsURL(%q) = %q, want %q", tt.baseURL, got, tt.want)
			}
		})
	}
}
