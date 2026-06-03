package s3

import (
	"net"
	"strings"
	"testing"
)

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
	provider := &awsClientProvider{cfg: ClientConfig{AllowUnresolvedEndpoint: true}}

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

	t.Run("unresolvable hostname allowed when configured", func(t *testing.T) {
		p := &awsClientProvider{cfg: ClientConfig{AllowUnresolvedEndpoint: true}}
		_, err := p.validateAndNormalizeEndpoint("https://nonexistent.invalid:443")
		if err != nil {
			t.Errorf("should allow unresolved: %v", err)
		}
	})

	t.Run("unresolvable hostname rejected by default", func(t *testing.T) {
		p := &awsClientProvider{cfg: ClientConfig{AllowUnresolvedEndpoint: false}}
		_, err := p.validateAndNormalizeEndpoint("https://nonexistent.invalid:443")
		if err == nil {
			t.Error("expected error for unresolvable hostname")
		}
		if !strings.Contains(err.Error(), "cannot be resolved") {
			t.Errorf("unexpected error: %v", err)
		}
	})
}
