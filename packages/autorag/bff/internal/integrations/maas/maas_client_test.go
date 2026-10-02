package maas

import (
	"context"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClientFactoryUsesConfiguredTLSAndTransport(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/embeddings", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"data":[{"embedding":[1,2]}]}`)
	}))
	t.Cleanup(server.Close)

	rootCAs := x509.NewCertPool()
	rootCAs.AddCert(server.Certificate())
	wrapped := false
	factory := NewClientFactory(MaaSClientConfig{
		RootCAs: rootCAs,
		WrapTransport: func(rt http.RoundTripper) http.RoundTripper {
			wrapped = true
			return rt
		},
	})
	client, err := factory("https://maas.apps.cluster", "response-key")
	require.NoError(t, err)
	require.NotNil(t, client)
	assert.True(t, wrapped)
}

func TestClientFactoryDevInsecureTLSReachesResponsesClient(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"data":[{"embedding":[1]}]}`)
	}))
	t.Cleanup(server.Close)

	client, err := NewClientFactory(MaaSClientConfig{InsecureSkipVerify: true})("https://maas.apps.cluster", "response-key")
	require.NoError(t, err)
	require.NotNil(t, client)
}

func TestClientFactoryDefaultsToCertificateVerification(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"data":[{"embedding":[1]}]}`)
	}))
	t.Cleanup(server.Close)

	client, err := NewClientFactory(MaaSClientConfig{})("https://maas.apps.cluster", "response-key")
	require.NoError(t, err)
	require.NotNil(t, client)
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestListModels(t *testing.T) {
	client := NewMaaSClient(&http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		assert.Equal(t, "/maas-api/v1/models", r.URL.Path)
		assert.Equal(t, "Bearer test-key", r.Header.Get("Authorization"))
		body, err := json.Marshal(map[string]any{
			"object": "list",
			"data": []models.MaaSNativeModel{{
				ID:      "model-a",
				OwnedBy: "models",
				Ready:   true,
			}},
		})
		require.NoError(t, err)
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(string(body)))}, nil
	})})

	got, err := client.ListModels(context.Background(), "https://maas.apps.cluster/maas-api/", "test-key")
	require.NoError(t, err)
	require.Len(t, got, 1)
	assert.Equal(t, "model-a", got[0].ID)
}

func TestListModelsRejectsRemoteHTTPBeforeOutboundRequest(t *testing.T) {
	outbound := false
	client := NewMaaSClient(&http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		outbound = true
		return nil, fmt.Errorf("unexpected outbound request")
	})})

	_, err := client.ListModels(context.Background(), "http://maas-api.odh-ai-gateway-infra.svc.cluster.local:8080", "test-key")
	var maaSErr *MaaSError
	require.ErrorAs(t, err, &maaSErr)
	assert.Equal(t, ErrCodeInvalidRequest, maaSErr.Code)
	assert.Equal(t, http.StatusBadRequest, maaSErr.StatusCode)
	assert.Contains(t, maaSErr.Message, "must use HTTPS")
	assert.False(t, outbound, "rejected remote HTTP URL must not make an outbound request")
}

func TestListModelsRejectsLocalHTTP(t *testing.T) {
	client := NewMaaSClient(&http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, fmt.Errorf("unexpected outbound request")
	})})
	_, err := client.ListModels(context.Background(), "https://localhost:8080", "local-key")
	var maaSErr *MaaSError
	require.ErrorAs(t, err, &maaSErr)
	assert.Equal(t, ErrCodeInvalidRequest, maaSErr.Code)
}

func TestBuildModelsURL(t *testing.T) {
	tests := []struct {
		name    string
		baseURL string
		want    string
		wantErr bool
	}{
		{name: "root base", baseURL: "https://maas.apps.cluster/", want: "https://maas.apps.cluster/v1/models"},
		{name: "path base", baseURL: "https://maas.apps.cluster/maas-api/", want: "https://maas.apps.cluster/maas-api/v1/models"},
		{name: "private cluster address rejected", baseURL: "https://10.0.0.15/", wantErr: true},
		{name: "remote HTTP rejected", baseURL: "http://maas.apps.cluster/", wantErr: true},
		{name: "in-cluster HTTP rejected", baseURL: "http://maas-api.namespace.svc.cluster.local/", wantErr: true},
		{name: "localhost rejected", baseURL: "https://localhost:8080/", wantErr: true},
		{name: "IPv4 loopback rejected", baseURL: "https://127.0.0.1:8080/", wantErr: true},
		{name: "IPv6 loopback rejected", baseURL: "https://[::1]:8080/", wantErr: true},
		{name: "IPv4 link-local rejected", baseURL: "https://169.254.1.1/", wantErr: true},
		{name: "IPv6 link-local rejected", baseURL: "https://[fe80::1]/", wantErr: true},
		{name: "IPv6 private rejected", baseURL: "https://[fd00::1]/", wantErr: true},
		{name: "credentials rejected", baseURL: "https://user:pass@maas.apps.cluster", wantErr: true},
		{name: "query rejected", baseURL: "https://maas.apps.cluster?token=secret", wantErr: true},
		{name: "fragment rejected", baseURL: "https://maas.apps.cluster#models", wantErr: true},
		{name: "invalid port rejected", baseURL: "https://maas.apps.cluster:not-a-port", wantErr: true},
		{name: "traversal path rejected", baseURL: "https://maas.apps.cluster/../internal", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildModelsURL(tt.baseURL)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMaaSURLValidationParityBetweenDiscoveryAndResponsesFactory(t *testing.T) {
	tests := []struct {
		name    string
		baseURL string
		wantErr bool
	}{
		{name: "external route", baseURL: "https://maas.apps.cluster/maas-api/"},
		{name: "localhost", baseURL: "https://localhost", wantErr: true},
		{name: "IPv4 loopback", baseURL: "https://127.0.0.1", wantErr: true},
		{name: "IPv4 private", baseURL: "https://10.0.0.1", wantErr: true},
		{name: "IPv4 link-local", baseURL: "https://169.254.1.1", wantErr: true},
		{name: "IPv6 loopback", baseURL: "https://[::1]", wantErr: true},
		{name: "IPv6 private", baseURL: "https://[fd00::1]", wantErr: true},
		{name: "IPv6 link-local", baseURL: "https://[fe80::1]", wantErr: true},
		{name: "userinfo", baseURL: "https://user:secret@maas.apps.cluster?token=secret#fragment", wantErr: true},
		{name: "query", baseURL: "https://maas.apps.cluster?token=secret", wantErr: true},
		{name: "fragment", baseURL: "https://maas.apps.cluster#fragment", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, discoveryErr := buildModelsURL(tt.baseURL)
			_, factoryErr := NewClientFactoryWithHTTPClient(&http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
				return nil, fmt.Errorf("unexpected outbound request")
			})})(tt.baseURL, "key")
			assert.Equal(t, tt.wantErr, discoveryErr != nil)
			assert.Equal(t, tt.wantErr, factoryErr != nil)
			if tt.wantErr {
				require.Error(t, discoveryErr)
				require.Error(t, factoryErr)
				assert.NotContains(t, discoveryErr.Error(), "secret")
				assert.NotContains(t, discoveryErr.Error(), "token")
				assert.NotContains(t, factoryErr.Error(), "secret")
				assert.NotContains(t, factoryErr.Error(), "token")
			}
		})
	}
}

func TestListModelsMapsUpstreamErrors(t *testing.T) {
	client := NewMaaSClient(&http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusUnauthorized, Body: io.NopCloser(strings.NewReader("{}"))}, nil
	})})
	_, err := client.ListModels(context.Background(), "https://maas.apps.cluster", "key")
	var maaSErr *MaaSError
	require.ErrorAs(t, err, &maaSErr)
	assert.Equal(t, ErrCodeUnauthorized, maaSErr.Code)
	assert.Equal(t, http.StatusUnauthorized, maaSErr.StatusCode)
}

func TestMaaSSafeDialContextRejectsUnsafeResolvedAddress(t *testing.T) {
	baseDialed := false
	dial := maaSSafeDialContext(
		func(context.Context, string, string) (net.Conn, error) {
			baseDialed = true
			return nil, fmt.Errorf("unexpected dial")
		},
		func(context.Context, string) ([]net.IP, error) {
			return []net.IP{net.ParseIP("127.0.0.1")}, nil
		},
	)

	_, err := dial(context.Background(), "tcp", "maas.example:443")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "blocked")
	assert.False(t, baseDialed, "unsafe resolved address must not reach the dialer")
}

func TestMaaSSafeDialContextRejectsPrivateAndLinkLocalResolvedAddresses(t *testing.T) {
	for _, address := range []string{"10.0.0.1", "169.254.1.1", "fd00::1", "fe80::1"} {
		t.Run(address, func(t *testing.T) {
			baseDialed := false
			dial := maaSSafeDialContext(
				func(context.Context, string, string) (net.Conn, error) {
					baseDialed = true
					return nil, fmt.Errorf("unexpected dial")
				},
				func(context.Context, string) ([]net.IP, error) {
					return []net.IP{net.ParseIP(address)}, nil
				},
			)
			_, err := dial(context.Background(), "tcp", "maas.example:443")
			require.Error(t, err)
			assert.False(t, baseDialed)
		})
	}
}

func TestMaaSSafeDialContextRejectsNonLoopbackLocalhost(t *testing.T) {
	baseDialed := false
	dial := maaSSafeDialContext(
		func(context.Context, string, string) (net.Conn, error) {
			baseDialed = true
			return nil, fmt.Errorf("unexpected dial")
		},
		func(context.Context, string) ([]net.IP, error) {
			return []net.IP{net.ParseIP("192.0.2.10")}, nil
		},
	)

	_, err := dial(context.Background(), "tcp", "localhost:443")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "blocked")
	assert.False(t, baseDialed, "localhost resolving to a non-loopback address must not reach the dialer")
}

func TestMaaSSafeDialContextDialsValidatedAddressWithoutResolvingAgain(t *testing.T) {
	var dialedAddress string
	dial := maaSSafeDialContext(
		func(_ context.Context, _, addr string) (net.Conn, error) {
			dialedAddress = addr
			return nil, fmt.Errorf("stop after recording address")
		},
		func(context.Context, string) ([]net.IP, error) {
			return []net.IP{net.ParseIP("192.0.2.10")}, nil
		},
	)

	_, err := dial(context.Background(), "tcp", "maas.example:443")
	require.Error(t, err)
	assert.Equal(t, "192.0.2.10:443", dialedAddress)
}
