package connectionprobe

import (
	"log/slog"
	"net"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"io"
)

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
