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

	// Access review
	IsMaasAdminPath = ApiPathPrefix + "/is-maas-admin"

	// Subscriptions passthrough (maas-api /v1/subscriptions)
	SubscriptionsPassthroughPath = ApiPathPrefix + "/subscriptions"

	// General MaaS routes
	SubscriptionPolicyFormDataPath = ApiPathPrefix + "/subscription-policy-form-data"

	// Subscription routes
	SubscriptionListPath   = ApiPathPrefix + "/all-subscriptions"
	SubscriptionInfoPath   = ApiPathPrefix + "/subscription-info/:name"
	SubscriptionCreatePath = ApiPathPrefix + "/new-subscription"
	SubscriptionUpdatePath = ApiPathPrefix + "/update-subscription/:name"
	SubscriptionDeletePath = ApiPathPrefix + "/subscription/:name"

	// Policy routes
	PolicyListPath   = ApiPathPrefix + "/all-policies"
	PolicyViewPath   = ApiPathPrefix + "/view-policy/:name"
	PolicyCreatePath = ApiPathPrefix + "/new-policy"
	PolicyUpdatePath = ApiPathPrefix + "/update-policy/:name"
	PolicyDeletePath = ApiPathPrefix + "/delete-policy/:name"

	// MaaSModelRef routes
	MaaSModelRefCreatePath = ApiPathPrefix + "/maasmodel"
	MaaSModelRefUpdatePath = ApiPathPrefix + "/maasmodel/:namespace/:name"
	MaaSModelRefDeletePath = ApiPathPrefix + "/maasmodel/:namespace/:name"

	// Inter-BFF token routes (stub for Gen-AI BFF inter-BFF communication testing)
	// These endpoints are called by Gen-AI BFF to issue/revoke ephemeral tokens
	TokensPath = ApiPathPrefix + "/tokens"
)
