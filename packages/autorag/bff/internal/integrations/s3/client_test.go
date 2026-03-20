package s3

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func newTestClient() *RealS3Client {
	return &RealS3Client{options: S3ClientOptions{DevMode: false}}
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
