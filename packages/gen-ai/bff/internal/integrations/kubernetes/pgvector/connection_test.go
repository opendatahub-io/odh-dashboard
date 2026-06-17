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

func TestConnection_DSN(t *testing.T) {
	c := Connection{
		Host:     "pg.svc.cluster.local",
		Port:     5432,
		DB:       "vectordb",
		User:     "vectoruser",
		Password: "secret",
	}
	assert.Equal(t, "postgresql://vectoruser:secret@pg.svc.cluster.local:5432/vectordb", c.DSN())
}
