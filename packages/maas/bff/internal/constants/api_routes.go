package constants

const (
	ApiPathPrefix = "/api/v1"

	// Tiers routes
	TiersListPath  = ApiPathPrefix + "/tiers"
	TierNamePath   = ApiPathPrefix + "/tier/:name"
	TierCreatePath = ApiPathPrefix + "/tier"

	// API Keys routes
	APIKeysListPath   = ApiPathPrefix + "/api-keys"
	APIKeyByIDPath    = ApiPathPrefix + "/api-key/:id"
	APIKeyCreatePath  = ApiPathPrefix + "/api-key"
	APIKeysDeletePath = ApiPathPrefix + "/api-keys"

	// Inter-BFF token routes (for Gen-AI BFF playground sessions)
	// These endpoints are called by Gen-AI BFF to issue ephemeral tokens
	TokensPath = ApiPathPrefix + "/tokens"
)
