package constants

const (
	ApiPathPrefix = "/api/v1"

	// Tiers routes
	TiersListPath  = ApiPathPrefix + "/tiers"
	TierNamePath   = ApiPathPrefix + "/tier/:name"
	TierCreatePath = ApiPathPrefix + "/tier"

	// API Keys routes
	APIKeyCreatePath     = ApiPathPrefix + "/api-keys"
	APIKeySearchPath     = ApiPathPrefix + "/api-keys/search"
	APIKeyBulkRevokePath = ApiPathPrefix + "/api-keys/bulk-revoke"
	APIKeyByIDPath       = ApiPathPrefix + "/api-keys/:id"
)
