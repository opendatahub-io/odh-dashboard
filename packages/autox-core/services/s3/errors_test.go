package s3

import (
	"context"
	"fmt"
	"net"
	"testing"
)

func TestIsConnectivityError(t *testing.T) {
	t.Run("nil", func(t *testing.T) {
		if IsConnectivityError(nil) {
			t.Error("expected false for nil")
		}
	})

	t.Run("deadline exceeded", func(t *testing.T) {
		if !IsConnectivityError(context.DeadlineExceeded) {
			t.Error("expected true for DeadlineExceeded")
		}
	})

	t.Run("wrapped deadline exceeded", func(t *testing.T) {
		err := fmt.Errorf("outer: %w", context.DeadlineExceeded)
		if !IsConnectivityError(err) {
			t.Error("expected true for wrapped DeadlineExceeded")
		}
	})

	t.Run("net.ErrClosed", func(t *testing.T) {
		if !IsConnectivityError(net.ErrClosed) {
			t.Error("expected true for net.ErrClosed")
		}
	})

	t.Run("DNS error", func(t *testing.T) {
		err := &net.DNSError{Err: "no such host", Name: "bad.example.com"}
		if !IsConnectivityError(err) {
			t.Error("expected true for DNS error")
		}
	})

	t.Run("dial error", func(t *testing.T) {
		err := &net.OpError{Op: "dial", Err: fmt.Errorf("connection refused")}
		if !IsConnectivityError(err) {
			t.Error("expected true for dial error")
		}
	})

	t.Run("non-dial OpError", func(t *testing.T) {
		err := &net.OpError{Op: "read", Err: fmt.Errorf("reset")}
		if IsConnectivityError(err) {
			t.Error("expected false for non-dial OpError")
		}
	})

	t.Run("timeout error", func(t *testing.T) {
		err := &timeoutError{msg: "i/o timeout"}
		if !IsConnectivityError(err) {
			t.Error("expected true for timeout error")
		}
	})

	t.Run("generic error", func(t *testing.T) {
		if IsConnectivityError(fmt.Errorf("something else")) {
			t.Error("expected false for generic error")
		}
	})
}

type timeoutError struct{ msg string }

func (e *timeoutError) Error() string   { return e.msg }
func (e *timeoutError) Timeout() bool   { return true }
func (e *timeoutError) Temporary() bool { return true }
