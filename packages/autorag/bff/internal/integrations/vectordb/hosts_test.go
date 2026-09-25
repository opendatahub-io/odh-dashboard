package vectordb

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsLocalNetworkHost(t *testing.T) {
	tests := []struct {
		name string
		host string
		want bool
	}{
		{"localhost lowercase", "localhost", true},
		{"localhost mixed case", "LocalHost", true},
		{"ipv4 loopback", "127.0.0.1", true},
		{"ipv6 loopback", "::1", true},
		{"in-cluster service dns", "milvus-service.milvus.svc.cluster.local", true},
		{"in-cluster dns mixed case", "Milvus-Service.MILVUS.SVC.CLUSTER.LOCAL", true},
		{"bare cluster.local has no leading label, not matched", "cluster.local", false},
		{"external hostname", "maas.apps.example.com", false},
		{"public ip", "10.0.0.15", false},
		{"empty host", "", false},
		{"cluster.local as prefix, not suffix", "cluster.local.evil.com", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, isLocalNetworkHost(tt.host))
		})
	}
}
