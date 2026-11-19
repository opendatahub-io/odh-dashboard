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
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// writeCertPairWithSerial writes a self-signed pair for 127.0.0.1 into dir,
// using serial as the identifying marker a test can assert on after a rotation.
func writeCertPairWithSerial(t *testing.T, dir string, serial int64) (certFile, keyFile string) {
	t.Helper()
	return writeCertPairWithValidity(t, dir, serial, time.Now().Add(-time.Hour), time.Now().Add(time.Hour))
}

// writeCertPairWithValidity is writeCertPairWithSerial with an explicit
// validity window, for the expired and not-yet-valid rotation cases.
func writeCertPairWithValidity(t *testing.T, dir string, serial int64, notBefore, notAfter time.Time) (certFile, keyFile string) {
	t.Helper()
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	tmpl := x509.Certificate{
		SerialNumber: big.NewInt(serial),
		Subject:      pkix.Name{CommonName: "localhost"},
		NotBefore:    notBefore,
		NotAfter:     notAfter,
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

	certFile = filepath.Join(dir, "cert.pem")
	keyFile = filepath.Join(dir, "key.pem")
	if err := os.WriteFile(certFile, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0o600); err != nil {
		t.Fatalf("write cert: %v", err)
	}
	if err := os.WriteFile(keyFile, pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER}), 0o600); err != nil {
		t.Fatalf("write key: %v", err)
	}
	// Modification-time resolution can be coarse; make sure a rotation written
	// immediately after is distinguishable.
	future := time.Now().Add(time.Duration(serial) * time.Second)
	for _, p := range []string{certFile, keyFile} {
		if err := os.Chtimes(p, future, future); err != nil {
			t.Fatalf("chtimes: %v", err)
		}
	}
	return certFile, keyFile
}

func servedSerial(t *testing.T, r *CertReloader) int64 {
	t.Helper()
	cert, err := r.GetCertificate(&tls.ClientHelloInfo{ServerName: "localhost"})
	if err != nil {
		t.Fatalf("GetCertificate: %v", err)
	}
	leaf, err := x509.ParseCertificate(cert.Certificate[0])
	if err != nil {
		t.Fatalf("parse leaf: %v", err)
	}
	return leaf.SerialNumber.Int64()
}

// A rotated certificate is served without a restart: the listener re-reads the
// pair on the next handshake rather than holding the startup copy.
func TestCertReloaderPicksUpRotationWithoutRestart(t *testing.T) {
	dir := t.TempDir()
	certFile, keyFile := writeCertPairWithSerial(t, dir, 1)

	r, err := NewCertReloader(certFile, keyFile, testLogger())
	if err != nil {
		t.Fatalf("NewCertReloader: %v", err)
	}
	if got := servedSerial(t, r); got != 1 {
		t.Fatalf("serial before rotation = %d, want 1", got)
	}

	writeCertPairWithSerial(t, dir, 2)

	if got := servedSerial(t, r); got != 2 {
		t.Fatalf("serial after rotation = %d, want 2 (rotation was not picked up)", got)
	}
}

// Failure policy: an unusable rotation keeps serving the previous certificate.
// It must neither take the listener down nor downgrade the transport.
func TestCertReloaderInvalidRotationKeepsLastKnownGood(t *testing.T) {
	cases := map[string]func(t *testing.T, certFile, keyFile string){
		"truncated certificate": func(t *testing.T, certFile, _ string) {
			if err := os.WriteFile(certFile, []byte("-----BEGIN CERTIFICATE-----\ntrunc"), 0o600); err != nil {
				t.Fatal(err)
			}
			bumpModTime(t, certFile)
		},
		"empty certificate": func(t *testing.T, certFile, _ string) {
			if err := os.WriteFile(certFile, nil, 0o600); err != nil {
				t.Fatal(err)
			}
			bumpModTime(t, certFile)
		},
		"certificate removed": func(t *testing.T, certFile, _ string) {
			if err := os.Remove(certFile); err != nil {
				t.Fatal(err)
			}
		},
		"key replaced with a mismatched one": func(t *testing.T, _, keyFile string) {
			if err := os.WriteFile(keyFile, unrelatedKeyPEM(t), 0o600); err != nil {
				t.Fatal(err)
			}
			bumpModTime(t, keyFile)
		},
	}

	for name, corrupt := range cases {
		t.Run(name, func(t *testing.T) {
			dir := t.TempDir()
			certFile, keyFile := writeCertPairWithSerial(t, dir, 1)

			r, err := NewCertReloader(certFile, keyFile, testLogger())
			if err != nil {
				t.Fatalf("NewCertReloader: %v", err)
			}

			corrupt(t, certFile, keyFile)

			cert, err := r.GetCertificate(&tls.ClientHelloInfo{ServerName: "localhost"})
			if err != nil {
				t.Fatalf("an invalid rotation must not fail the handshake: %v", err)
			}
			if cert == nil {
				t.Fatal("an invalid rotation must not drop the certificate")
			}
			if got := servedSerial(t, r); got != 1 {
				t.Fatalf("serial after an invalid rotation = %d, want the previous 1", got)
			}
		})
	}
}

// A parseable, matching pair outside its validity window is not a usable
// replacement: the previous certificate keeps being served.
func TestCertReloaderRejectsRotationOutsideValidityWindow(t *testing.T) {
	now := time.Now()
	for name, window := range map[string][2]time.Time{
		"expired":       {now.Add(-2 * time.Hour), now.Add(-time.Hour)},
		"not yet valid": {now.Add(time.Hour), now.Add(2 * time.Hour)},
	} {
		t.Run(name, func(t *testing.T) {
			dir := t.TempDir()
			certFile, keyFile := writeCertPairWithSerial(t, dir, 1)
			r, err := NewCertReloader(certFile, keyFile, testLogger())
			if err != nil {
				t.Fatalf("NewCertReloader: %v", err)
			}

			writeCertPairWithValidity(t, dir, 2, window[0], window[1])
			if got := servedSerial(t, r); got != 1 {
				t.Fatalf("serial after a %s rotation = %d, want the previous 1", name, got)
			}

			writeCertPairWithSerial(t, dir, 3)
			if got := servedSerial(t, r); got != 3 {
				t.Fatalf("serial after a valid rotation = %d, want 3", got)
			}
		})
	}
}

// A later good rotation is still picked up after a bad one.
func TestCertReloaderRecoversAfterAnInvalidRotation(t *testing.T) {
	dir := t.TempDir()
	certFile, keyFile := writeCertPairWithSerial(t, dir, 1)

	r, err := NewCertReloader(certFile, keyFile, testLogger())
	if err != nil {
		t.Fatalf("NewCertReloader: %v", err)
	}

	if err := os.WriteFile(certFile, []byte("garbage"), 0o600); err != nil {
		t.Fatal(err)
	}
	bumpModTime(t, certFile)
	if got := servedSerial(t, r); got != 1 {
		t.Fatalf("serial = %d, want the previous 1", got)
	}

	writeCertPairWithSerial(t, dir, 3)
	if got := servedSerial(t, r); got != 3 {
		t.Fatalf("serial after recovery = %d, want 3", got)
	}
}

// Startup is fail-closed: a pair that does not load must not produce a server.
func TestNewCertReloaderFailsClosedOnAnUnusablePair(t *testing.T) {
	dir := t.TempDir()
	certFile := filepath.Join(dir, "cert.pem")
	keyFile := filepath.Join(dir, "key.pem")
	if err := os.WriteFile(certFile, []byte("not a certificate"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(keyFile, []byte("not a key"), 0o600); err != nil {
		t.Fatal(err)
	}

	if _, err := NewCertReloader(certFile, keyFile, testLogger()); err == nil {
		t.Fatal("expected NewCertReloader to fail closed on an unusable pair")
	}

	if _, err := NewCertReloader(filepath.Join(dir, "absent.pem"), keyFile, testLogger()); err == nil {
		t.Fatal("expected NewCertReloader to fail closed on a missing file")
	}
}

// End to end through the serve loop: a live listener presents the rotated
// certificate on a new connection, with no profile change and no restart.
func TestServeTLSWithReloadServesRotatedCertificate(t *testing.T) {
	dir := t.TempDir()
	certFile, keyFile := writeCertPairWithSerial(t, dir, 1)
	addr := freeAddr(t)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	factory := func(*tls.Config) *http.Server {
		return &http.Server{
			Addr:              addr,
			Handler:           http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }),
			ReadHeaderTimeout: 5 * time.Second,
		}
	}
	steady := func(context.Context) (*tls.Config, error) { return intermediateDefaults(), nil }

	done := make(chan error, 1)
	go func() {
		done <- serveTLSWithReload(ctx, testLogger(), factory, certFile, keyFile, time.Hour, steady, steady)
	}()

	if got := dialServedSerial(t, addr); got != 1 {
		t.Fatalf("serial before rotation = %d, want 1", got)
	}

	writeCertPairWithSerial(t, dir, 2)

	if got := dialServedSerial(t, addr); got != 2 {
		t.Fatalf("serial after rotation = %d, want 2 (the live listener did not pick up the rotation)", got)
	}

	cancel()
	if err := <-done; err != nil {
		t.Fatalf("serve returned %v", err)
	}
}

// dialServedSerial completes a TLS handshake and returns the serial of the leaf
// the server presented. Verification is skipped because the certificate is
// self-signed; the test is about which certificate is served, not about trust.
func dialServedSerial(t *testing.T, addr string) int64 {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for {
		// The dialer deadline bounds both the TCP connect and the handshake, so
		// a listener that accepts but stalls cannot hang the test.
		dialer := &net.Dialer{Deadline: deadline}
		conn, err := tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{InsecureSkipVerify: true, ServerName: "localhost"}) //nolint:gosec // G402: self-signed fixture; the assertion is on which cert is served
		if err == nil {
			defer func() { _ = conn.Close() }()
			return conn.ConnectionState().PeerCertificates[0].SerialNumber.Int64()
		}
		if !isConnRefused(err) || time.Now().After(deadline) {
			t.Fatalf("dial %s: %v", addr, err)
		}
		time.Sleep(20 * time.Millisecond)
	}
}

// unrelatedKeyPEM returns a valid EC key that does not match any certificate
// written by writeCertPairWithSerial, for the mismatched-pair rotation case.
func unrelatedKeyPEM(t *testing.T) []byte {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	der, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		t.Fatalf("marshal key: %v", err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: der})
}

func bumpModTime(t *testing.T, path string) {
	t.Helper()
	future := time.Now().Add(time.Hour)
	if err := os.Chtimes(path, future, future); err != nil {
		t.Fatalf("chtimes: %v", err)
	}
}
