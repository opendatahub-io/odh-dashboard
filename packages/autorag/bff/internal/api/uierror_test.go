package api

import (
	"testing"
)

func TestRedactDetails(t *testing.T) {
	tests := []struct {
		name     string
		input    map[string]any
		wantSafe map[string]any
	}{
		{
			name:     "nil map",
			input:    nil,
			wantSafe: nil,
		},
		{
			name:     "empty map",
			input:    map[string]any{},
			wantSafe: map[string]any{},
		},
		{
			name: "no sensitive keys",
			input: map[string]any{
				"name":   "test-rag",
				"status": 404,
			},
			wantSafe: map[string]any{
				"name":   "test-rag",
				"status": 404,
			},
		},
		{
			name: "redacts password",
			input: map[string]any{
				"name":     "test",
				"Password": "hunter2",
			},
			wantSafe: map[string]any{
				"name":     "test",
				"Password": "[REDACTED]",
			},
		},
		{
			name: "redacts token case-insensitive",
			input: map[string]any{
				"AuthToken": "abc123",
				"name":      "ok",
			},
			wantSafe: map[string]any{
				"AuthToken": "[REDACTED]",
				"name":      "ok",
			},
		},
		{
			name: "redacts apikey and secret",
			input: map[string]any{
				"ApiKey":     "key-value",
				"SecretData": "s3cret",
				"region":     "us-east",
			},
			wantSafe: map[string]any{
				"ApiKey":     "[REDACTED]",
				"SecretData": "[REDACTED]",
				"region":     "us-east",
			},
		},
		{
			name: "redacts credential and authorization",
			input: map[string]any{
				"userCredential": "cred-val",
				"Authorization":  "Bearer xyz",
				"endpoint":       "https://example.com",
			},
			wantSafe: map[string]any{
				"userCredential": "[REDACTED]",
				"Authorization":  "[REDACTED]",
				"endpoint":       "https://example.com",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := redactDetails(tt.input)

			if tt.input == nil {
				if got != nil {
					t.Fatalf("expected nil, got %v", got)
				}
				return
			}

			if len(got) != len(tt.wantSafe) {
				t.Fatalf("length mismatch: got %d, want %d", len(got), len(tt.wantSafe))
			}

			for k, want := range tt.wantSafe {
				gotVal, ok := got[k]
				if !ok {
					t.Errorf("missing key %q", k)
					continue
				}
				if gotVal != want {
					t.Errorf("key %q: got %v, want %v", k, gotVal, want)
				}
			}
		})
	}
}
