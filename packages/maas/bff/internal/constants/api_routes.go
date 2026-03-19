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

	// Subscription routes
	SubscriptionListPath     = ApiPathPrefix + "/all-subscriptions"
	SubscriptionInfoPath     = ApiPathPrefix + "/subscription-info/:name"
	SubscriptionFormDataPath = ApiPathPrefix + "/new-subscription"
	SubscriptionCreatePath   = ApiPathPrefix + "/new-subscription"
	SubscriptionUpdatePath   = ApiPathPrefix + "/update-subscription/:name"
	SubscriptionDeletePath   = ApiPathPrefix + "/subscription/:name"

	// MaaSModelRef routes
	MaaSModelRefCreatePath = ApiPathPrefix + "/maasmodel"
	MaaSModelRefUpdatePath = ApiPathPrefix + "/maasmodel/:namespace/:name"
	MaaSModelRefDeletePath = ApiPathPrefix + "/maasmodel/:namespace/:name"
)
