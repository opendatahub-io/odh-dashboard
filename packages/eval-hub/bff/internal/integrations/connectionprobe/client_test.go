package connectionprobe

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"fmt"
	"io"
	"log/slog"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTLSTestServer(t *testing.T, hostname string) *httptest.Server {
	t.Helper()

	caPublicKey, caPrivateKey, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	caTemplate := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "test CA"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		KeyUsage:              x509.KeyUsageCertSign,
		BasicConstraintsValid: true,
		IsCA:                  true,
	}
	caDER, err := x509.CreateCertificate(rand.Reader, caTemplate, caTemplate, caPublicKey, caPrivateKey)
	require.NoError(t, err)
	caCert, err := x509.ParseCertificate(caDER)
	require.NoError(t, err)

	serverPublicKey, serverPrivateKey, err := ed25519.GenerateKey(rand.Reader)
	require.NoError(t, err)
	serverTemplate := &x509.Certificate{
		SerialNumber: big.NewInt(2),
		Subject:      pkix.Name{CommonName: hostname},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		DNSNames:     []string{hostname},
	}
	serverDER, err := x509.CreateCertificate(rand.Reader, serverTemplate, caCert, serverPublicKey, caPrivateKey)
	require.NoError(t, err)

	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"chatcmpl-123","choices":[{"message":{"role":"assistant","content":"ok"}}]}`))
	}))
	server.TLS = &tls.Config{Certificates: []tls.Certificate{{Certificate: [][]byte{serverDER}, PrivateKey: serverPrivateKey}}}
	server.StartTLS()
	t.Cleanup(server.Close)

	return server
}

func setProbeDialTarget(t *testing.T, client *ConnectionProbeClient, server *httptest.Server) {
	t.Helper()

	transport, ok := client.httpClient.Transport.(*http.Transport)
	require.True(t, ok, "probe should use an HTTP transport when custom roots are configured")
	transport.DialContext = func(ctx context.Context, network, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, network, server.Listener.Addr().String())
	}
}

func TestIsPrivateIP(t *testing.T) {
	tests := []struct {
		name     string
		ip       string
		expected bool
	}{
		{"loopback IPv4", "127.0.0.1", true},
		{"loopback IPv4 alt", "127.0.0.2", true},
		{"RFC1918 10.x", "10.0.0.1", true},
		{"RFC1918 10.x high", "10.255.255.255", true},
		{"RFC1918 172.16.x", "172.16.0.1", true},
		{"RFC1918 172.31.x", "172.31.255.255", true},
		{"RFC1918 192.168.x", "192.168.1.1", true},
		{"RFC1918 192.168.0.0", "192.168.0.0", true},
		{"public IP", "8.8.8.8", false},
		{"public IP 2", "1.1.1.1", false},
		{"public 172.32.x (outside range)", "172.32.0.1", false},
		{"public 192.169.x", "192.169.1.1", false},
		{"loopback IPv6", "::1", true},
		{"unique local IPv6 fc00", "fc00::1", true},
		{"unique local IPv6 fd00", "fd00::1", true},
		{"public IPv6", "2001:db8::1", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ip := net.ParseIP(tc.ip)
			require.NotNil(t, ip, "failed to parse IP: %s", tc.ip)
			assert.Equal(t, tc.expected, isPrivateIP(ip))
		})
	}
}

func TestIsInternalHost(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected bool
	}{
		{"cluster-local service", "http://svc.default.svc.cluster.local:8080", true},
		{"cluster-local HTTPS", "https://my-svc.ns.svc.cluster.local/path", true},
		{"external host", "https://api.example.com", false},
		{"external with port", "https://api.example.com:443/v1", false},
		{"partial match not suffix", "https://not-svc.cluster.local.evil.com", false},
		{"empty string", "", false},
		{"invalid URL", "://bad", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, isInternalHost(tc.url))
		})
	}
}

func TestValidateBaseURL(t *testing.T) {
	tests := []struct {
		name      string
		baseURL   string
		allowHTTP bool
		wantErr   bool
		errMsg    string
	}{
		{"valid HTTPS", "https://api.example.com/v1", false, false, ""},
		{"valid HTTP with allowHTTP", "http://localhost:8080", true, false, ""},
		{"HTTP without allowHTTP", "http://api.example.com", false, true, "must use HTTPS in production"},
		{"invalid scheme ftp", "ftp://files.example.com", false, true, "HTTP or HTTPS scheme"},
		{"no scheme", "api.example.com", false, true, "HTTP or HTTPS scheme"},
		{"empty hostname", "https://", false, true, "valid hostname"},
		{"valid with path", "https://example.com/api/v1", false, false, ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateBaseURL(tc.baseURL, tc.allowHTTP)
			if tc.wantErr {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.errMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNewConnectionProbeClient_InternalHost(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	client, err := NewConnectionProbeClient(
		logger,
		"http://my-svc.default.svc.cluster.local:8080",
		"secret-key",
		"model",
		&ClientOptions{SkipSSRFValidation: true},
	)

	require.NoError(t, err)
	require.NotNil(t, client)
	assert.Equal(t, "http://my-svc.default.svc.cluster.local:8080", client.baseURL)
	assert.Equal(t, "secret-key", client.secretValue)
	assert.Equal(t, "model", client.sourceType)
	assert.True(t, client.skipSSRFValidation)
}

func TestNewConnectionProbeClient_InternalHTTPSKeepsTLSBypass(t *testing.T) {
	const hostname = "model.ns.svc.cluster.local"
	server := newTLSTestServer(t, hostname)
	port := server.Listener.Addr().(*net.TCPAddr).Port
	baseURL := "https://" + net.JoinHostPort(hostname, fmt.Sprint(port)) + "/v1"
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	request := models.VerifyConnectionRequest{ModelID: "test-model"}

	client, err := NewConnectionProbeClient(
		logger,
		baseURL,
		"test-api-key",
		"model",
		&ClientOptions{SkipSSRFValidation: true, RootCAs: x509.NewCertPool()},
	)
	require.NoError(t, err)
	setProbeDialTarget(t, client, server)

	response, err := client.Probe(context.Background(), request)
	require.NoError(t, err, "internal endpoints retain the original TLS verification bypass")
	assert.True(t, response.Success)
}

func TestNewConnectionProbeClient_ExplicitTLSVerificationBypass(t *testing.T) {
	const hostname = "api.example.com"
	server := newTLSTestServer(t, hostname)
	port := server.Listener.Addr().(*net.TCPAddr).Port
	baseURL := "https://" + net.JoinHostPort(hostname, fmt.Sprint(port)) + "/v1"
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	client, err := NewConnectionProbeClient(
		logger,
		baseURL,
		"test-api-key",
		"model",
		&ClientOptions{
			SkipSSRFValidation:  true,
			SkipTLSVerification: true,
			RootCAs:             x509.NewCertPool(),
		},
	)
	require.NoError(t, err)
	setProbeDialTarget(t, client, server)

	response, err := client.Probe(context.Background(), models.VerifyConnectionRequest{ModelID: "test-model"})
	require.NoError(t, err)
	assert.True(t, response.Success)
}

func TestNewConnectionProbeClient_ExternalHost(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	client, err := NewConnectionProbeClient(
		logger,
		"https://api.example.com/v1",
		"bearer-token",
		"agent",
		&ClientOptions{},
	)

	require.NoError(t, err)
	require.NotNil(t, client)
	assert.Equal(t, "https://api.example.com/v1", client.baseURL)
	assert.Equal(t, "agent", client.sourceType)
	assert.False(t, client.skipSSRFValidation)
}

func TestNewConnectionProbeClient_SkipSSRFValidation(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	client, err := NewConnectionProbeClient(
		logger,
		"http://localhost:8080",
		"",
		"prerecorded",
		&ClientOptions{SkipSSRFValidation: true},
	)

	require.NoError(t, err)
	require.NotNil(t, client)
	assert.True(t, client.skipSSRFValidation)
}

func TestNewConnectionProbeClient_InvalidURL(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	_, err := NewConnectionProbeClient(
		logger,
		"ftp://invalid.example.com",
		"",
		"model",
		&ClientOptions{},
	)

	require.Error(t, err)
	var probeErr *ConnectionProbeError
	assert.ErrorAs(t, err, &probeErr)
	assert.Equal(t, ErrCodeConnectionFailed, probeErr.Code)
}

func TestNewConnectionProbeClient_HTTPWithoutAllowHTTP(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	_, err := NewConnectionProbeClient(
		logger,
		"http://api.example.com",
		"",
		"model",
		&ClientOptions{AllowHTTP: false, SkipSSRFValidation: false},
	)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "HTTPS in production")
}

func TestNewConnectionProbeClient_NilOptions(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	client, err := NewConnectionProbeClient(
		logger,
		"https://api.example.com",
		"",
		"model",
		nil,
	)

	require.NoError(t, err)
	require.NotNil(t, client)
	assert.False(t, client.skipSSRFValidation)
}

func TestIsOpenAICompatibleResponse(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	tests := []struct {
		name     string
		body     string
		expected bool
	}{
		{
			"valid OpenAI response",
			`{"id":"chatcmpl-123","choices":[{"message":{"role":"assistant","content":"hello"}}]}`,
			true,
		},
		{
			"missing id",
			`{"choices":[{"message":{"role":"assistant","content":"hello"}}]}`,
			false,
		},
		{
			"empty choices",
			`{"id":"chatcmpl-123","choices":[]}`,
			false,
		},
		{
			"missing choices",
			`{"id":"chatcmpl-123"}`,
			false,
		},
		{
			"prediction array (AutoGluon/sklearn)",
			`{"predictions":[0.85,0.12]}`,
			false,
		},
		{
			"TensorFlow Serving response",
			`{"predictions":[[0.1,0.9]]}`,
			false,
		},
		{
			"empty body",
			``,
			false,
		},
		{
			"invalid JSON",
			`not json`,
			false,
		},
		{
			"httpbin echo response",
			`{"args":{},"data":"{\"model\":\"test\"}","headers":{},"url":"https://httpbin.org/anything/chat/completions"}`,
			false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := isOpenAICompatibleResponse([]byte(tc.body), logger)
			assert.Equal(t, tc.expected, result)
		})
	}
}
