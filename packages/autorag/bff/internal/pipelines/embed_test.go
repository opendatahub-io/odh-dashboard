package pipelines

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReplaceImageRef(t *testing.T) {
	oldDigest := "a10e28c36726add59cce2e59435c57bab22795baf979bdc531fd7b40f06cc9d6"
	newDigest := "7f481301e8a2a5142aaf3a7d757886b936641342fed0cbd16a4b3d44692f4987"

	t.Run("replaces all occurrences matching the pattern", func(t *testing.T) {
		yaml := []byte("image: registry.redhat.io/rhoai/odh-autorag-rhel9@sha256:" + oldDigest + "\nother: stuff\nimage: registry.redhat.io/rhoai/odh-autorag-rhel9@sha256:" + oldDigest + "\n")
		newImage := "registry.redhat.io/rhoai/odh-autorag-rhel9@sha256:" + newDigest
		result := ReplaceImageRef(yaml, AutoRAGImagePattern, newImage)
		assert.NotContains(t, string(result), oldDigest)
		assert.Equal(t, 2, strings.Count(string(result), newImage))
	})

	t.Run("matches any 64-char hex digest", func(t *testing.T) {
		yaml := []byte("image: registry.redhat.io/rhoai/odh-autorag-rhel9@sha256:" + oldDigest + "\n")
		newImage := "registry.redhat.io/rhoai/odh-autorag-rhel9@sha256:" + newDigest
		result := ReplaceImageRef(yaml, AutoRAGImagePattern, newImage)
		assert.Contains(t, string(result), newDigest)
		assert.NotContains(t, string(result), oldDigest)
	})

	t.Run("no match returns YAML unchanged", func(t *testing.T) {
		yaml := []byte("image: some-other-image@sha256:" + oldDigest + "\n")
		result := ReplaceImageRef(yaml, AutoRAGImagePattern, "new-image@sha256:"+newDigest)
		assert.Equal(t, string(yaml), string(result))
	})
}
