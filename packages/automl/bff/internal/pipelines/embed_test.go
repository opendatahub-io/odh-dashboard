package pipelines

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReplaceImages(t *testing.T) {
	t.Run("replaces all occurrences of the image", func(t *testing.T) {
		yaml := []byte("image: old-image@sha256:abc\nother: stuff\nimage: old-image@sha256:abc\n")
		result := ReplaceImages(yaml, map[string]string{
			"old-image@sha256:abc": "new-image@sha256:def",
		})
		assert.NotContains(t, string(result), "old-image@sha256:abc")
		assert.Contains(t, string(result), "new-image@sha256:def")
		assert.Equal(t, "image: new-image@sha256:def\nother: stuff\nimage: new-image@sha256:def\n", string(result))
	})

	t.Run("empty overrides returns YAML unchanged", func(t *testing.T) {
		yaml := []byte("image: old-image@sha256:abc\n")
		result := ReplaceImages(yaml, map[string]string{})
		assert.Equal(t, yaml, result)
	})

	t.Run("override with image not present returns YAML unchanged", func(t *testing.T) {
		yaml := []byte("image: old-image@sha256:abc\n")
		result := ReplaceImages(yaml, map[string]string{
			"nonexistent-image@sha256:xyz": "new-image@sha256:def",
		})
		assert.Equal(t, string(yaml), string(result))
	})

	t.Run("nil overrides returns YAML unchanged", func(t *testing.T) {
		yaml := []byte("image: old-image@sha256:abc\n")
		result := ReplaceImages(yaml, nil)
		assert.Equal(t, yaml, result)
	})
}
