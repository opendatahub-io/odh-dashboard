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
	failing := func(context.Context) (*tls.Config, error) { return nil, fmt.Errorf("denied") }
	err := serveTLSWithReload(context.Background(), testLogger(),
		func(*tls.Config) *http.Server { return &http.Server{} },
		"cert.pem", "key.pem", time.Millisecond,
		failing, failing)
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
		errCh <- serveTLSWithReload(ctx, testLogger(), factory, certFile, keyFile, 20*time.Millisecond, resolve, resolve)
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
	assertServesTLS(t, addr, certFile)

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

// TestServeTLSWithReloadEnforcesNewPolicy proves the restarted listener actually
// enforces the new policy: TLS 1.2 is accepted under Intermediate, then rejected
// (and TLS 1.3 accepted) after reloading to Modern.
func TestServeTLSWithReloadEnforcesNewPolicy(t *testing.T) {
	certFile, keyFile := writeSelfSignedCert(t)
	addr := freeAddr(t)
	intermediate := intermediateDefaults()
	modern := &tls.Config{MinVersion: tls.VersionTLS13, NextProtos: nextProtos}

	var modernOn atomic.Bool
	resolve := func(context.Context) (*tls.Config, error) {
		if modernOn.Load() {
			return modern.Clone(), nil
		}
		return intermediate.Clone(), nil
	}
	var builds atomic.Int32
	factory := func(_ *tls.Config) *http.Server {
		builds.Add(1)
		return &http.Server{Addr: addr, Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	errCh := make(chan error, 1)
	go func() {
		errCh <- serveTLSWithReload(ctx, testLogger(), factory, certFile, keyFile, 20*time.Millisecond, resolve, resolve)
	}()

	// Generation 1 (Intermediate): a TLS 1.2 client must be accepted.
	assertServesTLS(t, addr, certFile)
	if v, err := dialTLSMax(addr, certFile, tls.VersionTLS12); err != nil {
		t.Fatalf("TLS 1.2 should be accepted under Intermediate, got error: %v", err)
	} else if v != tls.VersionTLS12 {
		t.Fatalf("expected negotiated TLS 1.2, got 0x%x", v)
	}

	// Switch policy to Modern and wait for the listener to restart.
	gen1 := builds.Load()
	modernOn.Store(true)
	deadline := time.After(5 * time.Second)
	for builds.Load() <= gen1 {
		select {
		case <-deadline:
			t.Fatalf("listener did not restart after policy change (builds=%d)", builds.Load())
		case e := <-errCh:
			t.Fatalf("serve returned early: %v", e)
		case <-time.After(10 * time.Millisecond):
		}
	}

	// Generation 2 (Modern): wait for the new listener to bind (TLS 1.3 accepted),
	// then confirm TLS 1.2 is now rejected.
	okBy := time.Now().Add(3 * time.Second)
	for {
		if v, err := dialTLSMax(addr, certFile, tls.VersionTLS13); err == nil {
			if v != tls.VersionTLS13 {
				t.Errorf("expected negotiated TLS 1.3 under Modern, got 0x%x", v)
			}
			break
		}
		if time.Now().After(okBy) {
			t.Fatal("TLS 1.3 was not accepted under Modern after reload")
		}
		time.Sleep(20 * time.Millisecond)
	}
	if _, err := dialTLSMax(addr, certFile, tls.VersionTLS12); err == nil {
		t.Error("TLS 1.2 should be rejected under Modern after reload, but the handshake succeeded")
	}

	cancel()
	select {
	case <-errCh:
	case <-time.After(5 * time.Second):
		t.Fatal("serveTLSWithReload did not return after context cancel")
	}
}

// dialTLSMax dials addr trusting certFile, capping the client at maxVersion, and
// returns the negotiated TLS version (or an error if the handshake is rejected).
func dialTLSMax(addr, certFile string, maxVersion uint16) (uint16, error) {
	pemBytes, err := os.ReadFile(certFile)
	if err != nil {
		return 0, err
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(pemBytes) {
		return 0, errAppendCert
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	d := &tls.Dialer{Config: &tls.Config{RootCAs: pool, ServerName: "127.0.0.1", MinVersion: tls.VersionTLS12, MaxVersion: maxVersion}}
	conn, err := d.DialContext(ctx, "tcp", addr)
	if err != nil {
		return 0, err
	}
	defer func() { _ = conn.Close() }()
	return conn.(*tls.Conn).ConnectionState().Version, nil
}

var errAppendCert = fmt.Errorf("failed to append cert to pool")

// TestGracefulShutdownForceClosesOnTimeout verifies that when the graceful drain
// deadline passes with a request still in-flight, the server is force-closed so
// the connection does not leak across a reload generation.
func TestGracefulShutdownForceClosesOnTimeout(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	addr := ln.Addr().String()

	started := make(chan struct{})
	release := make(chan struct{})
	defer close(release)

	srv := &http.Server{
		Handler: http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
			close(started)
			<-release // block well past the drain deadline
		}),
	}
	go func() { _ = srv.Serve(ln) }()

	reqErr := make(chan error, 1)
	go func() {
		resp, err := http.Get("http://" + addr + "/") //nolint:noctx // test
		if resp != nil {
			_ = resp.Body.Close()
		}
		reqErr <- err
	}()

	select {
	case <-started:
	case <-time.After(3 * time.Second):
		t.Fatal("handler never received the request")
	}

	done := make(chan struct{})
	go func() {
		gracefulShutdown(testLogger(), srv, 50*time.Millisecond)
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("gracefulShutdown did not return")
	}

	// The force-close must terminate the in-flight request rather than leak it.
	select {
	case err := <-reqErr:
		if err == nil {
			t.Error("expected in-flight request to fail after force-close")
		}
	case <-time.After(3 * time.Second):
		t.Fatal("in-flight request was not force-closed (connection leaked)")
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

func assertServesTLS(t *testing.T, addr, certFile string) {
	t.Helper()
	pemBytes, err := os.ReadFile(certFile)
	if err != nil {
		t.Fatalf("read cert: %v", err)
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(pemBytes) {
		t.Fatal("append cert to pool")
	}
	dialer := &tls.Dialer{Config: &tls.Config{RootCAs: pool, ServerName: "127.0.0.1", MinVersion: tls.VersionTLS12}}
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
