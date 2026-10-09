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
		{"arbitrary cluster-local dns", "milvus.team-a.cluster.local", true},
		{"in-cluster dns mixed case", "Milvus-Service.MILVUS.SVC.CLUSTER.LOCAL", true},
		{"bare cluster.local is not a host", "cluster.local", false},
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
		{name: "milvus arbitrary cluster local plaintext", milvus: "http://milvus.team-a.cluster.local:19530"},
		{name: "milvus localhost plaintext outside development", milvus: "http://localhost:19530", wantErr: true},
		{name: "pg service plaintext", pgHost: "postgres.team-a.svc.cluster.local", sslMode: "disable"},
		{name: "pg arbitrary cluster local plaintext", pgHost: "postgres.team-a.cluster.local", sslMode: "disable"},
		{name: "pg localhost plaintext outside development", pgHost: "localhost", sslMode: "disable", wantErr: true},
		{name: "external milvus plaintext", milvus: "http://milvus.example.com:19530", wantErr: true},
		{name: "external pg plaintext", pgHost: "db.example.com", sslMode: "disable", wantErr: true},
		{name: "external pg require without certificate verification", pgHost: "db.example.com", sslMode: "require", wantErr: true},
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

func TestParsePgvectorEndpointRejectsExternalRequire(t *testing.T) {
	_, err := parsePgvectorEndpoint("db.example.com", 5432, "require")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "verify-ca or verify-full")
}

func TestValidateForwardedMilvusEndpointDoesNotRelaxSecretValidation(t *testing.T) {
	assert.Error(t, ValidateMilvusEndpoint("http://localhost:4321"))
	assert.Error(t, ValidateMilvusEndpoint("http://10.0.0.1:4321"))
	assert.NoError(t, ValidateMilvusEndpoint("http://milvus.team-a.svc.cluster.local:19530"))

	err := ValidateForwardedMilvusEndpoint("http://milvus.team-a.svc.cluster.local:19530", "http://localhost:4321")
	assert.NoError(t, err)
	err = ValidateForwardedMilvusEndpoint("http://milvus.example.com:19530", "http://localhost:4321")
	assert.Error(t, err)
	err = ValidateForwardedMilvusEndpoint("http://milvus.team-a.svc.cluster.local:19530", "http://127.0.0.1:4321")
	assert.Error(t, err)
	err = ValidateForwardedMilvusEndpoint("http://milvus.team-a.svc.cluster.local:19530", "https://localhost:4321")
	assert.Error(t, err)
}

func TestParseVectorEndpointsAllowsLocalhostInDevelopment(t *testing.T) {
	_, err := parseMilvusEndpointWithLoopback("http://localhost:4321", true)
	assert.NoError(t, err)
	_, err = parsePgvectorEndpointWithLoopback("localhost", 5432, "disable", true)
	assert.NoError(t, err)
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
		false,
	)
	if _, err := dial(context.Background(), "tcp", "public.example:443"); err == nil {
		t.Fatal("expected private resolved address to be rejected")
	}
	if dialed {
		t.Fatal("unsafe address reached dialer")
	}
}

func TestIsBlockedVectorIPRejectsSpecialUseDestinations(t *testing.T) {
	for _, raw := range []string{
		"100.64.0.1", "192.0.0.1", "192.0.2.1", "198.18.0.1", "203.0.113.1",
		"2001:2::1", "2001:db8::1", "fc00::1", "ff02::1",
	} {
		assert.True(t, isBlockedVectorIP(net.ParseIP(raw)), raw)
	}
}

func TestVectorSafeDialContextRejectsNewIPv6SpecialUseAddressesBeforeDial(t *testing.T) {
	for _, raw := range []string{
		"100::1", "2001::1", "2001:3::1", "2001:4:112::1", "2001:20::1", "3fff::1",
	} {
		t.Run(raw, func(t *testing.T) {
			dialed := false
			dial := vectorSafeDialContext(
				func(context.Context, string, string) (net.Conn, error) {
					dialed = true
					return nil, fmt.Errorf("unexpected dial")
				},
				func(context.Context, string) ([]net.IP, error) { return []net.IP{net.ParseIP(raw)}, nil },
				false,
				false,
			)
			_, err := dial(context.Background(), "tcp", "public.example:443")
			assert.Error(t, err)
			assert.False(t, dialed)
		})
	}
}

func TestVectorSafeDialContextAllowsOnlyLoopbackForForwardedEndpoint(t *testing.T) {
	dialed := false
	dial := vectorSafeDialContext(
		func(context.Context, string, string) (net.Conn, error) {
			dialed = true
			return nil, fmt.Errorf("dial attempted")
		},
		func(context.Context, string) ([]net.IP, error) { return []net.IP{net.ParseIP("127.0.0.1")}, nil },
		false,
		true,
	)
	_, err := dial(context.Background(), "tcp", "localhost:4321")
	assert.Error(t, err)
	assert.True(t, dialed)

	dialed = false
	dial = vectorSafeDialContext(
		func(context.Context, string, string) (net.Conn, error) {
			dialed = true
			return nil, fmt.Errorf("dial attempted")
		},
		func(context.Context, string) ([]net.IP, error) { return []net.IP{net.ParseIP("10.0.0.1")}, nil },
		false,
		true,
	)
	_, err = dial(context.Background(), "tcp", "localhost:4321")
	assert.Error(t, err)
	assert.False(t, dialed)
}

func TestVectorSafeDialContextRejectsLoopbackAndMetadataForClusterHosts(t *testing.T) {
	for _, ip := range []string{"127.0.0.1", "169.254.169.254"} {
		t.Run(ip, func(t *testing.T) {
			dial := vectorSafeDialContext(
				func(context.Context, string, string) (net.Conn, error) { return nil, fmt.Errorf("unexpected dial") },
				func(context.Context, string) ([]net.IP, error) { return []net.IP{net.ParseIP(ip)}, nil },
				true,
				false,
			)
			_, err := dial(context.Background(), "tcp", "database.team-a.cluster.local:5432")
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "blocked address")
		})
	}
}
