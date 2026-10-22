package helper

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequestLogValuerOmitsBodyAndRedactsCredentials(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "https://url-user-secret:url-password-secret@upstream.example/resource?access_token=query-token-secret&filter=query-value-secret#fragment-secret", strings.NewReader("private-request-body"))
	request.Header.Set("Authorization", "Bearer authorization-secret")
	request.Header.Set("X-Forwarded-Access-Token", "forwarded-token-secret")
	request.Header.Set("Sec-WebSocket-Protocol", "websocket-token-secret")
	request.Header.Set("X-Session-ID", "configured-header-secret")
	request.Header.Set("X-Request-ID", "request-123")

	var output bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&output, nil))
	logger.Info("request", slog.Any("request", RequestLogValuer{
		Request:          request,
		SensitiveHeaders: []string{"X-Session-ID"},
	}))

	logged := output.String()
	for _, secret := range []string{
		"private-request-body",
		"url-user-secret",
		"url-password-secret",
		"query-token-secret",
		"query-value-secret",
		"fragment-secret",
		"authorization-secret",
		"forwarded-token-secret",
		"websocket-token-secret",
		"configured-header-secret",
	} {
		if strings.Contains(logged, secret) {
			t.Errorf("request log exposed %q: %s", secret, logged)
		}
	}
	if !strings.Contains(logged, "https://upstream.example/resource") || !strings.Contains(logged, "[REDACTED]") || !strings.Contains(logged, "request-123") {
		t.Fatalf("request log should retain safe metadata and redaction markers: %s", logged)
	}
}

func TestResponseLogValuerOmitsBodyAndRedactsCredentialHeaders(t *testing.T) {
	response := &http.Response{
		StatusCode: http.StatusOK,
		Status:     "200 OK",
		Header: http.Header{
			"X-Response-Token": {"response-token-secret"},
			"Content-Type":     {"application/json"},
		},
		Body: io.NopCloser(strings.NewReader("private-response-body")),
	}

	var output bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&output, nil))
	logger.Info("response", slog.Any("response", ResponseLogValuer{Response: response}))

	logged := output.String()
	for _, secret := range []string{"private-response-body", "response-token-secret"} {
		if strings.Contains(logged, secret) {
			t.Errorf("response log exposed %q: %s", secret, logged)
		}
	}
	if !strings.Contains(logged, "200 OK") || !strings.Contains(logged, "application/json") || !strings.Contains(logged, "[REDACTED]") {
		t.Fatalf("response log should retain status and safe headers with redaction: %s", logged)
	}
}
