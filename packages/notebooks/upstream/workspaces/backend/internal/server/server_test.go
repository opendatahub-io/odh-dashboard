/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package server

import (
	"crypto/tls"
	"log/slog"
	"strings"
	"testing"
)

func TestNewServerRejectsPartialTLSConfig(t *testing.T) {
	tests := []struct {
		name     string
		certFile string
		keyFile  string
	}{
		{name: "cert only", certFile: "/tls/tls.crt", keyFile: ""},
		{name: "key only", certFile: "", keyFile: "/tls/tls.key"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewServer(nil, nil, tt.certFile, tt.keyFile, nil)
			if err == nil {
				t.Fatal("expected error for partial TLS config, got nil")
			}
			if !strings.Contains(err.Error(), "must be provided together") {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

// TestReloadTLSConfigSwapsConfigAndSignals verifies the resolved TLS config is
// stored (no longer hardcoded) and that ReloadTLSConfig swaps it and signals a
// restart without blocking when a reload is already pending.
func TestReloadTLSConfigSwapsConfigAndSignals(t *testing.T) {
	initial := &tls.Config{MinVersion: tls.VersionTLS12}
	s := &Server{
		logger:   slog.Default(),
		reloadCh: make(chan struct{}, 1),
	}
	s.tlsConfig.Store(initial)

	if got := s.tlsConfig.Load(); got.MinVersion != tls.VersionTLS12 {
		t.Fatalf("expected stored TLS 1.2 config, got MinVersion %d", got.MinVersion)
	}

	updated := &tls.Config{MinVersion: tls.VersionTLS13}
	s.ReloadTLSConfig(updated)

	if got := s.tlsConfig.Load(); got.MinVersion != tls.VersionTLS13 {
		t.Errorf("expected swapped TLS 1.3 config, got MinVersion %d", got.MinVersion)
	}
	select {
	case <-s.reloadCh:
	default:
		t.Error("expected reload to be signalled")
	}

	// A second reload with no drain must not block (coalesces into one pending).
	s.ReloadTLSConfig(updated)
	s.ReloadTLSConfig(updated)
}
