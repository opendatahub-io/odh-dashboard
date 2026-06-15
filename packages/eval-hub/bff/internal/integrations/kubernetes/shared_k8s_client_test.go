package kubernetes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
