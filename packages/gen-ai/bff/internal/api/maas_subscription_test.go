package api

import (
	"strings"

	. "github.com/onsi/ginkgo/v2"
	"github.com/stretchr/testify/assert"
)

var _ = Describe("MaaS subscription helpers", func() {
	It("rejects oversized subscriptions and subscriptions containing a pipe", func() {
		assert.NoError(GinkgoT(), validateMaaSSubscription("valid/subscription"))
		assert.Error(GinkgoT(), validateMaaSSubscription(strings.Repeat("a", maxMaaSSubscriptionLength+1)))
		assert.Error(GinkgoT(), validateMaaSSubscription("invalid|subscription"))
	})

	It("generates unambiguous cache keys", func() {
		assert.NotEqual(GinkgoT(), maasTokenCacheKey("model|one", "two"), maasTokenCacheKey("model", "one|two"))
		assert.Equal(GinkgoT(), maasTokenCacheKey("model", "subscription"), maasTokenCacheKey("model", "subscription"))
	})
})
