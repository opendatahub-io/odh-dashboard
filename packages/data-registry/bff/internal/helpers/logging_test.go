package helper

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type trackedLogBody struct {
	io.Reader
	reads  int
	closed bool
}

func (b *trackedLogBody) Read(p []byte) (int, error) {
	b.reads++
	return b.Reader.Read(p)
}

func (b *trackedLogBody) Close() error {
	b.closed = true
	return nil
}

func TestRequestLoggingDoesNotReadOrExposeBody(t *testing.T) {
	const payload = `{"password":"sensitive-body-value"}`
	body := &trackedLogBody{Reader: strings.NewReader(payload)}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/project/namespaces", nil)
	req.Body = body
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer sensitive-auth-value")
	req.Header.Set("X-Forwarded-Access-Token", "sensitive-forwarded-value")

	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, &slog.HandlerOptions{Level: slog.LevelDebug}))
	logger.Debug("request", slog.Any("request", RequestLogValuer{Request: req}))

	assert.Same(t, body, req.Body, "logging must preserve the original stream")
	assert.Zero(t, body.reads, "logging must not buffer or consume the body")
	assert.False(t, body.closed)
	assert.NotContains(t, logs.String(), "sensitive-")
	assert.NotContains(t, logs.String(), `"body"`)
	assert.Contains(t, logs.String(), `"method":"POST"`)
	assert.Contains(t, logs.String(), `"Content-Type":"application/json"`)
	forwarded, err := io.ReadAll(req.Body)
	require.NoError(t, err)
	assert.Equal(t, payload, string(forwarded))
}

func TestResponseLoggingDoesNotReadOrExposeBody(t *testing.T) {
	body := &trackedLogBody{Reader: strings.NewReader(`{"token":"sensitive-response-value"}`)}
	resp := &http.Response{
		StatusCode: http.StatusOK,
		Status:     "200 OK",
		Header:     http.Header{"Set-Cookie": {"sensitive-cookie-value"}},
		Body:       body,
	}
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, &slog.HandlerOptions{Level: slog.LevelDebug}))
	logger.Debug("response", slog.Any("response", ResponseLogValuer{Response: resp}))

	assert.Zero(t, body.reads)
	assert.False(t, body.closed)
	assert.NotContains(t, logs.String(), "sensitive-")
	assert.NotContains(t, logs.String(), `"body"`)
	assert.Contains(t, logs.String(), `"status_code":200`)
}

func TestHeaderLoggingRedactsCredentialsCaseInsensitively(t *testing.T) {
	for _, name := range []string{"Authorization", "Cookie", "Set-Cookie", "Proxy-Authorization", "X-Forwarded-Access-Token", "x-forwarded-access-token"} {
		t.Run(name, func(t *testing.T) {
			var logs bytes.Buffer
			logger := slog.New(slog.NewJSONHandler(&logs, nil))
			logger.Info("headers", slog.Any("headers", HeaderLogValuer{Header: http.Header{name: {"sensitive-header-value"}}}))
			assert.NotContains(t, logs.String(), "sensitive-header-value")
			assert.Contains(t, logs.String(), "[REDACTED]")
		})
	}
}
