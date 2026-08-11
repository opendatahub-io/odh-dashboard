package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
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
		{
			name: "redacts sensitive keys in nested maps",
			input: map[string]any{
				"config": map[string]any{
					"apiKey":   "secret-key",
					"endpoint": "https://example.com",
				},
			},
			wantSafe: map[string]any{
				"config": map[string]any{
					"apiKey":   "[REDACTED]",
					"endpoint": "https://example.com",
				},
			},
		},
		{
			name: "redacts deeply nested sensitive keys",
			input: map[string]any{
				"outer": map[string]any{
					"middle": map[string]any{
						"secretValue": "deep-secret",
						"name":        "safe",
					},
				},
			},
			wantSafe: map[string]any{
				"outer": map[string]any{
					"middle": map[string]any{
						"secretValue": "[REDACTED]",
						"name":        "safe",
					},
				},
			},
		},
		{
			name: "redacts nested map even when parent key is sensitive",
			input: map[string]any{
				"credentials": map[string]any{
					"username": "admin",
				},
			},
			wantSafe: map[string]any{
				"credentials": "[REDACTED]",
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

			if !reflect.DeepEqual(got, tt.wantSafe) {
				t.Errorf("got %v, want %v", got, tt.wantSafe)
			}
		})
	}
}

func TestUIError_WriteTo(t *testing.T) {
	tests := []struct {
		name           string
		err            *UIError
		wantStatus     int
		wantBodyFields map[string]any
	}{
		{
			name:       "writes status and JSON body",
			err:        NewUIError(http.StatusNotFound, "rag.not_found", "RAG not found"),
			wantStatus: http.StatusNotFound,
			wantBodyFields: map[string]any{
				"type":      "UIError",
				"messageId": "rag.not_found",
				"reason":    "RAG not found",
				"status":    float64(http.StatusNotFound),
			},
		},
		{
			name: "includes details and transactionId",
			err: &UIError{
				Type:          "UIError",
				MessageID:     "rag.error",
				Reason:        "something broke",
				Status:        http.StatusInternalServerError,
				TransactionID: "tx-abc-123",
				Details:       map[string]any{"component": "indexer"},
			},
			wantStatus: http.StatusInternalServerError,
			wantBodyFields: map[string]any{
				"type":          "UIError",
				"messageId":     "rag.error",
				"reason":        "something broke",
				"status":        float64(http.StatusInternalServerError),
				"transactionId": "tx-abc-123",
			},
		},
		{
			name:       "writes with logger attached",
			err:        NewUIError(http.StatusBadRequest, "bad.input", "invalid request").WithLogger(slog.Default()),
			wantStatus: http.StatusBadRequest,
			wantBodyFields: map[string]any{
				"type":      "UIError",
				"messageId": "bad.input",
				"reason":    "invalid request",
				"status":    float64(http.StatusBadRequest),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			tt.err.WriteTo(rec)

			if rec.Code != tt.wantStatus {
				t.Errorf("status: got %d, want %d", rec.Code, tt.wantStatus)
			}

			ct := rec.Header().Get("Content-Type")
			if ct != "application/json" {
				t.Errorf("Content-Type: got %q, want %q", ct, "application/json")
			}

			var body map[string]any
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("failed to decode response body: %v", err)
			}

			for key, want := range tt.wantBodyFields {
				got, ok := body[key]
				if !ok {
					t.Errorf("missing key %q in response body", key)
					continue
				}
				if got != want {
					t.Errorf("body[%q]: got %v, want %v", key, got, want)
				}
			}
		})
	}
}

func TestUIError_WithTracing(t *testing.T) {
	tests := []struct {
		name            string
		ctxValues       map[any]any
		wantTransaction string
		wantLogger      bool
	}{
		{
			name:            "no tracing in context",
			ctxValues:       map[any]any{},
			wantTransaction: "",
			wantLogger:      false,
		},
		{
			name: "extracts traceId from context",
			ctxValues: map[any]any{
				constants.TraceIdKey: "trace-xyz-789",
			},
			wantTransaction: "trace-xyz-789",
			wantLogger:      false,
		},
		{
			name: "extracts logger from context",
			ctxValues: map[any]any{
				constants.TraceLoggerKey: slog.Default(),
			},
			wantTransaction: "",
			wantLogger:      true,
		},
		{
			name: "extracts both traceId and logger",
			ctxValues: map[any]any{
				constants.TraceIdKey:     "trace-abc-456",
				constants.TraceLoggerKey: slog.Default(),
			},
			wantTransaction: "trace-abc-456",
			wantLogger:      true,
		},
		{
			name: "ignores non-string traceId",
			ctxValues: map[any]any{
				constants.TraceIdKey: 12345,
			},
			wantTransaction: "",
			wantLogger:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			for k, v := range tt.ctxValues {
				ctx = context.WithValue(ctx, k, v)
			}
			req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(ctx)

			uiErr := NewUIError(http.StatusBadRequest, "test", "test error").WithTracing(req)

			if uiErr.TransactionID != tt.wantTransaction {
				t.Errorf("TransactionID: got %q, want %q", uiErr.TransactionID, tt.wantTransaction)
			}

			hasLogger := uiErr.logger != nil
			if hasLogger != tt.wantLogger {
				t.Errorf("logger present: got %v, want %v", hasLogger, tt.wantLogger)
			}
		})
	}
}
