package vectordb

import (
	"context"
	"fmt"
	"net"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsClusterServiceHost(t *testing.T) {
	tests := []struct {
		name string
		host string
		want bool
	}{
		{"in-cluster service dns", "milvus-service.milvus.svc.cluster.local", true},
		{"in-cluster dns mixed case", "Milvus-Service.MILVUS.SVC.CLUSTER.LOCAL", true},
		{"bare cluster.local has no service and namespace", "cluster.local", false},
		{"external hostname", "maas.apps.example.com", false},
		{"literal ip", "10.0.0.15", false},
		{"empty host", "", false},
		{"cluster.local as prefix, not suffix", "cluster.local.evil.com", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, isClusterServiceHost(tt.host))
		})
	}
}

func TestParseVectorEndpoints(t *testing.T) {
	tests := []struct {
		name    string
		milvus  string
		pgHost  string
		sslMode string
		wantErr bool
	}{
		{name: "milvus service plaintext", milvus: "http://milvus.team-a.svc.cluster.local:19530"},
		{name: "pg service plaintext", pgHost: "postgres.team-a.svc.cluster.local", sslMode: "disable"},
		{name: "external milvus plaintext", milvus: "http://milvus.example.com:19530", wantErr: true},
		{name: "external pg plaintext", pgHost: "db.example.com", sslMode: "disable", wantErr: true},
		{name: "literal milvus IP", milvus: "https://10.0.0.1:19530", wantErr: true},
		{name: "userinfo", milvus: "https://user:pass@milvus.example.com:19530", wantErr: true},
		{name: "query", milvus: "https://milvus.example.com:19530?token=secret", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var err error
			if tt.milvus != "" {
				_, err = parseMilvusEndpoint(tt.milvus)
			} else {
				_, err = parsePgvectorEndpoint(tt.pgHost, 5432, tt.sslMode)
			}
			if (err != nil) != tt.wantErr {
				t.Fatalf("parse endpoint error = %v, wantErr %t", err, tt.wantErr)
			}
		})
	}
}

func TestVectorSafeDialContextRejectsDNSRebindingToPrivateAddress(t *testing.T) {
	dialed := false
	dial := vectorSafeDialContext(
		func(context.Context, string, string) (net.Conn, error) {
			dialed = true
			return nil, fmt.Errorf("unexpected dial")
		},
		func(context.Context, string) ([]net.IP, error) { return []net.IP{net.ParseIP("127.0.0.1")}, nil },
		false,
	)
	if _, err := dial(context.Background(), "tcp", "public.example:443"); err == nil {
		t.Fatal("expected private resolved address to be rejected")
	}
	if dialed {
		t.Fatal("unsafe address reached dialer")
	}
}
