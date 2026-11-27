package api

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/require"
)

// The spec is embedded and parsed at startup, so a malformed edit must fail a
// test rather than a container.
func TestOpenAPISpecLoadsAndValidates(t *testing.T) {
	handler, err := NewOpenAPIHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.NoError(t, err)
	require.NotNil(t, handler)

	// Loading only parses the document; Validate checks it against the
	// OpenAPI constraints (references, schema shapes, required fields).
	require.NoError(t, handler.spec.Validate(context.Background()))
}
