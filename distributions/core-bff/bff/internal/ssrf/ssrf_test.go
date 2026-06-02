package ssrf

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"testing"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestIsPrivateIP(t *testing.T) {
	tests := []struct {
		name    string
		ip      string
		private bool
	}{
		{"loopback IPv4", "127.0.0.1", true},
		{"loopback IPv6", "::1", true},
		{"link-local IPv4", "169.254.1.1", true},
		{"link-local IPv6", "fe80::1", true},
		{"10.0.0.0/8", "10.0.0.1", true},
		{"10.255.255.255", "10.255.255.255", true},
		{"172.16.0.0/12 low", "172.16.0.1", true},
		{"172.16.0.0/12 high", "172.31.255.255", true},
		{"172.15.x not private", "172.15.255.255", false},
		{"172.32.x not private", "172.32.0.1", false},
		{"192.168.0.0/16", "192.168.1.1", true},
		{"192.167.x not private", "192.167.1.1", false},
		{"unique-local IPv6 fc00::", "fc00::1", true},
		{"unique-local IPv6 fd00::", "fd00::1", true},
		{"unspecified IPv4", "0.0.0.0", true},
		{"unspecified IPv6", "::", true},
		{"multicast IPv4", "224.0.0.1", true},
		{"multicast IPv6", "ff02::1", true},
		{"public IPv4", "8.8.8.8", false},
		{"public IPv4 alt", "1.1.1.1", false},
		{"public IPv6", "2001:4860:4860::8888", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ip := net.ParseIP(tt.ip)
			if ip == nil {
				t.Fatalf("failed to parse IP: %s", tt.ip)
			}
			got := IsPrivateIP(ip)
			if got != tt.private {
				t.Errorf("IsPrivateIP(%s) = %v, want %v", tt.ip, got, tt.private)
			}
		})
	}
}

func TestValidateHostname(t *testing.T) {
	tests := []struct {
		name     string
		hostname string
		wantErr  bool
	}{
		{"public hostname", "google.com", false},
		{"nonexistent hostname", "this-hostname-does-not-exist-12345.invalid", true},
		{"localhost blocked", "localhost", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := testLogger()
			err := ValidateHostname(context.Background(), tt.hostname, logger)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateHostname(%q) error = %v, wantErr %v", tt.hostname, err, tt.wantErr)
			}
		})
	}
}

func TestNewRedirectValidator(t *testing.T) {
	logger := testLogger()
	validator := NewRedirectValidator(logger)

	tests := []struct {
		name     string
		status   int
		location string
		wantErr  bool
	}{
		{"200 OK ignored", http.StatusOK, "", false},
		{"301 no Location header", http.StatusMovedPermanently, "", false},
		{"301 to public host", http.StatusMovedPermanently, "https://google.com/new-path", false},
		{"302 to localhost blocked", http.StatusFound, "https://localhost/secret", true},
		{"302 to private IP blocked", http.StatusFound, "https://10.0.0.1/internal", true},
		{"307 to link-local blocked", http.StatusTemporaryRedirect, "https://169.254.1.1/metadata", true},
		{"301 relative path allowed", http.StatusMovedPermanently, "/relative/path", false},
		{"302 invalid URL", http.StatusFound, "://bad", true},
		{"400 not a redirect", http.StatusBadRequest, "https://localhost", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://example.com", nil)
			resp := &http.Response{
				StatusCode: tt.status,
				Header:     http.Header{},
				Request:    req,
			}
			if tt.location != "" {
				resp.Header.Set("Location", tt.location)
			}
			err := validator(resp)
			if (err != nil) != tt.wantErr {
				t.Errorf("redirectValidator() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestSafeDialContext_BlocksPrivateIP(t *testing.T) {
	logger := testLogger()
	dial := SafeDialContext(logger)

	_, err := dial(context.Background(), "tcp", "localhost:80")
	if err == nil {
		t.Fatal("expected error for localhost, got nil")
	}
	if !errors.Is(err, ErrSSRFBlocked) {
		t.Errorf("expected ErrSSRFBlocked, got: %v", err)
	}
}

func TestSafeDialContext_AllowedHostBypassesPrivateIPCheck(t *testing.T) {
	logger := testLogger()
	dial := SafeDialContext(logger, "localhost")

	conn, err := dial(context.Background(), "tcp", "localhost:80")
	if err != nil && errors.Is(err, ErrSSRFBlocked) {
		t.Fatalf("allowed host should bypass private-IP check, got: %v", err)
	}
	if conn != nil {
		conn.Close()
	}
}

func TestSafeDialContext_AllowedHostDoesNotAffectOthers(t *testing.T) {
	logger := testLogger()
	dial := SafeDialContext(logger, "some-other-host")

	_, err := dial(context.Background(), "tcp", "localhost:80")
	if err == nil {
		t.Fatal("expected error for localhost when not in allowed list, got nil")
	}
	if !errors.Is(err, ErrSSRFBlocked) {
		t.Errorf("expected ErrSSRFBlocked, got: %v", err)
	}
}

func TestSafeDialContext_InvalidAddress(t *testing.T) {
	logger := testLogger()
	dial := SafeDialContext(logger)

	_, err := dial(context.Background(), "tcp", "no-port")
	if err == nil {
		t.Fatal("expected error for invalid address, got nil")
	}
}

func TestSafeDialContext_UnresolvableHost(t *testing.T) {
	logger := testLogger()
	dial := SafeDialContext(logger)

	_, err := dial(context.Background(), "tcp", "this-hostname-does-not-exist-12345.invalid:443")
	if err == nil {
		t.Fatal("expected error for unresolvable host, got nil")
	}
}
