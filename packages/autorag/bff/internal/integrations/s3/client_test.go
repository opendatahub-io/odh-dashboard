package s3

import (
	"crypto/x509"
	"errors"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestClient() *RealS3Client {
	return &RealS3Client{options: S3ClientOptions{DevMode: false}}
}

func TestNewRealS3Client_WrapsErrEndpointValidation(t *testing.T) {
	t.Parallel()
	_, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "a",
		SecretAccessKey: "b",
		Region:          "us-east-1",
		EndpointURL:     "http://s3.amazonaws.com",
	}, S3ClientOptions{})
	assert.Error(t, err)
	assert.True(t, errors.Is(err, ErrEndpointValidation))
}

// ---------------------------------------------------------------------------
// NewRealS3Client — transport / TLS tests
// ---------------------------------------------------------------------------

func TestNewRealS3Client_DefaultTransport(t *testing.T) {
	t.Parallel()
	client, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "a",
		SecretAccessKey: "b",
		Region:          "us-east-1",
		EndpointURL:     "https://10.0.0.1:9000",
	}, S3ClientOptions{})
	assert.NoError(t, err)

	httpClient, ok := client.s3Client.Options().HTTPClient.(*http.Client)
	require.True(t, ok, "HTTPClient should be *http.Client")
	transport, ok := httpClient.Transport.(*http.Transport)
	require.True(t, ok, "Transport should be *http.Transport")
	assert.Equal(t, 30*time.Second, transport.ResponseHeaderTimeout, "ResponseHeaderTimeout should be 30s")
	if transport.TLSClientConfig != nil {
		assert.Nil(t, transport.TLSClientConfig.RootCAs, "RootCAs should be nil when no custom CAs provided")
		assert.False(t, transport.TLSClientConfig.InsecureSkipVerify, "InsecureSkipVerify should be false")
	}
}

func TestNewRealS3Client_WithRootCAs(t *testing.T) {
	t.Parallel()
	pool := x509.NewCertPool()
	client, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "a",
		SecretAccessKey: "b",
		Region:          "us-east-1",
		EndpointURL:     "https://10.0.0.1:9000",
	}, S3ClientOptions{RootCAs: pool})
	assert.NoError(t, err)

	httpClient, ok := client.s3Client.Options().HTTPClient.(*http.Client)
	require.True(t, ok, "HTTPClient should be *http.Client")
	transport, ok := httpClient.Transport.(*http.Transport)
	require.True(t, ok, "Transport should be *http.Transport")
	assert.Same(t, pool, transport.TLSClientConfig.RootCAs, "RootCAs should match the provided pool")
	assert.False(t, transport.TLSClientConfig.InsecureSkipVerify, "InsecureSkipVerify should be false")
	assert.Equal(t, 30*time.Second, transport.ResponseHeaderTimeout, "ResponseHeaderTimeout should be 30s")
}

func TestNewRealS3Client_DevModeFallback(t *testing.T) {
	t.Parallel()
	client, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "a",
		SecretAccessKey: "b",
		Region:          "us-east-1",
		EndpointURL:     "https://10.0.0.1:9000",
	}, S3ClientOptions{DevMode: true})
	assert.NoError(t, err)

	httpClient, ok := client.s3Client.Options().HTTPClient.(*http.Client)
	require.True(t, ok, "HTTPClient should be *http.Client")
	transport, ok := httpClient.Transport.(*http.Transport)
	require.True(t, ok, "Transport should be *http.Transport")
	assert.True(t, transport.TLSClientConfig.InsecureSkipVerify, "InsecureSkipVerify should be true in dev mode")
	assert.Equal(t, 30*time.Second, transport.ResponseHeaderTimeout, "ResponseHeaderTimeout should be 30s")
}

// ---------------------------------------------------------------------------
// validateAndNormalizeEndpoint — SSRF protection tests
// ---------------------------------------------------------------------------

func TestValidateAndNormalizeEndpoint_AcceptsValidHTTPS(t *testing.T) {
	c := newTestClient()
	result, err := c.validateAndNormalizeEndpoint("https://s3.us-east-1.amazonaws.com")

	assert.NoError(t, err)
	assert.Equal(t, "https://s3.us-east-1.amazonaws.com", result)
}

func TestValidateAndNormalizeEndpoint_AcceptsHTTPSWithPort(t *testing.T) {
	c := newTestClient()
	result, err := c.validateAndNormalizeEndpoint("https://s3.amazonaws.com:9000")

	assert.NoError(t, err)
	assert.Equal(t, "https://s3.amazonaws.com:9000", result)
}

func TestValidateAndNormalizeEndpoint_RejectsHTTP(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("http://s3.amazonaws.com")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "HTTPS")
}

func TestValidateAndNormalizeEndpoint_RejectsEmptyEndpoint(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "empty")
}

func TestValidateAndNormalizeEndpoint_RejectsInvalidURL(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("not-a-url")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "endpoint URL must use HTTPS")
}

func TestValidateAndNormalizeEndpoint_AcceptsPrivateIPs(t *testing.T) {
	c := newTestClient()
	for _, endpoint := range []string{
		"https://10.0.0.1:9000",
		"https://100.64.0.1:9000",
		"https://172.16.0.1:9000",
		"https://192.168.1.1:9000",
		"https://[fd00::1]:9000",
	} {
		result, err := c.validateAndNormalizeEndpoint(endpoint)
		assert.NoError(t, err, "should accept %s", endpoint)
		assert.Equal(t, endpoint, result)
	}
}

func TestValidateAndNormalizeEndpoint_RejectsLoopback(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://127.0.0.1:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "loopback")
}

func TestValidateAndNormalizeEndpoint_RejectsLinkLocal(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://169.254.169.254")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "link-local")
}

func TestValidateAndNormalizeEndpoint_RejectsThisNetwork_0_0_0_0(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://0.0.0.0:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "this network")
}

func TestValidateAndNormalizeEndpoint_RejectsThisNetwork_0_0_0_1(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://0.0.0.1:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "this network")
}

func TestValidateAndNormalizeEndpoint_RejectsReservedFutureUse(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://240.0.0.1:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "reserved for future use")
}

func TestValidateAndNormalizeEndpoint_RejectsIPv6Loopback(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://[::1]:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "IPv6 loopback")
}

func TestValidateAndNormalizeEndpoint_RejectsIPv6LinkLocal(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://[fe80::1]:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "IPv6 link-local")
}

func TestValidateAndNormalizeEndpoint_AcceptsIPv6UniqueLocal(t *testing.T) {
	c := newTestClient()
	result, err := c.validateAndNormalizeEndpoint("https://[fc00::1]:9000")
	assert.NoError(t, err)
	assert.Equal(t, "https://[fc00::1]:9000", result)
}

// mockS3CodedError simulates AWS SDK errors that implement ErrorCode().
type mockS3CodedError struct {
	msg  string
	code string
}

func (e mockS3CodedError) Error() string {
	if e.msg != "" {
		return e.msg
	}
	return e.code
}

func (e mockS3CodedError) ErrorCode() string {
	return e.code
}

func TestIsS3ConditionalCreateConflict(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{name: "PreconditionFailed", err: mockS3CodedError{code: "PreconditionFailed"}, want: true},
		{name: "ConditionalRequestConflict", err: mockS3CodedError{code: "ConditionalRequestConflict"}, want: true},
		{
			name: "wrapped PreconditionFailed",
			err:  fmt.Errorf("upload failed: %w", mockS3CodedError{code: "PreconditionFailed"}),
			want: true,
		},
		{
			name: "wrapped ConditionalRequestConflict",
			err:  fmt.Errorf("upload failed: %w", mockS3CodedError{code: "ConditionalRequestConflict"}),
			want: true,
		},
		{name: "other ErrorCode", err: mockS3CodedError{code: "NoSuchKey"}, want: false},
		{name: "plain error", err: errors.New("failed"), want: false},
		{name: "nil", err: nil, want: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, isS3ConditionalCreateConflict(tt.err))
		})
	}
}
