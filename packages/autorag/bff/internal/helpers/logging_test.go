package helper

import (
	"bytes"
	"errors"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequestLogValuerDoesNotLogRequestBody(t *testing.T) {
	const sensitive = "api-key=secret-prompt-and-document-text"
	request := httptest.NewRequest("POST", "/api/v1/responses?dbSecretName=database", strings.NewReader(sensitive))

	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, &slog.HandlerOptions{Level: slog.LevelDebug}))
	logger.Debug("Incoming HTTP request", slog.Any("request", RequestLogValuer{Request: request}))

	assertLog := logs.String()
	if strings.Contains(assertLog, sensitive) {
		t.Fatalf("debug log contains request body: %s", assertLog)
	}
	if !strings.Contains(assertLog, "method=POST") || !strings.Contains(assertLog, "path=/api/v1/responses") || !strings.Contains(assertLog, "content_length=") {
		t.Fatalf("debug log is missing safe request metadata: %s", assertLog)
	}
}

func TestSafeErrorForLogRedactsMalformedURLMatches(t *testing.T) {
	for _, raw := range []string{
		`https://user:secret@[bad-host]:bad-port/path?token=secret#fragment`,
		`https://user:secret@example.com:%zz/path?token=secret#fragment`,
		`https://user:secret@example.com:bad%zz/path?token=secret#fragment`,
	} {
		t.Run(raw, func(t *testing.T) {
			got := SafeErrorForLog(errors.New("upstream failed: " + raw))
			for _, secret := range []string{"user", "secret", "path", "token", "fragment"} {
				if strings.Contains(got, secret) {
					t.Fatalf("SafeErrorForLog() = %q, contains %q", got, secret)
				}
			}
			if !strings.Contains(got, "<redacted>") {
				t.Fatalf("SafeErrorForLog() = %q, want redaction marker", got)
			}
		})
	}
}
