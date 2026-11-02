package kubernetes

import (
	"log/slog"
	"net/http"
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
		creator := func() (*otelConfigManager, error) {
			if n := attempts.Add(1); n < succeedAt {
				return nil, nil
			}
			return &otelConfigManager{}, nil
		}
		f := newTokenClientFactory(slog.Default(), config.EnvConfig{
			AuthMethod:      config.AuthMethodUser,
			AuthTokenHeader: config.DefaultAuthTokenHeader,
			AuthTokenPrefix: config.DefaultAuthTokenPrefix,
		}, creator, interval)
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

		time.Sleep(50 * time.Millisecond)
		assert.Nil(t, f.getOTelConfigManager())
		assert.Greater(t, attempts.Load(), int32(0), "retry loop should have run")
	})

	t.Run("stop cancels the retry loop", func(t *testing.T) {
		attempts := &atomic.Int32{}
		f := newFactory(attempts, 1<<30) // never succeeds

		time.Sleep(30 * time.Millisecond)
		f.Stop()
		stopped := attempts.Load()
		time.Sleep(50 * time.Millisecond)
		assert.LessOrEqual(t, attempts.Load(), stopped+1, "no attempts after Stop")

		// Stop is safe to call multiple times.
		f.Stop()
	})
}
