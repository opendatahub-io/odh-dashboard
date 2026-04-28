package api

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestS3PostMaxTotalBodyBytes_UsesDefaultWhenNotConfigured tests that the default
// maximum total body size is used when no custom value is configured.
func TestS3PostMaxTotalBodyBytes_UsesDefaultWhenNotConfigured(t *testing.T) {
	app := &App{
		s3PostMaxRequestBodyBytes: 0, // Not configured
	}

	result := app.s3PostMaxTotalBodyBytes()

	// Should return default: s3MaxUploadFileBytes (32 MiB) + s3MultipartMaxEnvelopeBytes (64 MiB) = 96 MiB
	expected := s3MaxUploadFileBytes + s3MultipartMaxEnvelopeBytes
	assert.Equal(t, expected, result, "Should use default max total body bytes")
	assert.Equal(t, int64(96<<20), result, "Default should be 96 MiB (32 MiB file + 64 MiB envelope)")
}

// TestS3PostMaxTotalBodyBytes_UsesConfiguredValue tests that a custom configured
// maximum is respected.
func TestS3PostMaxTotalBodyBytes_UsesConfiguredValue(t *testing.T) {
	customMax := int64(128 << 20) // 128 MiB
	app := &App{
		s3PostMaxRequestBodyBytes: customMax,
	}

	result := app.s3PostMaxTotalBodyBytes()

	assert.Equal(t, customMax, result, "Should use configured max total body bytes")
	assert.Equal(t, int64(128<<20), result, "Should be 128 MiB as configured")
}

// TestS3PostMaxTotalBodyBytes_NilApp tests that the function handles nil app gracefully.
func TestS3PostMaxTotalBodyBytes_NilApp(t *testing.T) {
	var app *App = nil

	result := app.s3PostMaxTotalBodyBytes()

	// Should return default even with nil app
	expected := s3MaxUploadFileBytes + s3MultipartMaxEnvelopeBytes
	assert.Equal(t, expected, result, "Should use default max total body bytes even with nil app")
}

// TestS3PostDeclaredBodyExceedsLimit_BelowLimit tests that requests with Content-Length
// below the limit return false.
func TestS3PostDeclaredBodyExceedsLimit_BelowLimit(t *testing.T) {
	app := &App{
		s3PostMaxRequestBodyBytes: 0, // Use default (96 MiB)
	}

	// Create request with Content-Length well below limit
	req := &http.Request{
		ContentLength: 10 << 20, // 10 MiB
	}

	result := app.s3PostDeclaredBodyExceedsLimit(req)

	assert.False(t, result, "Request with 10 MiB Content-Length should not exceed 96 MiB limit")
}

// TestS3PostDeclaredBodyExceedsLimit_AtLimit tests that requests exactly at the limit
// do not exceed it.
func TestS3PostDeclaredBodyExceedsLimit_AtLimit(t *testing.T) {
	maxSize := int64(96 << 20) // 96 MiB
	app := &App{
		s3PostMaxRequestBodyBytes: maxSize,
	}

	// Create request with Content-Length exactly at limit
	req := &http.Request{
		ContentLength: maxSize,
	}

	result := app.s3PostDeclaredBodyExceedsLimit(req)

	assert.False(t, result, "Request with Content-Length exactly at limit should not exceed it")
}

// TestS3PostDeclaredBodyExceedsLimit_ExceedsLimit tests that requests above the limit
// are correctly identified.
func TestS3PostDeclaredBodyExceedsLimit_ExceedsLimit(t *testing.T) {
	app := &App{
		s3PostMaxRequestBodyBytes: 0, // Use default (96 MiB)
	}

	// Create request with Content-Length exceeding limit
	req := &http.Request{
		ContentLength: (96 << 20) + 1, // 96 MiB + 1 byte
	}

	result := app.s3PostDeclaredBodyExceedsLimit(req)

	assert.True(t, result, "Request with Content-Length of 96 MiB + 1 byte should exceed 96 MiB limit")
}

// TestS3PostDeclaredBodyExceedsLimit_ExceedsLimitSignificantly tests that significantly
// oversized requests are rejected.
func TestS3PostDeclaredBodyExceedsLimit_ExceedsLimitSignificantly(t *testing.T) {
	app := &App{
		s3PostMaxRequestBodyBytes: 0, // Use default (96 MiB)
	}

	// Create request with Content-Length way over limit
	req := &http.Request{
		ContentLength: 500 << 20, // 500 MiB
	}

	result := app.s3PostDeclaredBodyExceedsLimit(req)

	assert.True(t, result, "Request with 500 MiB Content-Length should exceed 96 MiB limit")
}

// TestS3PostDeclaredBodyExceedsLimit_UnknownLength tests that requests without
// Content-Length (chunked encoding) return false.
func TestS3PostDeclaredBodyExceedsLimit_UnknownLength(t *testing.T) {
	app := &App{
		s3PostMaxRequestBodyBytes: 0, // Use default (96 MiB)
	}

	// Create request with unknown Content-Length (chunked encoding)
	req := &http.Request{
		ContentLength: -1, // Unknown length
	}

	result := app.s3PostDeclaredBodyExceedsLimit(req)

	assert.False(t, result, "Request with unknown Content-Length should return false (not rejected at header check)")
}

// TestS3PostDeclaredBodyExceedsLimit_ZeroLength tests that requests with zero
// Content-Length return false.
func TestS3PostDeclaredBodyExceedsLimit_ZeroLength(t *testing.T) {
	app := &App{
		s3PostMaxRequestBodyBytes: 0, // Use default (96 MiB)
	}

	// Create request with zero Content-Length
	req := &http.Request{
		ContentLength: 0,
	}

	result := app.s3PostDeclaredBodyExceedsLimit(req)

	assert.False(t, result, "Request with zero Content-Length should return false")
}

// TestS3PostDeclaredBodyExceedsLimit_CustomLimit tests that custom configured limits
// are respected in the check.
func TestS3PostDeclaredBodyExceedsLimit_CustomLimit(t *testing.T) {
	customLimit := int64(50 << 20) // 50 MiB custom limit
	app := &App{
		s3PostMaxRequestBodyBytes: customLimit,
	}

	// Below custom limit
	reqBelow := &http.Request{ContentLength: 30 << 20} // 30 MiB
	assert.False(t, app.s3PostDeclaredBodyExceedsLimit(reqBelow),
		"30 MiB request should not exceed 50 MiB custom limit")

	// At custom limit
	reqAt := &http.Request{ContentLength: 50 << 20} // 50 MiB
	assert.False(t, app.s3PostDeclaredBodyExceedsLimit(reqAt),
		"50 MiB request should not exceed 50 MiB custom limit")

	// Above custom limit
	reqAbove := &http.Request{ContentLength: 51 << 20} // 51 MiB
	assert.True(t, app.s3PostDeclaredBodyExceedsLimit(reqAbove),
		"51 MiB request should exceed 50 MiB custom limit")
}

// TestS3MaxUploadFileBytes_Constant tests that the max upload file constant has the expected value.
func TestS3MaxUploadFileBytes_Constant(t *testing.T) {
	assert.Equal(t, int64(32<<20), s3MaxUploadFileBytes,
		"s3MaxUploadFileBytes should be 32 MiB")
}

// TestS3MultipartMaxEnvelopeBytes_Constant tests that the multipart envelope constant has the expected value.
func TestS3MultipartMaxEnvelopeBytes_Constant(t *testing.T) {
	assert.Equal(t, int64(64<<20), s3MultipartMaxEnvelopeBytes,
		"s3MultipartMaxEnvelopeBytes should be 64 MiB")
}

// TestS3ErrorMessages_Constants tests that error message constants are defined correctly.
func TestS3ErrorMessages_Constants(t *testing.T) {
	assert.NotEmpty(t, s3PayloadTooLargeMsg,
		"s3PayloadTooLargeMsg should not be empty")
	assert.Contains(t, s3PayloadTooLargeMsg, "32 MiB",
		"s3PayloadTooLargeMsg should mention the 32 MiB limit")

	assert.NotEmpty(t, s3FilePartTooLargeMsg,
		"s3FilePartTooLargeMsg should not be empty")
	assert.Contains(t, s3FilePartTooLargeMsg, "32 MiB",
		"s3FilePartTooLargeMsg should mention the 32 MiB limit")
}

// TestS3PostMaxTotalBodyBytes_Integration tests the integration between default
// constants and the max total body bytes calculation.
func TestS3PostMaxTotalBodyBytes_Integration(t *testing.T) {
	app := &App{
		s3PostMaxRequestBodyBytes: 0, // Use default
	}

	maxTotalBodyBytes := app.s3PostMaxTotalBodyBytes()

	// Verify the calculation: 32 MiB (file) + 64 MiB (envelope) = 96 MiB
	assert.Equal(t, int64(96<<20), maxTotalBodyBytes,
		"Max total body bytes should be file limit + envelope limit")

	// Verify a request just under the limit is accepted
	reqJustUnder := &http.Request{ContentLength: maxTotalBodyBytes - 1}
	assert.False(t, app.s3PostDeclaredBodyExceedsLimit(reqJustUnder),
		"Request just under limit should not be rejected")

	// Verify a request just over the limit is rejected
	reqJustOver := &http.Request{ContentLength: maxTotalBodyBytes + 1}
	assert.True(t, app.s3PostDeclaredBodyExceedsLimit(reqJustOver),
		"Request just over limit should be rejected")
}
