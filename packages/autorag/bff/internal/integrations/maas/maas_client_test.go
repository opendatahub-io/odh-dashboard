package maas

import (
	"context"
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

func TestListModelsAllowsLocalHTTPAndForwardsBearer(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/models", r.URL.Path)
		assert.Equal(t, "Bearer local-key", r.Header.Get("Authorization"))
		w.Header().Set("Content-Type", "application/json")
		if _, err := io.WriteString(w, `{"object":"list","data":[]}`); err != nil {
			t.Errorf("failed to write response: %v", err)
		}
	}))
	t.Cleanup(server.Close)

	client := NewDefaultMaaSClient(MaaSClientConfig{
		LookupIP: func(context.Context, string) ([]net.IP, error) {
			return []net.IP{net.ParseIP("127.0.0.1")}, nil
		},
	})
	port := server.Listener.Addr().(*net.TCPAddr).Port
	_, err := client.ListModels(context.Background(), fmt.Sprintf("http://localhost:%d", port), "local-key")
	require.NoError(t, err)
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
		{name: "private cluster address allowed", baseURL: "https://10.0.0.15/", want: "https://10.0.0.15/v1/models"},
		{name: "remote HTTP rejected", baseURL: "http://maas.apps.cluster/", wantErr: true},
		{name: "in-cluster HTTP rejected", baseURL: "http://maas-api.namespace.svc.cluster.local/", wantErr: true},
		{name: "localhost HTTP allowed", baseURL: "http://localhost:8080/", want: "http://localhost:8080/v1/models"},
		{name: "IPv4 loopback HTTP allowed", baseURL: "http://127.0.0.1:8080/", want: "http://127.0.0.1:8080/v1/models"},
		{name: "IPv6 loopback HTTP allowed", baseURL: "http://[::1]:8080/", want: "http://[::1]:8080/v1/models"},
		{name: "credentials rejected", baseURL: "https://user:pass@maas.apps.cluster", wantErr: true},
		{name: "query rejected", baseURL: "https://maas.apps.cluster?token=secret", wantErr: true},
		{name: "fragment rejected", baseURL: "https://maas.apps.cluster#models", wantErr: true},
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
