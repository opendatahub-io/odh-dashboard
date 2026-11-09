package kubernetes

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExtractRequestIdentity(t *testing.T) {
	factory := NewTokenClientFactory(slog.Default(), config.EnvConfig{
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		AuthTokenPrefix: config.DefaultAuthTokenPrefix,
	}, nil)
	t.Cleanup(factory.Stop)

	t.Run("extracts token from primary header", func(t *testing.T) {
		h := http.Header{}
		h.Set("x-forwarded-access-token", "my-jwt-token")

		id, err := factory.ExtractRequestIdentity(h)
		require.NoError(t, err)
		assert.Equal(t, "my-jwt-token", id.Token)
	})

	t.Run("falls back to Authorization Bearer when primary header is absent", func(t *testing.T) {
		h := http.Header{}
		h.Set("Authorization", "Bearer ogx-forwarded-jwt")

		id, err := factory.ExtractRequestIdentity(h)
		require.NoError(t, err)
		assert.Equal(t, "ogx-forwarded-jwt", id.Token)
	})

	t.Run("prefers primary header over Authorization", func(t *testing.T) {
		h := http.Header{}
		h.Set("x-forwarded-access-token", "primary-token")
		h.Set("Authorization", "Bearer fallback-token")

		id, err := factory.ExtractRequestIdentity(h)
		require.NoError(t, err)
		assert.Equal(t, "primary-token", id.Token)
	})

	t.Run("returns error when neither header is present", func(t *testing.T) {
		h := http.Header{}

		_, err := factory.ExtractRequestIdentity(h)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "missing required Header")
	})

	t.Run("ignores Authorization header without Bearer prefix", func(t *testing.T) {
		h := http.Header{}
		h.Set("Authorization", "Basic dXNlcjpwYXNz")

		_, err := factory.ExtractRequestIdentity(h)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "missing required Header")
	})

	t.Run("trims whitespace from Bearer token", func(t *testing.T) {
		h := http.Header{}
		h.Set("Authorization", "Bearer   spaced-token  ")

		id, err := factory.ExtractRequestIdentity(h)
		require.NoError(t, err)
		assert.Equal(t, "spaced-token", id.Token)
	})
}

// TestTokenClientFactoryOTelRetry verifies that the factory retries OTel
// config manager discovery in the background when it was unavailable at
// startup (e.g. the platform collector or MLflow CR appears after the BFF
// starts), and that Stop cancels the retry.
func TestTokenClientFactoryOTelRetry(t *testing.T) {
	interval := 10 * time.Millisecond

	newFactory := func(attempts *atomic.Int32, succeedAt int32) *TokenClientFactory {
		creator := func(context.Context) (*otelConfigManager, error) {
			if n := attempts.Add(1); n < succeedAt {
				return nil, nil
			}
			return &otelConfigManager{}, nil
		}
		f := newTokenClientFactory(slog.Default(), config.EnvConfig{
			AuthMethod:      config.AuthMethodUser,
			AuthTokenHeader: config.DefaultAuthTokenHeader,
			AuthTokenPrefix: config.DefaultAuthTokenPrefix,
		}, creator, interval, interval)
		return f
	}

	t.Run("initializes manager after collector appears", func(t *testing.T) {
		attempts := &atomic.Int32{}
		f := newFactory(attempts, 3)
		defer f.Stop()

		require.Eventually(t, func() bool {
			return f.getOTelConfigManager() != nil
		}, 5*time.Second, 5*time.Millisecond, "manager should be set after successful retry")

		// The retry goroutine stops after success; no further attempts occur.
		attemptsAtSuccess := attempts.Load()
		time.Sleep(5 * interval)
		assert.LessOrEqual(t, attempts.Load(), attemptsAtSuccess)
	})

	t.Run("manager stays nil while discovery keeps failing", func(t *testing.T) {
		attempts := &atomic.Int32{}
		f := newFactory(attempts, 1<<30) // never succeeds
		defer f.Stop()

		require.Eventually(t, func() bool {
			return attempts.Load() > 1
		}, time.Second, interval, "retry loop should have run")
		assert.Nil(t, f.getOTelConfigManager())
	})

	t.Run("retries discovery errors", func(t *testing.T) {
		var attempts atomic.Int32
		f := newTokenClientFactory(slog.Default(), config.EnvConfig{}, func(context.Context) (*otelConfigManager, error) {
			if attempts.Add(1) < 3 {
				return nil, errors.New("API temporarily unavailable")
			}
			return &otelConfigManager{}, nil
		}, interval, interval)
		t.Cleanup(f.Stop)

		require.Eventually(t, func() bool {
			return f.getOTelConfigManager() != nil
		}, time.Second, interval)
		assert.Equal(t, int32(3), attempts.Load())
	})

	t.Run("uses fast first retry then steady interval", func(t *testing.T) {
		var attempts atomic.Int32
		// Steady interval is far longer than the test timeout; a second
		// attempt can only happen if the first retry uses the fast delay.
		f := newTokenClientFactory(slog.Default(), config.EnvConfig{}, func(context.Context) (*otelConfigManager, error) {
			attempts.Add(1)
			return nil, nil
		}, 5*time.Millisecond, 500*time.Millisecond)
		t.Cleanup(f.Stop)

		require.Eventually(t, func() bool {
			return attempts.Load() >= 2
		}, 100*time.Millisecond, time.Millisecond,
			"first retry should fire after the fast delay rather than the steady interval")

		assert.Never(t, func() bool {
			return attempts.Load() > 2
		}, 50*time.Millisecond, time.Millisecond,
			"subsequent retries must not keep using the fast delay")

		require.Eventually(t, func() bool {
			return attempts.Load() >= 3
		}, 2*time.Second, 5*time.Millisecond,
			"discovery should continue retrying at the steady interval")
	})

	t.Run("initial success needs no retry worker", func(t *testing.T) {
		attempts := &atomic.Int32{}
		f := newFactory(attempts, 1)
		t.Cleanup(f.Stop)
		require.NotNil(t, f.getOTelConfigManager())
		select {
		case <-f.otelDone:
		default:
			t.Fatal("initial success must mark discovery complete")
		}
		f.Stop()
		assert.Equal(t, int32(1), attempts.Load())
	})

	t.Run("mock mode skips all tracing discovery", func(t *testing.T) {
		attempts := &atomic.Int32{}
		f := newTokenClientFactory(slog.Default(), config.EnvConfig{
			AuthMethod:    config.AuthMethodUser, // Real user lookup must not initialize tracing.
			MockK8sClient: true,
		}, func(context.Context) (*otelConfigManager, error) {
			attempts.Add(1)
			return nil, nil
		}, interval, interval)
		t.Cleanup(f.Stop)

		require.Zero(t, attempts.Load(), "mock mode must not perform synchronous discovery")
		assert.Never(t, func() bool {
			return attempts.Load() > 0
		}, 5*interval, interval, "mock mode must not start background discovery")
		assert.Nil(t, f.getOTelConfigManager())
		assert.Nil(t, f.SAClient)
		select {
		case <-f.otelDone:
		default:
			t.Fatal("mock mode must mark discovery complete without starting a worker")
		}
		f.Stop()
	})

	t.Run("stop cancels in-flight discovery and waits for worker exit", func(t *testing.T) {
		var attempts atomic.Int32
		discovering := make(chan struct{})
		cancelled := make(chan struct{})
		release := make(chan struct{})
		var releaseOnce sync.Once
		releaseWorker := func() { releaseOnce.Do(func() { close(release) }) }
		f := newTokenClientFactory(slog.Default(), config.EnvConfig{}, func(ctx context.Context) (*otelConfigManager, error) {
			if attempts.Add(1) == 1 {
				return nil, nil
			}
			close(discovering)
			<-ctx.Done()
			close(cancelled)
			<-release
			// Even a result returned after cancellation must not be published.
			return &otelConfigManager{}, nil
		}, interval, interval)
		t.Cleanup(func() {
			releaseWorker()
			f.Stop()
		})

		select {
		case <-discovering:
		case <-time.After(5 * time.Second):
			t.Fatal("background discovery did not start")
		}
		// Ensure another tick can be ready at the same time as cancellation.
		time.Sleep(2 * interval)
		stopped := make(chan struct{}, 2)
		for range 2 {
			go func() {
				f.Stop()
				stopped <- struct{}{}
			}()
		}
		select {
		case <-cancelled:
		case <-time.After(5 * time.Second):
			t.Fatal("Stop did not cancel in-flight discovery")
		}
		select {
		case <-stopped:
			t.Fatal("Stop returned before its discovery worker exited")
		default:
		}

		releaseWorker()
		for range 2 {
			select {
			case <-stopped:
			case <-time.After(5 * time.Second):
				t.Fatal("Stop did not wait for worker completion")
			}
		}
		assert.Nil(t, f.getOTelConfigManager())
		assert.Equal(t, int32(2), attempts.Load())
	})

	t.Run("stop cancels the retry loop", func(t *testing.T) {
		attempts := &atomic.Int32{}
		f := newFactory(attempts, 1<<30) // never succeeds

		require.Eventually(t, func() bool {
			return attempts.Load() > 1
		}, time.Second, interval)
		f.Stop()
		stopped := attempts.Load()
		assert.Never(t, func() bool {
			return attempts.Load() != stopped
		}, 5*interval, interval, "no attempts after Stop")

		// Stop is safe to call multiple times.
		f.Stop()
	})
}
