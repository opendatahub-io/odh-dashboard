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

func TestValidateAndNormalizeEndpoint_RejectsEmpty(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "empty")
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

func TestValidateAndNormalizeEndpoint_RejectsUnspecified(t *testing.T) {
	c := newTestClient()
	_, err := c.validateAndNormalizeEndpoint("https://0.0.0.0:9000")
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

// ---------------------------------------------------------------------------
// CSV helper function tests
// ---------------------------------------------------------------------------

func TestIsNumber(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"123", true}, {"-456", true}, {"123.456", true}, {"1.23e10", true},
		{"abc", false}, {"123abc", false}, {"", false},
	}
	for _, tt := range tests {
		assert.Equal(t, tt.expected, isNumber(tt.input), "input: %q", tt.input)
	}
}

func TestIsInteger(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"123", true}, {"-456", true}, {"0", true},
		{"123.456", false}, {"123.0", false}, {"1.23e10", false}, {"abc", false}, {"", false},
	}
	for _, tt := range tests {
		assert.Equal(t, tt.expected, isInteger(tt.input), "input: %q", tt.input)
	}
}

func TestIsBoolean(t *testing.T) {
	trueInputs := []string{"true", "false", "TRUE", "FALSE", "t", "f", "yes", "no", "y", "n", "1", "0"}
	falseInputs := []string{"maybe", "123", ""}
	for _, s := range trueInputs {
		assert.True(t, isBoolean(s), "should be boolean: %q", s)
	}
	for _, s := range falseInputs {
		assert.False(t, isBoolean(s), "should not be boolean: %q", s)
	}
}

func TestInferColumnType_Bool(t *testing.T) {
	rows := [][]string{{"true"}, {"false"}, {"true"}}
	assert.Equal(t, "bool", inferColumnType(rows, 0))
}

func TestInferColumnType_Integer(t *testing.T) {
	rows := [][]string{{"123"}, {"456"}, {"789"}}
	assert.Equal(t, "integer", inferColumnType(rows, 0))
}

func TestInferColumnType_Double(t *testing.T) {
	rows := [][]string{{"1.5"}, {"2.7"}, {"3.9"}}
	assert.Equal(t, "double", inferColumnType(rows, 0))
}

func TestInferColumnType_String(t *testing.T) {
	rows := [][]string{{"alice"}, {"bob"}, {"charlie"}}
	assert.Equal(t, "string", inferColumnType(rows, 0))
}

func TestInferColumnType_Timestamp(t *testing.T) {
	rows := [][]string{{"2024-03-13"}, {"2024-03-14"}, {"2024-03-15"}}
	assert.Equal(t, "timestamp", inferColumnType(rows, 0))
}

func TestExtractFirstLine(t *testing.T) {
	line, err := extractFirstLine([]byte("header\nrow1"))
	assert.NoError(t, err)
	assert.Equal(t, "header", line)
}

func TestExtractFirstLine_NoLineEnding(t *testing.T) {
	_, err := extractFirstLine([]byte("only one line without newline"))
	assert.Error(t, err)
}

func TestCountLines(t *testing.T) {
	assert.Equal(t, 0, countLines([]byte("hello")))
	assert.Equal(t, 1, countLines([]byte("a\nb")))
	assert.Equal(t, 3, countLines([]byte("a\nb\nc\n")))
}

func TestNormalizeLineEndings(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "LF only (no change)", input: "a\nb\nc\n", want: "a\nb\nc\n"},
		{name: "bare CR", input: "a\rb\rc\r", want: "a\nb\nc\n"},
		{name: "CRLF", input: "a\r\nb\r\nc\r\n", want: "a\nb\nc\n"},
		{name: "mixed CR and CRLF", input: "a\rb\r\nc\r", want: "a\nb\nc\n"},
		{name: "no line endings", input: "abc", want: "abc"},
		{name: "empty", input: "", want: ""},
		{name: "consecutive bare CR", input: "a\r\rb", want: "a\n\nb"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeLineEndings([]byte(tt.input))
			assert.Equal(t, tt.want, string(got))
		})
	}
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
