package s3

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
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

func TestValidateAndNormalizeEndpoint_RejectsPrivateIP_10(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://10.0.0.1:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "RFC-1918")
}

func TestValidateAndNormalizeEndpoint_RejectsPrivateIP_172(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://172.16.0.1:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "RFC-1918")
}

func TestValidateAndNormalizeEndpoint_RejectsPrivateIP_192(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://192.168.1.1:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "RFC-1918")
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

func TestValidateAndNormalizeEndpoint_RejectsIPv6UniqueLocal(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://[fc00::1]:9000")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "IPv6 unique local")
}

// ---------------------------------------------------------------------------
// S3 connect timeout configuration tests
// ---------------------------------------------------------------------------

func TestS3ConnectTimeout_Is10Seconds(t *testing.T) {
	t.Parallel()
	assert.Equal(t, 10*time.Second, s3ConnectTimeout,
		"s3ConnectTimeout must be 10s to fail fast before the OpenShift route timeout (30s)")
}

func TestNewRealS3Client_CreatesClientWithValidCredentials(t *testing.T) {
	t.Parallel()
	// Use a literal IP to avoid DNS resolution dependency in tests.
	client, err := NewRealS3Client(&S3Credentials{
		AccessKeyID:     "AKIAIOSFODNN7EXAMPLE",
		SecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
		Region:          "us-east-1",
		EndpointURL:     "https://1.2.3.4:443",
	}, S3ClientOptions{})
	assert.NoError(t, err)
	assert.NotNil(t, client)
}

func TestBuildS3AWSConfig_SetsRetryMaxAttemptsToOne(t *testing.T) {
	t.Parallel()
	cfg := buildS3AWSConfig(&S3Credentials{
		AccessKeyID:     "test-key",
		SecretAccessKey: "test-secret",
		Region:          "us-east-1",
	})
	assert.Equal(t, 1, cfg.RetryMaxAttempts)
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
