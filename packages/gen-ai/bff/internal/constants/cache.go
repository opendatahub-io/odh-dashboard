package constants

import "time"

// Cache related constants
const (
	// DefaultCleanupInterval is how often expired cache entries are removed
	DefaultCleanupInterval = 10 * time.Minute

	// CacheAccessTokensCategory is the cache category for storing MaaS access tokens
	CacheAccessTokensCategory = "access_tokens"
)
