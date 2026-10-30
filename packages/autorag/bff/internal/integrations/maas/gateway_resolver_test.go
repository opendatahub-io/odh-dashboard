package maas

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type gatewayRoundTripFunc func(*http.Request) (*http.Response, error)

func (f gatewayRoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func gatewayIdentityContext() context.Context {
	return corek8s.ContextWithIdentity(context.Background(), &corek8s.RequestIdentity{Token: "user-token"})
}

func TestHTTPGatewayHostResolver(t *testing.T) {
	client := &http.Client{Transport: gatewayRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		assert.Equal(t, "https://maas-ui.test-ns.svc.cluster.local:8243/api/v1/gateway-url", req.URL.String())
		assert.Equal(t, "Bearer user-token", req.Header.Get("x-forwarded-access-token"))
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`{"data":{"url":"https://maas.apps.example.com/maas-api"}}`)),
		}, nil
	})}
	resolver := NewHTTPGatewayHostResolver(GatewayResolverConfig{
		ServiceName:     "maas-ui",
		ServicePort:     8243,
		Namespace:       "test-ns",
		TLSEnabled:      true,
		AuthTokenHeader: "x-forwarded-access-token",
		AuthTokenPrefix: "Bearer ",
		HTTPClient:      client,
	})

	origin, err := resolver.Resolve(gatewayIdentityContext())
	require.NoError(t, err)
	assert.Equal(t, MaaSOrigin{Host: "maas.apps.example.com", Port: "443"}, origin)
}

func TestHTTPGatewayHostResolverRejectsMissingIdentity(t *testing.T) {
	resolver := NewHTTPGatewayHostResolver(GatewayResolverConfig{
		HTTPClient: &http.Client{Transport: gatewayRoundTripFunc(func(*http.Request) (*http.Response, error) {
			return nil, fmt.Errorf("unexpected request")
		})},
	})

	_, err := resolver.Resolve(context.Background())
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrMaaSGatewayDiscovery)
}

func TestHTTPGatewayHostResolverRejectsInvalidResponse(t *testing.T) {
	for _, responseURL := range []string{
		"http://maas.apps.example.com/maas-api",
		"https://10.0.0.1/maas-api",
		"https://maas.apps.example.com/other",
		"https://user:secret@maas.apps.example.com/maas-api",
	} {
		t.Run(responseURL, func(t *testing.T) {
			resolver := NewHTTPGatewayHostResolver(GatewayResolverConfig{
				HTTPClient: &http.Client{Transport: gatewayRoundTripFunc(func(*http.Request) (*http.Response, error) {
					return &http.Response{
						StatusCode: http.StatusOK,
						Body:       io.NopCloser(strings.NewReader(fmt.Sprintf(`{"data":{"url":%q}}`, responseURL))),
					}, nil
				})},
			})
			_, err := resolver.Resolve(gatewayIdentityContext())
			require.Error(t, err)
			assert.ErrorIs(t, err, ErrMaaSGatewayDiscovery)
		})
	}
}

type fakeGatewayResolver struct {
	origin MaaSOrigin
	err    error
	calls  int
}

func (r *fakeGatewayResolver) Resolve(context.Context) (MaaSOrigin, error) {
	r.calls++
	return r.origin, r.err
}

func TestCachedGatewayHostResolverExpiresWithoutUsingStaleOrigin(t *testing.T) {
	now := time.Unix(100, 0)
	fake := &fakeGatewayResolver{origin: MaaSOrigin{Host: "maas.apps.example.com", Port: "443"}}
	resolver := NewCachedGatewayHostResolver(fake)
	resolver.now = func() time.Time { return now }
	resolver.ttl = time.Minute

	first, err := resolver.Resolve(context.Background())
	require.NoError(t, err)
	assert.Equal(t, fake.origin, first)
	assert.Equal(t, 1, fake.calls)

	now = now.Add(30 * time.Second)
	second, err := resolver.Resolve(context.Background())
	require.NoError(t, err)
	assert.Equal(t, first, second)
	assert.Equal(t, 1, fake.calls)

	now = now.Add(31 * time.Second)
	fake.err = ErrMaaSGatewayDiscovery
	_, err = resolver.Resolve(context.Background())
	require.Error(t, err)
	assert.Equal(t, 2, fake.calls)

	// A failure is briefly negative-cached, but the expired positive origin is
	// never returned as trusted data.
	now = now.Add(5 * time.Second)
	_, err = resolver.Resolve(context.Background())
	require.Error(t, err)
	assert.Equal(t, 2, fake.calls)

	now = now.Add(16 * time.Second)
	_, err = resolver.Resolve(context.Background())
	require.Error(t, err)
	assert.Equal(t, 3, fake.calls)
}
