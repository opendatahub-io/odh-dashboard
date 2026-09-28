package kubernetes

import (
	"log/slog"
	"net/http"
	"testing"

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
