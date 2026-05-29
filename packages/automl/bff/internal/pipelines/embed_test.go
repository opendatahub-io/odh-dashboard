package pipelines

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReplaceImageRef(t *testing.T) {
	oldDigest := "77d5222d8b4f10828bfeafb692de7348e28c711b45ca3f70854e407bf651a6fd"
	newDigest := "1b6a063cdde3bf91cd10f5a2be999bd171d76892617444c49384828e326ae9ce"

	t.Run("replaces all occurrences matching the pattern", func(t *testing.T) {
		yaml := []byte("image: registry.redhat.io/rhoai/odh-automl-rhel9@sha256:" + oldDigest + "\nother: stuff\nimage: registry.redhat.io/rhoai/odh-automl-rhel9@sha256:" + oldDigest + "\n")
		newImage := "registry.redhat.io/rhoai/odh-automl-rhel9@sha256:" + newDigest
		result := ReplaceImageRef(yaml, AutoMLImagePattern, newImage)
		assert.NotContains(t, string(result), oldDigest)
		assert.Equal(t, 2, strings.Count(string(result), newImage))
	})

	t.Run("matches any 64-char hex digest", func(t *testing.T) {
		yaml := []byte("image: registry.redhat.io/rhoai/odh-automl-rhel9@sha256:" + oldDigest + "\n")
		newImage := "registry.redhat.io/rhoai/odh-automl-rhel9@sha256:" + newDigest
		result := ReplaceImageRef(yaml, AutoMLImagePattern, newImage)
		assert.Contains(t, string(result), newDigest)
		assert.NotContains(t, string(result), oldDigest)
	})

	t.Run("no match returns YAML unchanged", func(t *testing.T) {
		yaml := []byte("image: some-other-image@sha256:" + oldDigest + "\n")
		result := ReplaceImageRef(yaml, AutoMLImagePattern, "new-image@sha256:"+newDigest)
		assert.Equal(t, string(yaml), string(result))
	})
}
