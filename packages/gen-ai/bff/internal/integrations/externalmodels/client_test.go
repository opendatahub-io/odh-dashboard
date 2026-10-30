package externalmodels

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildMinimalWAV_ValidStructure(t *testing.T) {
	wav := buildMinimalWAV()

	// RIFF header
	assert.Equal(t, "RIFF", string(wav[0:4]))
	chunkSize := binary.LittleEndian.Uint32(wav[4:8])
	assert.Equal(t, uint32(len(wav)-8), chunkSize)
	assert.Equal(t, "WAVE", string(wav[8:12]))

	// fmt subchunk
	assert.Equal(t, "fmt ", string(wav[12:16]))
	subchunk1Size := binary.LittleEndian.Uint32(wav[16:20])
	assert.Equal(t, uint32(16), subchunk1Size) // PCM
	audioFormat := binary.LittleEndian.Uint16(wav[20:22])
	assert.Equal(t, uint16(1), audioFormat) // PCM
	numChannels := binary.LittleEndian.Uint16(wav[22:24])
	assert.Equal(t, uint16(1), numChannels) // mono
	sampleRate := binary.LittleEndian.Uint32(wav[24:28])
	assert.Equal(t, uint32(8000), sampleRate)
	byteRate := binary.LittleEndian.Uint32(wav[28:32])
	assert.Equal(t, uint32(8000), byteRate) // sampleRate * numChannels * bitsPerSample/8
	blockAlign := binary.LittleEndian.Uint16(wav[32:34])
	assert.Equal(t, uint16(1), blockAlign)
	bitsPerSample := binary.LittleEndian.Uint16(wav[34:36])
	assert.Equal(t, uint16(8), bitsPerSample)

	// data subchunk
	assert.Equal(t, "data", string(wav[36:40]))
	dataSize := binary.LittleEndian.Uint32(wav[40:44])
	assert.Equal(t, uint32(800), dataSize) // 0.1s * 8000Hz * 1 byte
	assert.Equal(t, 44+800, len(wav))

	// Audio data should be silence (0x80 for unsigned 8-bit PCM)
	for i := 44; i < len(wav); i++ {
		assert.Equal(t, byte(0x80), wav[i], "byte at offset %d should be silence", i)
	}
}

func newTestClient(t *testing.T, serverURL string, modelType models.ModelTypeEnum) *ExternalModelsClient {
	t.Helper()
	client, err := NewExternalModelsClient(
		slog.Default(),
		serverURL,
		"test-api-key",
		modelType,
		&ClientOptions{SkipSSRFValidation: true, AllowHTTP: true},
	)
	require.NoError(t, err)
	return client
}

func TestVerifyModel_Transcription_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/audio/transcriptions", r.URL.Path)
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Contains(t, r.Header.Get("Content-Type"), "multipart/form-data")

		// Verify multipart form contains file and model fields
		err := r.ParseMultipartForm(10 << 20)
		require.NoError(t, err)

		file, header, err := r.FormFile("file")
		require.NoError(t, err)
		defer file.Close()
		assert.Equal(t, "verify.wav", header.Filename)

		fileBytes, err := io.ReadAll(file)
		require.NoError(t, err)
		assert.Equal(t, len(minimalWAV), len(fileBytes))

		modelField := r.FormValue("model")
		assert.Equal(t, "whisper-large-v3", modelField)

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"text": "hello world"})
	}))
	defer server.Close()

	client := newTestClient(t, server.URL, models.ModelTypeTranscription)
	resp, err := client.VerifyModel(context.Background(), "whisper-large-v3", nil)

	require.NoError(t, err)
	assert.True(t, resp.Success)
	assert.Equal(t, "Transcription model verified successfully", resp.Message)
	assert.GreaterOrEqual(t, resp.ResponseTime, 0)
}

func TestVerifyModel_Transcription_Unauthorized(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprint(w, `{"error": "invalid api key"}`)
	}))
	defer server.Close()

	client := newTestClient(t, server.URL, models.ModelTypeTranscription)
	resp, err := client.VerifyModel(context.Background(), "whisper-large-v3", nil)

	assert.Nil(t, resp)
	require.Error(t, err)
	var extErr *ExternalModelError
	require.ErrorAs(t, err, &extErr)
	assert.Equal(t, ErrCodeUnauthorized, extErr.Code)
}

func TestVerifyModel_Transcription_InvalidResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `not json at all`)
	}))
	defer server.Close()

	client := newTestClient(t, server.URL, models.ModelTypeTranscription)
	resp, err := client.VerifyModel(context.Background(), "whisper-large-v3", nil)

	assert.Nil(t, resp)
	require.Error(t, err)
	var extErr *ExternalModelError
	require.ErrorAs(t, err, &extErr)
	assert.Equal(t, ErrCodeNotOpenAICompatible, extErr.Code)
	assert.Contains(t, extErr.Message, "not valid transcription JSON")
}

func TestVerifyModel_Transcription_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := newTestClient(t, server.URL, models.ModelTypeTranscription)
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	resp, err := client.VerifyModel(ctx, "whisper-large-v3", nil)

	assert.Nil(t, resp)
	require.Error(t, err)
	var extErr *ExternalModelError
	require.ErrorAs(t, err, &extErr)
	assert.Equal(t, ErrCodeTimeout, extErr.Code)
}

func TestVerifyModel_Transcription_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, `{"error": "internal error"}`)
	}))
	defer server.Close()

	client := newTestClient(t, server.URL, models.ModelTypeTranscription)
	resp, err := client.VerifyModel(context.Background(), "whisper-large-v3", nil)

	assert.Nil(t, resp)
	require.Error(t, err)
	var extErr *ExternalModelError
	require.ErrorAs(t, err, &extErr)
	assert.Equal(t, ErrCodeConnectionFailed, extErr.Code)
	assert.Contains(t, extErr.Message, "HTTP 500")
}

// TestPinnedDialReachesValidatedAddress proves the pinned transport connects only
// to the validated address even though the URL hostname cannot resolve: a local
// listener receives the request, with the URL's hostname preserved as the HTTP
// Host header, and the connection succeeds despite DNS being bypassed entirely.
func TestPinnedDialReachesValidatedAddress(t *testing.T) {
	hostReceived := make(chan string, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case hostReceived <- r.Host:
		default:
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"data": []}`))
	}))
	defer server.Close()

	_, port, err := net.SplitHostPort(server.Listener.Addr().String())
	require.NoError(t, err)

	client, err := NewExternalModelsClient(
		slog.Default(),
		"http://my-model.my-ns.svc.cluster.local/v1",
		"test-api-key",
		models.ModelTypeLLM,
		&ClientOptions{
			SkipSSRFValidation:  true,
			AllowHTTP:           true,
			PinnedDialAddresses: []string{net.JoinHostPort("127.0.0.1", port)},
		},
	)
	require.NoError(t, err)

	// The response is not a valid OpenAI completion, so verification fails; the
	// assertion is that the request arrived at the pinned listener with the
	// original hostname as Host.
	_, _ = client.VerifyModel(context.Background(), "my-model", nil)

	select {
	case host := <-hostReceived:
		assert.Equal(t, "my-model.my-ns.svc.cluster.local", host)
	case <-time.After(5 * time.Second):
		t.Fatal("pinned dial did not reach the validated local listener")
	}
}

// TestPinnedDialFailsClosedWithoutDNSFallback proves that when no pinned address is
// reachable, the request fails instead of falling back to resolving the URL
// hostname: the URL uses a resolvable hostname (localhost), but the pinned target
// (a loopback port with nothing listening) refuses the connection and the error
// identifies the pinned dial.
func TestPinnedDialFailsClosedWithoutDNSFallback(t *testing.T) {
	client, err := NewExternalModelsClient(
		slog.Default(),
		"http://localhost:0/v1",
		"test-api-key",
		models.ModelTypeLLM,
		&ClientOptions{
			SkipSSRFValidation:  true,
			AllowHTTP:           true,
			PinnedDialAddresses: []string{"127.0.0.1:1"},
		},
	)
	require.NoError(t, err)

	_, err = client.VerifyModel(context.Background(), "my-model", nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "pinned dial")
}
