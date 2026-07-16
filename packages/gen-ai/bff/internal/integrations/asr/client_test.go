package asr

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
}

func TestNewClient(t *testing.T) {
	client := NewClient(testLogger(), false, nil)
	assert.NotNil(t, client)
	assert.NotNil(t, client.httpClient)
}

func TestTranscribe_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/v1/audio/transcriptions", r.URL.Path)
		assert.True(t, strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data"))
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "hello world"})
	}))
	defer server.Close()

	client := NewClient(testLogger(), true, nil)
	text, err := client.Transcribe(context.Background(), server.URL, "whisper", bytes.NewReader([]byte("audio-data")), "audio/wav", "test-token")
	require.NoError(t, err)
	assert.Equal(t, "hello world", text)
}

func TestTranscribe_SendsModelField(t *testing.T) {
	var receivedModel string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseMultipartForm(1 << 20)
		receivedModel = r.FormValue("model")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "ok"})
	}))
	defer server.Close()

	client := NewClient(testLogger(), true, nil)
	_, err := client.Transcribe(context.Background(), server.URL, "whisper-large-v3", bytes.NewReader([]byte("audio")), "audio/wav", "token")
	require.NoError(t, err)
	assert.Equal(t, "whisper-large-v3", receivedModel)
}

func TestTranscribe_NoAuth(t *testing.T) {
	var receivedAuth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuth = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "ok"})
	}))
	defer server.Close()

	client := NewClient(testLogger(), true, nil)
	_, err := client.Transcribe(context.Background(), server.URL, "model", bytes.NewReader([]byte("audio")), "audio/wav", "")
	require.NoError(t, err)
	assert.Equal(t, "", receivedAuth)
}

func TestTranscribe_AuthFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	client := NewClient(testLogger(), true, nil)
	_, err := client.Transcribe(context.Background(), server.URL, "model", bytes.NewReader([]byte("audio")), "audio/wav", "bad-token")

	var transcribeErr *TranscribeError
	require.True(t, errors.As(err, &transcribeErr))
	assert.Equal(t, http.StatusUnauthorized, transcribeErr.Code)
	assert.Equal(t, "auth_failed", transcribeErr.ErrorCode)
	assert.False(t, transcribeErr.Retriable)
}

func TestTranscribe_ForbiddenFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	client := NewClient(testLogger(), true, nil)
	_, err := client.Transcribe(context.Background(), server.URL, "model", bytes.NewReader([]byte("audio")), "audio/wav", "limited-token")

	var transcribeErr *TranscribeError
	require.True(t, errors.As(err, &transcribeErr))
	assert.Equal(t, http.StatusForbidden, transcribeErr.Code)
	assert.Equal(t, "auth_failed", transcribeErr.ErrorCode)
	assert.False(t, transcribeErr.Retriable)
}

func TestTranscribe_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewClient(testLogger(), true, nil)
	_, err := client.Transcribe(context.Background(), server.URL, "model", bytes.NewReader([]byte("audio")), "audio/wav", "token")

	var transcribeErr *TranscribeError
	require.True(t, errors.As(err, &transcribeErr))
	assert.Equal(t, http.StatusBadGateway, transcribeErr.Code)
	assert.Equal(t, "service_error", transcribeErr.ErrorCode)
	assert.True(t, transcribeErr.Retriable)
}

func TestTranscribe_InvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte("not json"))
	}))
	defer server.Close()

	client := NewClient(testLogger(), true, nil)
	_, err := client.Transcribe(context.Background(), server.URL, "model", bytes.NewReader([]byte("audio")), "audio/wav", "token")

	var transcribeErr *TranscribeError
	require.True(t, errors.As(err, &transcribeErr))
	assert.Equal(t, "invalid_response", transcribeErr.ErrorCode)
	assert.True(t, transcribeErr.Retriable)
}

func TestTranscribe_EmptyText(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "   "})
	}))
	defer server.Close()

	client := NewClient(testLogger(), true, nil)
	_, err := client.Transcribe(context.Background(), server.URL, "model", bytes.NewReader([]byte("audio")), "audio/wav", "token")

	var transcribeErr *TranscribeError
	require.True(t, errors.As(err, &transcribeErr))
	assert.Equal(t, http.StatusUnprocessableEntity, transcribeErr.Code)
	assert.Equal(t, "no_speech", transcribeErr.ErrorCode)
	assert.False(t, transcribeErr.Retriable)
}

func TestTranscribe_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(3 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(testLogger(), true, nil)
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	_, err := client.Transcribe(ctx, server.URL, "model", bytes.NewReader([]byte("audio")), "audio/wav", "token")

	var transcribeErr *TranscribeError
	require.True(t, errors.As(err, &transcribeErr))
	assert.Equal(t, http.StatusGatewayTimeout, transcribeErr.Code)
	assert.Equal(t, "timeout", transcribeErr.ErrorCode)
	assert.True(t, transcribeErr.Retriable)
}

func TestTranscribe_Unreachable(t *testing.T) {
	client := NewClient(testLogger(), true, nil)
	_, err := client.Transcribe(context.Background(), "http://127.0.0.1:1", "model", bytes.NewReader([]byte("audio")), "audio/wav", "token")

	var transcribeErr *TranscribeError
	require.True(t, errors.As(err, &transcribeErr))
	assert.Equal(t, http.StatusBadGateway, transcribeErr.Code)
	assert.Equal(t, "unreachable", transcribeErr.ErrorCode)
	assert.True(t, transcribeErr.Retriable)
}

func TestTranscribe_StreamsFileContent(t *testing.T) {
	var receivedBody []byte
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedBody, _ = io.ReadAll(r.Body)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "ok"})
	}))
	defer server.Close()

	audioData := bytes.Repeat([]byte("audio-chunk-"), 100)
	client := NewClient(testLogger(), true, nil)
	_, err := client.Transcribe(context.Background(), server.URL, "model", bytes.NewReader(audioData), "audio/mpeg", "token")
	require.NoError(t, err)
	assert.Contains(t, string(receivedBody), "audio-chunk-")
}

func TestTranscribe_DefaultContentType(t *testing.T) {
	var receivedBody []byte
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedBody, _ = io.ReadAll(r.Body)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "ok"})
	}))
	defer server.Close()

	client := NewClient(testLogger(), true, nil)
	_, err := client.Transcribe(context.Background(), server.URL, "model", bytes.NewReader([]byte("data")), "", "token")
	require.NoError(t, err)
	assert.Contains(t, string(receivedBody), "application/octet-stream")
}
