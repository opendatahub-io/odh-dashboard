package s3

import (
	"context"
	"errors"
	"net"
	"strings"
	"testing"
	"time"
)

func TestValidateKey(t *testing.T) {
	tests := []struct {
		name    string
		key     string
		wantErr bool
	}{
		{"valid simple key", "data/file.csv", false},
		{"valid nested path", "models/v2/weights.bin", false},
		{"valid with dots in name", "archive.tar.gz", false},
		{"valid single segment", "file.txt", false},
		{"empty key", "", true},
		{"null byte", "data/\x00file.csv", true},
		{"path traversal bare", "..", true},
		{"path traversal prefix", "../etc/passwd", true},
		{"path traversal middle", "data/../secret/key", true},
		{"path traversal suffix", "data/..", true},
		{"double-dot in name is ok", "..hidden", false},
		{"triple-dot segment is ok", ".../file", false},
		{"control character SOH", "data/\x01file", true},
		{"control character BEL", "data/\x07file", true},
		{"tab is allowed", "data/\tfile.csv", false},
		{"newline rejected", "data/\nfile.csv", true},
		{"carriage return rejected", "data/\rfile.csv", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateKey(tt.key)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateKey(%q) error = %v, wantErr %v", tt.key, err, tt.wantErr)
			}
			if err != nil && !errors.Is(err, ErrInvalidKey) {
				t.Errorf("validateKey(%q) error should wrap ErrInvalidKey, got %v", tt.key, err)
			}
		})
	}
}

func TestIsInternalHost(t *testing.T) {
	tests := []struct {
		hostname string
		want     bool
	}{
		{"minio.my-ns.svc.cluster.local", true},
		{"ds-pipeline.odh.svc.cluster.local", true},
		{"svc.cluster.local", false},         // only 3 parts
		{"a.b.c.d.svc.cluster.local", false}, // 7 parts
		{".ns.svc.cluster.local", false},     // empty service
		{"svc.ns.notcluster.local", false},
		{"minio.my-ns.svc.cluster.remote", false},
		{"s3.amazonaws.com", false},
		{"", false},
	}
	for _, tt := range tests {
		t.Run(tt.hostname, func(t *testing.T) {
			if got := isInternalHost(tt.hostname); got != tt.want {
				t.Errorf("isInternalHost(%q) = %v, want %v", tt.hostname, got, tt.want)
			}
		})
	}
}

func TestValidateIPAddress(t *testing.T) {
	tests := []struct {
		name    string
		ip      string
		wantErr bool
	}{
		{"private 10.x", "10.0.0.1", false},
		{"private 172.x", "172.16.0.1", false},
		{"private 192.168.x", "192.168.1.1", false},
		{"public", "8.8.8.8", false},
		{"loopback", "127.0.0.1", true},
		{"loopback other", "127.0.0.2", true},
		{"link-local", "169.254.1.1", true},
		{"reserved this-network", "0.0.0.1", true},
		{"reserved future", "240.0.0.1", true},
		{"ipv6 loopback", "::1", true},
		{"ipv6 link-local", "fe80::1", true},
		{"ipv4 multicast", "224.0.0.1", true},
		{"ipv6 multicast", "ff02::1", true},
		{"ipv6 unspecified", "::", true},
		{"ipv6 public", "2001:db8::1", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ip := net.ParseIP(tt.ip)
			err := validateIPAddress(ip)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateIPAddress(%s) error = %v, wantErr %v", tt.ip, err, tt.wantErr)
			}
		})
	}
}

func TestValidateAndNormalizeEndpoint(t *testing.T) {
	provider := &awsClientProvider{cfg: ClientConfig{AllowUnresolvableEndpoint: true}}

	t.Run("valid https external", func(t *testing.T) {
		got, err := provider.validateAndNormalizeEndpoint("https://s3.amazonaws.com")
		if err != nil {
			t.Fatal(err)
		}
		if got != "https://s3.amazonaws.com" {
			t.Errorf("got %q", got)
		}
	})

	t.Run("http allowed for in-cluster", func(t *testing.T) {
		got, err := provider.validateAndNormalizeEndpoint("http://minio.ns.svc.cluster.local:9000")
		if err != nil {
			t.Fatal(err)
		}
		if got != "http://minio.ns.svc.cluster.local:9000" {
			t.Errorf("got %q", got)
		}
	})

	t.Run("http rejected for external", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("http://s3.amazonaws.com")
		if err == nil {
			t.Error("expected error for external http")
		}
	})

	t.Run("empty endpoint", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("")
		if err == nil {
			t.Error("expected error for empty")
		}
	})

	t.Run("no hostname", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://")
		if err == nil {
			t.Error("expected error for missing hostname")
		}
	})

	t.Run("unsupported scheme", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("ftp://s3.example.com")
		if err == nil {
			t.Error("expected error for ftp scheme")
		}
	})

	t.Run("loopback IP blocked", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://127.0.0.1:9000")
		if err == nil {
			t.Error("expected error for loopback IP")
		}
	})

	t.Run("link-local IP blocked", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://169.254.1.1:9000")
		if err == nil {
			t.Error("expected error for link-local IP")
		}
	})

	t.Run("private IP allowed", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://10.0.0.1:9000")
		if err != nil {
			t.Errorf("private IP should be allowed: %v", err)
		}
	})

	t.Run("hostname endpoint accepted for dial-time validation", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://nonexistent.invalid:443")
		if err != nil {
			t.Errorf("hostname endpoints should pass URL validation (DNS checked at dial time): %v", err)
		}
	})

	t.Run("path rejected", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://s3.example.com/some-path")
		if err == nil {
			t.Error("expected error for endpoint with path")
		}
	})

	t.Run("query string rejected", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://s3.example.com?x=y")
		if err == nil {
			t.Error("expected error for endpoint with query string")
		}
	})

	t.Run("fragment rejected", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://s3.example.com#frag")
		if err == nil {
			t.Error("expected error for endpoint with fragment")
		}
	})

	t.Run("credentials rejected", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://user:pass@s3.example.com")
		if err == nil {
			t.Error("expected error for endpoint with credentials")
		}
	})

	t.Run("trailing slash allowed", func(t *testing.T) {
		_, err := provider.validateAndNormalizeEndpoint("https://s3.example.com/")
		if err != nil {
			t.Errorf("trailing slash should be allowed: %v", err)
		}
	})
}

func TestSSRFSafeDialContext(t *testing.T) {
	dial := ssrfSafeDialContext(&net.Dialer{Timeout: 2 * time.Second}, false)

	t.Run("unresolvable hostname rejected", func(t *testing.T) {
		_, err := dial(context.Background(), "tcp", "nonexistent.invalid:443")
		if err == nil {
			t.Error("expected error for unresolvable hostname")
		}
		if !strings.Contains(err.Error(), "cannot be resolved") {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("unresolvable hostname allowed when configured", func(t *testing.T) {
		dialAllowUnresolved := ssrfSafeDialContext(&net.Dialer{Timeout: 2 * time.Second}, true)
		_, err := dialAllowUnresolved(context.Background(), "tcp", "nonexistent.invalid:443")
		// Will fail to connect, but should NOT fail on "cannot be resolved"
		if err != nil && strings.Contains(err.Error(), "cannot be resolved") {
			t.Errorf("should allow unresolved hostname: %v", err)
		}
	})

	t.Run("loopback IP rejected at dial time", func(t *testing.T) {
		_, err := dial(context.Background(), "tcp", "localhost:443")
		if err == nil {
			t.Error("expected error for localhost (resolves to loopback)")
		}
		if !strings.Contains(err.Error(), "blocked") {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("IP literal passes through to base dialer", func(t *testing.T) {
		_, err := dial(context.Background(), "tcp", "192.0.2.1:443")
		if err == nil {
			t.Error("expected dial error for unreachable IP")
		}
		if strings.Contains(err.Error(), "blocked") {
			t.Errorf("IP literal should not be re-validated at dial time: %v", err)
		}
	})
}
