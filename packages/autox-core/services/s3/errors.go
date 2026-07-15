package s3

import (
	"context"
	"errors"
	"net"
)

// Sentinel errors for S3 operations.
var (
	// ErrEndpointValidation is returned when the S3 endpoint fails URL or SSRF validation.
	// Use errors.Is to classify client creation failures.
	ErrEndpointValidation = errors.New("endpoint validation failed")

	// ErrObjectAlreadyExists is returned by UploadObject when the object key already exists.
	// Uploads use S3 conditional create (If-None-Match: *): 412 Precondition Failed or 409 ConditionalRequestConflict.
	ErrObjectAlreadyExists = errors.New("s3 object already exists at key")

	// ErrMaxCollisionsExceeded is returned by ResolveNonCollidingKey when all suffix
	// attempts are exhausted without finding a free object key.
	ErrMaxCollisionsExceeded = errors.New("max collision attempts exceeded")

	// ErrObjectNotFound is returned when an S3 object key does not exist.
	ErrObjectNotFound = errors.New("s3 object not found")

	// ErrBucketNotFound is returned when the S3 bucket does not exist.
	ErrBucketNotFound = errors.New("s3 bucket not found")

	// ErrAccessDenied is returned when the S3 credentials lack permission for the operation.
	ErrAccessDenied = errors.New("s3 access denied")

	// ErrInvalidKey is returned when an S3 object key contains prohibited sequences
	// (null bytes, path traversal patterns, or control characters).
	ErrInvalidKey = errors.New("invalid S3 object key")
)

// IsConnectivityError reports whether err is a pre-request network failure reaching the S3
// endpoint: context deadline exceeded, DNS failure, dial timeout, connection refused, or
// a closed connection.
//
// Does NOT cover post-connection errors such as TLS handshake failures or mid-request
// connection resets — those are surfaced as generic errors.
//
// Handlers use this to return 503 Service Unavailable instead of 500 Internal Server Error
// when the S3 endpoint is unreachable (common in air-gapped or misconfigured environments).
func IsConnectivityError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	if errors.Is(err, net.ErrClosed) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}
	var opErr *net.OpError
	if errors.As(err, &opErr) && opErr.Op == "dial" {
		return true
	}
	var dnsErr *net.DNSError
	return errors.As(err, &dnsErr)
}
