package pgvector

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConnection_IsConfigured(t *testing.T) {
	t.Run("empty host means not configured", func(t *testing.T) {
		c := Connection{}
		assert.False(t, c.IsConfigured())
	})

	t.Run("host set means configured", func(t *testing.T) {
		c := Connection{Host: "pg.svc.cluster.local"}
		assert.True(t, c.IsConfigured())
	})
}
