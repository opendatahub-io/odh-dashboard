package kubernetes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveDiscoveryURL(t *testing.T) {
	tests := []struct {
		name string
		data map[string]string
		want string
	}{
		{
			name: "operator format single instance",
			data: map[string]string{"evalhub.url": "https://evalhub.tenant.svc.cluster.local:8443"},
			want: "https://evalhub.tenant.svc.cluster.local:8443",
		},
		{
			name: "operator format multiple instances picks lexicographically first key",
			data: map[string]string{
				"evalhub-b.url": "https://evalhub-b.ns.svc.cluster.local:8443",
				"evalhub-a.url": "https://evalhub-a.ns.svc.cluster.local:8443",
			},
			want: "https://evalhub-a.ns.svc.cluster.local:8443",
		},
		{
			name: "legacy service-url key",
			data: map[string]string{"service-url": "https://evalhub.ns.svc.cluster.local:8443"},
			want: "https://evalhub.ns.svc.cluster.local:8443",
		},
		{
			name: "operator format preferred over legacy",
			data: map[string]string{
				"evalhub.url": "https://evalhub.new.svc.cluster.local:8443",
				"service-url": "https://evalhub.old.svc.cluster.local:8443",
			},
			want: "https://evalhub.new.svc.cluster.local:8443",
		},
		{
			name: "empty ConfigMap data",
			data: map[string]string{},
			want: "",
		},
		{
			name: "whitespace-only values ignored",
			data: map[string]string{"evalhub.url": "  ", "service-url": "  "},
			want: "",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := resolveDiscoveryURL(tc.data)
			assert.Equal(t, tc.want, got)
		})
	}
}

func TestValidateServiceURL_Valid(t *testing.T) {
	valid := []string{
		"http://evalhub.ns.svc.cluster.local",
		"https://evalhub.ns.svc.cluster.local",
		"http://evalhub.ns.svc.cluster.local:8080",
		"https://evalhub.my-tenant.svc.cluster.local:8443/api",
		"http://evalhub.ns.svc",
		"https://evalhub.ns.svc:9090",
		"http://evalhub-v2.ns.svc.cluster.local:8080",
	}
	for _, u := range valid {
		t.Run(u, func(t *testing.T) {
			err := validateServiceURL(u)
			require.NoError(t, err)
		})
	}
}

func TestValidateServiceURL_Invalid(t *testing.T) {
	tests := []struct {
		name string
		url  string
		want string
	}{
		{"external host", "https://evil.example.com/steal", "not a cluster-internal service"},
		{"bare IP", "http://10.0.0.5:8080", "not a cluster-internal service"},
		{"localhost", "http://localhost:8080", "not a cluster-internal service"},
		{"ftp scheme", "ftp://evalhub.ns.svc.cluster.local", "unsupported scheme"},
		{"no scheme", "evalhub.ns.svc.cluster.local", "unsupported scheme"},
		{"embedded credentials", "http://admin:pass@evalhub.ns.svc.cluster.local", "embedded credentials"},
		{"empty host", "http://", "must contain a hostname"},
		{"javascript", "javascript:alert(1)", "unsupported scheme"},
		{"arbitrary svc SSRF", "http://token-sink.attacker-ns.svc:8080", "does not match expected EvalHub service prefix"},
		{"non-evalhub prefix", "http://my-evalhub.ns.svc.cluster.local", "does not match expected EvalHub service prefix"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateServiceURL(tc.url)
			require.Error(t, err)
			assert.Contains(t, err.Error(), tc.want)
		})
	}
}
