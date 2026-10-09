package k8smocks

import (
	"fmt"
	"net"
	"net/http"
	"sync"
)

// MockASRTranscriptionText is the canned transcription the mock ASR server returns.
const MockASRTranscriptionText = "This is a mock audio transcription."

var (
	mockASROnce sync.Once
	mockASRURL  string
)

// MockASRServerURL lazily starts an in-process ASR server that answers any
// request with a canned OpenAI-compatible transcription response, and returns
// its base URL. The mock playground whisper models point their internal
// endpoints at this server so audio transcription runs through the BFF's real
// code path without a live ASR deployment. The server runs for the lifetime of
// the process; consecutive calls return the same URL.
func MockASRServerURL() string {
	mockASROnce.Do(func() {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			// No listener means no URL; models then get an empty endpoint and
			// transcription fails with a clear "no internal endpoint" error.
			return
		}
		server := &http.Server{
			Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				_, _ = fmt.Fprintf(w, `{"text":%q}`, MockASRTranscriptionText)
			}),
		}
		go func() { _ = server.Serve(listener) }()
		mockASRURL = "http://" + listener.Addr().String()
	})
	return mockASRURL
}
