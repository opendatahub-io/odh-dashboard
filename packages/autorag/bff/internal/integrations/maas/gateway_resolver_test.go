package maas

import (
	"context"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"io"
	"net"
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

func TestHTTPGatewayHostResolverUsesDynamicRootCAPool(t *testing.T) {
	server := newTestTLSServer(t, `{"data":{"url":"https://maas.apps.cluster/maas-api"}}`)
	rootCAPool := NewDynamicRootCAPool(x509.NewCertPool())
	resolver := NewHTTPGatewayHostResolver(GatewayResolverConfig{
		ServiceName: "maas-ui",
		ServicePort: server.Listener.Addr().(*net.TCPAddr).Port,
		Namespace:   "test-ns",
		TLSEnabled:  true,
		RootCAPool:  rootCAPool.Current,
		DialContext: func(ctx context.Context, network, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, network, server.Listener.Addr().String())
		},
	})

	_, err := resolver.Resolve(gatewayIdentityContext())
	require.Error(t, err)

	certificate := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: server.Certificate().Raw})
	require.NoError(t, rootCAPool.Update(certificate))
	origin, err := resolver.Resolve(gatewayIdentityContext())
	require.NoError(t, err)
	assert.Equal(t, MaaSOrigin{Host: "maas.apps.cluster", Port: "443"}, origin)
}

type fakeGatewayResolver struct {
	origin MaaSOrigin
	err    error
	calls  int
	onCall func(context.Context)
}

func (r *fakeGatewayResolver) Resolve(ctx context.Context) (MaaSOrigin, error) {
	r.calls++
	if r.onCall != nil {
		r.onCall(ctx)
	}
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

func TestCachedGatewayHostResolverDoesNotCacheCanceledRequest(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	fake := &fakeGatewayResolver{
		err: ErrMaaSGatewayDiscovery,
		onCall: func(context.Context) {
			cancel()
		},
	}
	resolver := NewCachedGatewayHostResolver(fake)

	_, err := resolver.Resolve(ctx)
	require.Error(t, err)
	assert.Equal(t, 1, fake.calls)

	fake.err = nil
	fake.onCall = nil
	origin, err := resolver.Resolve(context.Background())
	require.NoError(t, err)
	assert.Equal(t, fake.origin, origin)
	assert.Equal(t, 2, fake.calls)
}

func TestCachedGatewayHostResolverCanCancelWhileRefreshIsInProgress(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	fake := &fakeGatewayResolver{
		onCall: func(context.Context) {
			close(started)
			<-release
		},
	}
	resolver := NewCachedGatewayHostResolver(fake)
	firstDone := make(chan error, 1)
	go func() {
		_, err := resolver.Resolve(context.Background())
		firstDone <- err
	}()
	<-started

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := resolver.Resolve(ctx)
	assert.ErrorIs(t, err, context.Canceled)

	close(release)
	assert.NoError(t, <-firstDone)
}

func TestCachedGatewayHostResolverDoesNotCacheCallerSpecificErrors(t *testing.T) {
	fake := &fakeGatewayResolver{
		err: markGatewayDiscoveryErrorNotCacheable(ErrMaaSGatewayDiscovery),
	}
	resolver := NewCachedGatewayHostResolver(fake)

	_, err := resolver.Resolve(context.Background())
	require.Error(t, err)

	fake.err = nil
	origin, err := resolver.Resolve(context.Background())
	require.NoError(t, err)
	assert.Equal(t, fake.origin, origin)
	assert.Equal(t, 2, fake.calls)
}

func TestHTTPGatewayHostResolverMarksAuthenticationFailuresAsNonCacheable(t *testing.T) {
	for _, status := range []int{http.StatusUnauthorized, http.StatusForbidden} {
		t.Run(fmt.Sprintf("status-%d", status), func(t *testing.T) {
			resolver := NewHTTPGatewayHostResolver(GatewayResolverConfig{
				HTTPClient: &http.Client{Transport: gatewayRoundTripFunc(func(*http.Request) (*http.Response, error) {
					return &http.Response{
						StatusCode: status,
						Body:       io.NopCloser(strings.NewReader("")),
					}, nil
				})},
			})

			_, err := resolver.Resolve(gatewayIdentityContext())
			require.Error(t, err)
			assert.True(t, isNonCacheableGatewayDiscoveryError(err))
		})
	}
}

func TestCachedGatewayHostResolverDoesNotCacheHTTPAuthenticationFailure(t *testing.T) {
	calls := 0
	resolver := NewCachedGatewayHostResolver(NewHTTPGatewayHostResolver(GatewayResolverConfig{
		HTTPClient: &http.Client{Transport: gatewayRoundTripFunc(func(*http.Request) (*http.Response, error) {
			calls++
			if calls == 1 {
				return &http.Response{StatusCode: http.StatusUnauthorized, Body: http.NoBody}, nil
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"data":{"url":"https://maas.apps.example.com/maas-api"}}`)),
			}, nil
		})},
	}))

	_, err := resolver.Resolve(gatewayIdentityContext())
	require.Error(t, err)
	origin, err := resolver.Resolve(gatewayIdentityContext())
	require.NoError(t, err)
	assert.Equal(t, MaaSOrigin{Host: "maas.apps.example.com", Port: "443"}, origin)
	assert.Equal(t, 2, calls)
}
