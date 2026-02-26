package repositories

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPipelineServersRepository_Creation(t *testing.T) {
	t.Run("should create new repository", func(t *testing.T) {
		repo := NewPipelineServersRepository("")
		assert.NotNil(t, repo)
	})
}

// Note: Integration tests for ListPipelineServers would require a full Kubernetes
// environment with DSPipelineApplication CRDs installed. These are better suited
// for end-to-end testing rather than unit tests.
