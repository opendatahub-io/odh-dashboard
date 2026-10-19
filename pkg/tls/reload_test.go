package tls

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"
)

func TestTLSConfigEqual(t *testing.T) {
	base := &tls.Config{
		MinVersion:       tls.VersionTLS12,
		CipherSuites:     []uint16{tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256},
		CurvePreferences: []tls.CurveID{tls.X25519},
	}
	tests := []struct {
		name string
		a, b *tls.Config
		want bool
	}{
		{"both nil", nil, nil, true},
		{"one nil", base, nil, false},
		{"identical", base, base.Clone(), true},
		{
			"different min version",
			base,
			&tls.Config{MinVersion: tls.VersionTLS13, CipherSuites: base.CipherSuites, CurvePreferences: base.CurvePreferences},
			false,
		},
		{
			"different ciphers",
			base,
			&tls.Config{MinVersion: tls.VersionTLS12, CipherSuites: []uint16{tls.TLS_RSA_WITH_AES_128_GCM_SHA256}, CurvePreferences: base.CurvePreferences},
			false,
		},
		{
			"different curves",
			base,
			&tls.Config{MinVersion: tls.VersionTLS12, CipherSuites: base.CipherSuites, CurvePreferences: []tls.CurveID{tls.CurveP256}},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tlsConfigEqual(tt.a, tt.b); got != tt.want {
				t.Errorf("tlsConfigEqual = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestWatchForReloadDetectsChange(t *testing.T) {
	current := intermediateDefaults()
	changed := &tls.Config{MinVersion: tls.VersionTLS13, NextProtos: nextProtos}

	tick := make(chan time.Time, 1)
	tick <- time.Now()

	next, outcome, err := watchForReload(context.Background(), testLogger(), tick, current,
		func(context.Context) (*tls.Config, error) { return changed, nil },
		make(chan error))

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outcome != reloadRequested {
		t.Fatalf("expected reloadRequested, got %v", outcome)
	}
	if next.MinVersion != tls.VersionTLS13 {
		t.Errorf("expected new config MinVersion TLS 1.3, got %d", next.MinVersion)
	}
}

func TestWatchForReloadIgnoresUnchangedAndTransientErrors(t *testing.T) {
	current := intermediateDefaults()
	tick := make(chan time.Time)
	serveErrCh := make(chan error, 1)

	var calls atomic.Int32
	resolve := func(context.Context) (*tls.Config, error) {
		switch calls.Add(1) {
		case 1:
			return current.Clone(), nil // unchanged → no reload
		case 2:
			return nil, fmt.Errorf("transient read error") // logged, kept
		default:
			return current.Clone(), nil
		}
	}

	done := make(chan struct{})
	var gotOutcome reloadOutcome
	go func() {
		_, gotOutcome, _ = watchForReload(context.Background(), testLogger(), tick, current, resolve, serveErrCh)
		close(done)
	}()

	tick <- time.Now() // unchanged
	tick <- time.Now() // transient error
	// Neither should have triggered a reload; stop by signalling server stop.
	serveErrCh <- nil

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("watchForReload did not return")
	}
	if gotOutcome != serverStopped {
		t.Errorf("expected serverStopped after no change, got %v", gotOutcome)
	}
	if calls.Load() < 2 {
		t.Errorf("expected resolver polled at least twice, got %d", calls.Load())
	}
}

func TestWatchForReloadContextCancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, outcome, _ := watchForReload(ctx, testLogger(), make(chan time.Time), intermediateDefaults(),
		func(context.Context) (*tls.Config, error) { return intermediateDefaults(), nil },
		make(chan error))
	if outcome != contextCancelled {
		t.Errorf("expected contextCancelled, got %v", outcome)
	}
}

func TestServeTLSWithReloadInitialResolveErrorFailsClosed(t *testing.T) {
	err := serveTLSWithReload(context.Background(), testLogger(),
		func(*tls.Config) *http.Server { return &http.Server{} },
		"cert.pem", "key.pem", time.Millisecond,
		func(context.Context) (*tls.Config, error) { return nil, fmt.Errorf("denied") })
	if err == nil {
		t.Fatal("expected error when initial resolve fails, got nil")
	}
}

func TestServeTLSWithReloadServesAndRestartsOnChange(t *testing.T) {
	certFile, keyFile := writeSelfSignedCert(t)
	addr := freeAddr(t)

	intermediate := intermediateDefaults()
	modern := &tls.Config{MinVersion: tls.VersionTLS13, NextProtos: nextProtos}

	var resolveCalls atomic.Int32
	resolve := func(context.Context) (*tls.Config, error) {
		// First generation: Intermediate (TLS 1.2). After a couple polls: Modern (TLS 1.3).
		if resolveCalls.Add(1) <= 2 {
			return intermediate.Clone(), nil
		}
		return modern.Clone(), nil
	}

	var builds atomic.Int32
	factory := func(cfg *tls.Config) *http.Server {
		builds.Add(1)
		return &http.Server{
			Addr:    addr,
			Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }),
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errCh := make(chan error, 1)
	go func() {
		errCh <- serveTLSWithReload(ctx, testLogger(), factory, certFile, keyFile, 20*time.Millisecond, resolve)
	}()

	// Wait until at least a second server generation is built (the reload happened).
	deadline := time.After(5 * time.Second)
	for builds.Load() < 2 {
		select {
		case <-deadline:
			t.Fatalf("listener did not restart on profile change (builds=%d)", builds.Load())
		case err := <-errCh:
			t.Fatalf("serveTLSWithReload returned early: %v", err)
		case <-time.After(10 * time.Millisecond):
		}
	}

	// The current generation should serve over TLS.
	assertServesTLS(t, addr)

	cancel()
	select {
	case err := <-errCh:
		if err != nil {
			t.Errorf("expected nil error on context cancel, got %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("serveTLSWithReload did not return after context cancel")
	}
}

// --- test helpers ---

func writeSelfSignedCert(t *testing.T) (certFile, keyFile string) {
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
		KeyUsage:     x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
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

// freeAddr reserves a free localhost port and returns its address. The listener
// is closed before returning so the port can be rebound by the server under test.
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

func assertServesTLS(t *testing.T, addr string) {
	t.Helper()
	dialer := &tls.Dialer{Config: &tls.Config{InsecureSkipVerify: true}} //nolint:gosec // test-only self-signed cert
	deadline := time.Now().Add(3 * time.Second)
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
		conn, err := dialer.DialContext(ctx, "tcp", addr)
		cancel()
		if err == nil {
			_ = conn.Close()
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("server did not accept TLS connection on %s: %v", addr, err)
		}
		time.Sleep(20 * time.Millisecond)
	}
}
