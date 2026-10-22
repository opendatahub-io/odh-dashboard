package proxy

import (
	"crypto/tls"
	"crypto/x509"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"testing"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestDataRegistryReverseProxyUsesConfiguredRootCAs(t *testing.T) {
	roots := x509.NewCertPool()
	target, err := url.Parse("https://registry.example")
	if err != nil {
		t.Fatalf("url.Parse() error = %v", err)
	}
	proxy := NewDataRegistryReverseProxy(DataRegistryProxyConfig{
		TargetURL: func() *url.URL { return target },
		RootCAs:   roots,
	})

	transport, ok := proxy.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("proxy transport type = %T, want *http.Transport", proxy.Transport)
	}
	if transport.TLSClientConfig.RootCAs != roots {
		t.Fatal("proxy transport did not use the configured root CA pool")
	}
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
