package api

import (
	"io"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/require"
)

// The spec is embedded and parsed at startup, so a malformed edit must fail a
// test rather than a container.
func TestOpenAPISpecLoadsAndValidates(t *testing.T) {
	_, err := NewOpenAPIHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.NoError(t, err)
}
