package maas

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMaaSHTTPClientDoesNotReuseTrustedPrivateConnection(t *testing.T) {
	server := newTestTLSServer(t, "ok")
	rootCAs := x509.NewCertPool()
	rootCAs.AddCert(server.Certificate())
	dialCount := 0
	client := NewDefaultHTTPClient(MaaSClientConfig{
		RootCAs:  rootCAs,
		LookupIP: privateMaaSLookup,
		DialContext: func(ctx context.Context, network, _ string) (net.Conn, error) {
			dialCount++
			return (&net.Dialer{}).DialContext(ctx, network, server.Listener.Addr().String())
		},
	})
	endpoint := testMaaSEndpoint(t, server)
	trustedContext := WithTrustedMaaSOrigin(context.Background(), testMaaSOrigin(t, server))

	request, err := http.NewRequestWithContext(trustedContext, http.MethodGet, endpoint, nil)
	require.NoError(t, err)
	response, err := client.Do(request)
	require.NoError(t, err)
	_, _ = io.Copy(io.Discard, response.Body)
	_ = response.Body.Close()

	request, err = http.NewRequestWithContext(trustedContext, http.MethodGet, endpoint, nil)
	require.NoError(t, err)
	response, err = client.Do(request)
	require.NoError(t, err)
	_, _ = io.Copy(io.Discard, response.Body)
	_ = response.Body.Close()
	require.Equal(t, 1, dialCount, "trusted requests should reuse their origin-specific connection pool")

	request, err = http.NewRequest(http.MethodGet, endpoint, nil)
	require.NoError(t, err)
	_, err = client.Do(request)
	require.Error(t, err)
	require.Contains(t, err.Error(), "blocked address")
}

func TestOriginPartitionedTransportSeparatesTrustedOrigins(t *testing.T) {
	created := 0
	closed := 0
	transport := newOriginPartitionedTransport(func() http.RoundTripper {
		created++
		return &trackedRoundTripper{closed: &closed}
	})
	request := func(origin MaaSOrigin) {
		req := httptest.NewRequest(http.MethodGet, "https://maas.example", nil)
		req = req.WithContext(WithTrustedMaaSOrigin(req.Context(), origin))
		response, err := transport.RoundTrip(req)
		require.NoError(t, err)
		_ = response.Body.Close()
	}

	request(MaaSOrigin{Host: "maas-one.example", Port: "443"})
	request(MaaSOrigin{Host: "maas-two.example", Port: "443"})
	assert.Equal(t, 3, created, "public plus one pool per trusted origin")
	assert.Equal(t, 1, closed, "evicting an origin should close its idle connections")
	request(MaaSOrigin{Host: "maas-two.example", Port: "443"})
	request(MaaSOrigin{Host: "maas-one.example", Port: "443"})
	assert.Equal(t, 4, created, "obsolete trusted origins should be evicted")
	assert.Equal(t, 2, closed, "each evicted origin should close its idle connections")
}

type trackedRoundTripper struct {
	closed *int
}

func (t *trackedRoundTripper) RoundTrip(*http.Request) (*http.Response, error) {
	return &http.Response{StatusCode: http.StatusOK, Body: http.NoBody}, nil
}

func (t *trackedRoundTripper) CloseIdleConnections() {
	(*t.closed)++
}

func TestMaaSHTTPClientUsesUpdatedRootCAPoolForNewConnections(t *testing.T) {
	server := newTestTLSServer(t, "ok")
	rootCAPool := NewDynamicRootCAPool(x509.NewCertPool())
	client := NewDefaultHTTPClient(MaaSClientConfig{
		RootCAPool: rootCAPool.Current,
		LookupIP:   privateMaaSLookup,
		DialContext: func(ctx context.Context, network, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, network, server.Listener.Addr().String())
		},
	})
	endpoint := testMaaSEndpoint(t, server)
	trustedContext := WithTrustedMaaSOrigin(context.Background(), testMaaSOrigin(t, server))

	request, err := http.NewRequestWithContext(trustedContext, http.MethodGet, endpoint, nil)
	require.NoError(t, err)
	_, err = client.Do(request)
	require.Error(t, err)

	certificate := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: server.Certificate().Raw})
	require.NoError(t, rootCAPool.Update(certificate))

	request, err = http.NewRequestWithContext(trustedContext, http.MethodGet, endpoint, nil)
	require.NoError(t, err)
	response, err := client.Do(request)
	require.NoError(t, err)
	_, _ = io.Copy(io.Discard, response.Body)
	_ = response.Body.Close()
}

func TestMaaSHTTPClientUsesRotatedRootCAPoolForNewConnections(t *testing.T) {
	firstServer := newTestTLSServer(t, "first")
	secondServer := newTestTLSServer(t, "second")
	rootCAPool := NewDynamicRootCAPool(x509.NewCertPool())
	firstCertificate := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: firstServer.Certificate().Raw})
	secondCertificate := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: secondServer.Certificate().Raw})
	serverByPort := map[string]string{
		strconv.Itoa(firstServer.Listener.Addr().(*net.TCPAddr).Port):  firstServer.Listener.Addr().String(),
		strconv.Itoa(secondServer.Listener.Addr().(*net.TCPAddr).Port): secondServer.Listener.Addr().String(),
	}
	client := NewDefaultHTTPClient(MaaSClientConfig{
		RootCAPool: rootCAPool.Current,
		LookupIP:   privateMaaSLookup,
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			_, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, err
			}
			target, found := serverByPort[port]
			if !found {
				return nil, fmt.Errorf("no test server for port %s", port)
			}
			return (&net.Dialer{}).DialContext(ctx, network, target)
		},
	})
	request := func(server *httptest.Server) error {
		trustedContext := WithTrustedMaaSOrigin(context.Background(), testMaaSOrigin(t, server))
		req, err := http.NewRequestWithContext(trustedContext, http.MethodGet, testMaaSEndpoint(t, server), nil)
		if err != nil {
			return err
		}
		response, err := client.Do(req)
		if err != nil {
			return err
		}
		_, _ = io.Copy(io.Discard, response.Body)
		return response.Body.Close()
	}
	requestConcurrently := func(server *httptest.Server) {
		var waitGroup sync.WaitGroup
		errors := make(chan error, 10)
		for i := 0; i < 10; i++ {
			waitGroup.Add(1)
			go func() {
				defer waitGroup.Done()
				if err := request(server); err != nil {
					errors <- err
				}
			}()
		}
		waitGroup.Wait()
		close(errors)
		for err := range errors {
			require.NoError(t, err)
		}
	}

	require.NoError(t, rootCAPool.Update(firstCertificate))
	requestConcurrently(firstServer)

	require.NoError(t, rootCAPool.Update(secondCertificate))
	client.CloseIdleConnections()
	requestConcurrently(secondServer)
	assertCertificateNotTrusted(t, firstServer.Certificate(), rootCAPool.Current())

	client.CloseIdleConnections()
	trustedContext := WithTrustedMaaSOrigin(context.Background(), testMaaSOrigin(t, firstServer))
	req, err := http.NewRequestWithContext(trustedContext, http.MethodGet, testMaaSEndpoint(t, firstServer), nil)
	require.NoError(t, err)
	_, err = client.Do(req)
	require.Error(t, err)
}

func TestMaaSHTTPClientUsesRotatedPoolForConcurrentHandshakes(t *testing.T) {
	server, rotateCertificate := newRotatingTestTLSServer(t, "ok")
	firstTLSCertificate := server.TLS.Certificates[0]
	firstCertificate := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: server.Certificate().Raw})
	secondTLSCertificate, secondCertificate := newTestCertificate(t)
	secondCertificatePEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: secondCertificate.Raw})
	rootCAPool := NewDynamicRootCAPool(x509.NewCertPool())
	client := NewDefaultHTTPClient(MaaSClientConfig{
		RootCAPool: rootCAPool.Current,
		LookupIP:   privateMaaSLookup,
		DialContext: func(ctx context.Context, network, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, network, server.Listener.Addr().String())
		},
	})
	endpoint := testMaaSEndpoint(t, server)
	requestConcurrently := func() {
		trustedContext := WithTrustedMaaSOrigin(context.Background(), testMaaSOrigin(t, server))
		var waitGroup sync.WaitGroup
		errors := make(chan error, 20)
		for i := 0; i < 20; i++ {
			waitGroup.Add(1)
			go func() {
				defer waitGroup.Done()
				req, err := http.NewRequestWithContext(trustedContext, http.MethodGet, endpoint, nil)
				if err != nil {
					errors <- err
					return
				}
				response, err := client.Do(req)
				if err != nil {
					errors <- err
					return
				}
				_, _ = io.Copy(io.Discard, response.Body)
				if err := response.Body.Close(); err != nil {
					errors <- err
				}
			}()
		}
		waitGroup.Wait()
		close(errors)
		for err := range errors {
			require.NoError(t, err)
		}
	}

	for _, rotation := range []struct {
		certificate []byte
		serverCert  tls.Certificate
	}{
		{certificate: firstCertificate, serverCert: firstTLSCertificate},
		{certificate: secondCertificatePEM, serverCert: secondTLSCertificate},
		{certificate: firstCertificate, serverCert: firstTLSCertificate},
	} {
		rotateCertificate(rotation.serverCert)
		require.NoError(t, rootCAPool.Update(rotation.certificate))
		client.CloseIdleConnections()
		requestConcurrently()
	}
}

func TestMaaSHTTPClientPublishesPoolReplacementDuringHandshake(t *testing.T) {
	server := newTestTLSServer(t, "ok")
	firstCertificate := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: server.Certificate().Raw})
	_, secondCertificate := newTestCertificate(t)
	secondCertificatePEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: secondCertificate.Raw})
	rootCAPool := NewDynamicRootCAPool(x509.NewCertPool())
	require.NoError(t, rootCAPool.Update(firstCertificate))
	handshakeStarted := make(chan struct{})
	releaseHandshake := make(chan struct{})
	client := NewDefaultHTTPClient(MaaSClientConfig{
		RootCAPool: rootCAPool.Current,
		LookupIP:   privateMaaSLookup,
		DialContext: func(ctx context.Context, network, _ string) (net.Conn, error) {
			connection, err := (&net.Dialer{}).DialContext(ctx, network, server.Listener.Addr().String())
			if err != nil {
				return nil, err
			}
			return &blockingConn{
				Conn:    connection,
				started: handshakeStarted,
				release: releaseHandshake,
			}, nil
		},
	})
	trustedContext := WithTrustedMaaSOrigin(context.Background(), testMaaSOrigin(t, server))
	request, err := http.NewRequestWithContext(trustedContext, http.MethodGet, testMaaSEndpoint(t, server), nil)
	require.NoError(t, err)
	requestDone := make(chan error, 1)
	go func() {
		response, requestErr := client.Do(request)
		if requestErr == nil {
			_, _ = io.Copy(io.Discard, response.Body)
			requestErr = response.Body.Close()
		}
		requestDone <- requestErr
	}()
	<-handshakeStarted

	require.NoError(t, rootCAPool.Update(secondCertificatePEM))
	close(releaseHandshake)
	require.NoError(t, <-requestDone)
}

type blockingConn struct {
	net.Conn
	started   chan struct{}
	release   <-chan struct{}
	startOnce sync.Once
}

func (c *blockingConn) blockHandshake() {
	c.startOnce.Do(func() { close(c.started) })
	<-c.release
}

func (c *blockingConn) Read(p []byte) (int, error) {
	c.blockHandshake()
	return c.Conn.Read(p)
}

func (c *blockingConn) Write(p []byte) (int, error) {
	c.blockHandshake()
	return c.Conn.Write(p)
}

func privateMaaSLookup(context.Context, string) ([]net.IP, error) {
	return []net.IP{net.ParseIP("10.0.9.209")}, nil
}

func testMaaSEndpoint(t *testing.T, server *httptest.Server) string {
	t.Helper()
	port := server.Listener.Addr().(*net.TCPAddr).Port
	return fmt.Sprintf("https://maas.apps.cluster:%d", port)
}

func testMaaSOrigin(t *testing.T, server *httptest.Server) MaaSOrigin {
	t.Helper()
	port := server.Listener.Addr().(*net.TCPAddr).Port
	return MaaSOrigin{Host: "maas.apps.cluster", Port: strconv.Itoa(port)}
}
