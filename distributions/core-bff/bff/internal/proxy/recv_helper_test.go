package proxy

import (
	"testing"
	"time"
)

// recvWithin returns the next value from ch, failing the test if none arrives
// within five seconds (for example, when the proxy rejects the request before
// the upstream handler runs).
func recvWithin[T any](t *testing.T, ch <-chan T) T {
	t.Helper()
	select {
	case v := <-ch:
		return v
	case <-time.After(5 * time.Second):
		var zero T
		t.Fatalf("no upstream observation within 5s: the request did not reach the upstream handler")
		return zero
	}
}
