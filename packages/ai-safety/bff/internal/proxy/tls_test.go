package proxy

import (
	"crypto/tls"
	"io"
	"log/slog"
	"testing"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestNewTLSConfig(t *testing.T) {
	cfg := NewTLSConfig(nil, false)
	if cfg.MinVersion != tls.VersionTLS12 {
		t.Errorf("MinVersion = %d, want TLS 1.2 (%d)", cfg.MinVersion, tls.VersionTLS12)
	}
	if cfg.InsecureSkipVerify {
		t.Error("InsecureSkipVerify should be false")
	}

	cfg2 := NewTLSConfig(nil, true)
	if !cfg2.InsecureSkipVerify {
		t.Error("InsecureSkipVerify should be true")
	}
}
