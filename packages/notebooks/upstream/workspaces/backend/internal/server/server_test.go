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
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"log/slog"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/kubeflow/notebooks/workspaces/backend/api"
	"github.com/kubeflow/notebooks/workspaces/backend/internal/config"
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

func TestTLSConfigPermitsHTTP2(t *testing.T) {
	tests := []struct {
		name string
		cfg  *tls.Config
		want bool
	}{
		{"nil config", nil, true},
		{"empty cipher list (Go defaults apply)", &tls.Config{MinVersion: tls.VersionTLS12}, true},
		{"list includes ECDHE-ECDSA-AES128-GCM", &tls.Config{CipherSuites: []uint16{tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256}}, true},
		{"AES-256-only list (no required suite)", &tls.Config{CipherSuites: []uint16{tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384}}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tlsConfigPermitsHTTP2(tt.cfg); got != tt.want {
				t.Errorf("tlsConfigPermitsHTTP2 = %v, want %v", got, tt.want)
			}
		})
	}
}

// customAES256TLS12 mimics a valid Custom cluster profile pinning a single TLS 1.2
// cipher with no HTTP/2-required AES-128-GCM suite. The test cert is ECDSA, so the
// ECDHE-ECDSA variant is what a client can negotiate.
func customAES256TLS12() *tls.Config {
	return &tls.Config{
		MinVersion:   tls.VersionTLS12,
		MaxVersion:   tls.VersionTLS12,
		CipherSuites: []uint16{tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384},
		NextProtos:   []string{"h2", "http/1.1"},
	}
}

// newTestServer builds a Server with a minimal app and a reserved port, bypassing
// NewServer (which derives the addr from app.Config.Port).
func newTestServer(t *testing.T, cfg *tls.Config) *Server {
	t.Helper()
	certFile, keyFile := writeTestCert(t)
	s := &Server{
		logger:   slog.Default(),
		app:      &api.App{Config: &config.EnvConfig{}},
		addr:     freeAddr(t),
		certFile: certFile,
		keyFile:  keyFile,
		reloadCh: make(chan struct{}, 1),
	}
	s.tlsConfig.Store(cfg)
	return s
}

// TestServeStartsWithHTTP2IncompatibleCipher reproduces the reported regression: a
// valid Custom TLS 1.2 cipher profile that omits every HTTP/2-required cipher must
// still serve (over HTTP/1.1), not fail the listener with
// "http2: TLSConfig.CipherSuites is missing an HTTP/2-required AES_128_GCM_SHA256 cipher".
func TestServeStartsWithHTTP2IncompatibleCipher(t *testing.T) {
	s := newTestServer(t, customAES256TLS12())

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	errCh := make(chan error, 1)
	go func() { errCh <- s.Start(ctx) }()

	select {
	case err := <-errCh:
		t.Fatalf("Start returned early (listener failed to start): %v", err)
	case <-time.After(100 * time.Millisecond):
	}

	state := dialTLS(t, s.addr, s.certFile)
	if state.Version != tls.VersionTLS12 {
		t.Errorf("expected TLS 1.2, got 0x%x", state.Version)
	}
	if state.CipherSuite != tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 {
		t.Errorf("expected AES-256-GCM cipher, got 0x%x", state.CipherSuite)
	}
	if state.NegotiatedProtocol == "h2" {
		t.Error("server negotiated h2 despite an HTTP/2-incompatible cipher list")
	}

	cancel()
	select {
	case err := <-errCh:
		if err != nil {
			t.Errorf("expected nil error on cancel, got %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Start did not return after cancel")
	}
}

// TestServeReloadsToHTTP2IncompatibleCipher proves the live-reload path also survives
// a transition onto the HTTP/2-incompatible Custom profile: it starts on TLS 1.3 and
// reloads onto the AES-256-only TLS 1.2 profile.
func TestServeReloadsToHTTP2IncompatibleCipher(t *testing.T) {
	s := newTestServer(t, &tls.Config{MinVersion: tls.VersionTLS13, NextProtos: []string{"h2", "http/1.1"}})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	errCh := make(chan error, 1)
	go func() { errCh <- s.Start(ctx) }()

	// Generation 1 (TLS 1.3) must come up.
	dialTLS(t, s.addr, s.certFile)

	s.ReloadTLSConfig(customAES256TLS12())

	okBy := time.Now().Add(3 * time.Second)
	for {
		if state, err := dialTLSErr(s.addr, s.certFile); err == nil && state.CipherSuite == tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 {
			break
		}
		select {
		case err := <-errCh:
			t.Fatalf("Start returned during reload: %v", err)
		default:
		}
		if time.Now().After(okBy) {
			t.Fatal("listener did not serve the Custom TLS 1.2 profile after reload")
		}
		time.Sleep(20 * time.Millisecond)
	}

	cancel()
	select {
	case <-errCh:
	case <-time.After(5 * time.Second):
		t.Fatal("Start did not return after cancel")
	}
}

// --- test helpers ---

func writeTestCert(t *testing.T) (certFile, keyFile string) {
	t.Helper()
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	tmpl := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "localhost"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1")},
		DNSNames:     []string{"localhost"},
	}
	der, err := x509.CreateCertificate(rand.Reader, &tmpl, &tmpl, &priv.PublicKey, priv)
	if err != nil {
		t.Fatalf("create cert: %v", err)
	}
	keyDER, err := x509.MarshalECPrivateKey(priv)
	if err != nil {
		t.Fatalf("marshal key: %v", err)
	}
	dir := t.TempDir()
	certFile = filepath.Join(dir, "cert.pem")
	keyFile = filepath.Join(dir, "key.pem")
	if err := os.WriteFile(certFile, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0o600); err != nil {
		t.Fatalf("write cert: %v", err)
	}
	if err := os.WriteFile(keyFile, pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER}), 0o600); err != nil {
		t.Fatalf("write key: %v", err)
	}
	return certFile, keyFile
}

func freeAddr(t *testing.T) string {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("reserve port: %v", err)
	}
	addr := l.Addr().String()
	_ = l.Close()
	return addr
}

func dialTLSErr(addr, certFile string) (tls.ConnectionState, error) {
	pemBytes, err := os.ReadFile(certFile)
	if err != nil {
		return tls.ConnectionState{}, err
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(pemBytes) {
		return tls.ConnectionState{}, errAppendCert
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	d := &tls.Dialer{Config: &tls.Config{RootCAs: pool, ServerName: "127.0.0.1", MinVersion: tls.VersionTLS12, MaxVersion: tls.VersionTLS13, NextProtos: []string{"h2", "http/1.1"}}}
	conn, err := d.DialContext(ctx, "tcp", addr)
	if err != nil {
		return tls.ConnectionState{}, err
	}
	defer func() { _ = conn.Close() }()
	return conn.(*tls.Conn).ConnectionState(), nil
}

func dialTLS(t *testing.T, addr, certFile string) tls.ConnectionState {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for {
		state, err := dialTLSErr(addr, certFile)
		if err == nil {
			return state
		}
		if time.Now().After(deadline) {
			t.Fatalf("handshake with %s failed: %v", addr, err)
		}
		time.Sleep(20 * time.Millisecond)
	}
}

var errAppendCert = errors.New("failed to append cert to pool")
