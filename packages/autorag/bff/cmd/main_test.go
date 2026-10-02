package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestNewHTTPServer_AllowsDelayedSSEWrites(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		if flusher, ok := w.(http.Flusher); ok {
			flusher.Flush()
		}
		time.Sleep(100 * time.Millisecond)
		_, _ = io.WriteString(w, "data: delayed\n\n")
	})
	server := newHTTPServer(0, handler, slog.New(slog.NewTextHandler(io.Discard, nil)))
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	go func() { _ = server.Serve(listener) }()
	defer func() { _ = server.Shutdown(context.Background()) }()

	response, err := http.Get("http://" + listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
	serverEvent, err := bufio.NewReader(response.Body).ReadString('\n')
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(serverEvent, "data: delayed") {
		t.Fatalf("response = %q, want delayed SSE event", serverEvent)
	}
	if server.WriteTimeout != 0 {
		t.Fatalf("WriteTimeout = %s, want disabled for SSE", server.WriteTimeout)
	}
}

func TestNewHTTPServer_ProtectsReadsAndIdleConnections(t *testing.T) {
	server := newHTTPServer(4000, http.NotFoundHandler(), slog.Default())
	if server.ReadTimeout != 30*time.Second {
		t.Errorf("ReadTimeout = %s, want 30s", server.ReadTimeout)
	}
	if server.IdleTimeout != time.Minute {
		t.Errorf("IdleTimeout = %s, want 1m", server.IdleTimeout)
	}
	if server.Addr != fmt.Sprintf(":%d", 4000) {
		t.Errorf("Addr = %q, want :4000", server.Addr)
	}
}

func TestHTTPServer_SSEClearsNonStreamingWriteDeadline(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = http.NewResponseController(w).SetWriteDeadline(time.Time{})
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		if flusher, ok := w.(http.Flusher); ok {
			flusher.Flush()
		}
		time.Sleep(100 * time.Millisecond)
		_, _ = io.WriteString(w, "data: delayed\n\n")
	})
	server := newHTTPServerWithWriteTimeout(0, handler, slog.Default(), 25*time.Millisecond)
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	go func() { _ = server.Serve(listener) }()
	defer func() { _ = server.Shutdown(context.Background()) }()

	response, err := http.Get("http://" + listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(body), "data: delayed") {
		t.Fatalf("body = %q, want delayed SSE event", body)
	}
}
