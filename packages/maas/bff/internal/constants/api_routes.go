package constants

const (
	ApiPathPrefix = "/api/v1"

	// Tiers routes
	TiersListPath  = ApiPathPrefix + "/tiers"
	TierNamePath   = ApiPathPrefix + "/tier/:name"
	TierCreatePath = ApiPathPrefix + "/tier"

	// API Keys routes
	APIKeysListPath   = ApiPathPrefix + "/api-keys"
	APIKeyByIDPath    = ApiPathPrefix + "/api-keys/:id"
	APIKeyCreatePath  = ApiPathPrefix + "/api-key"
	APIKeysDeletePath = ApiPathPrefix + "/api-keys"
)
