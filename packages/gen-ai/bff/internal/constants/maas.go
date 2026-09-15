package constants

import "time"

// MaaS (Model as a Service) related constants
const (
	// MaaSProviderPrefix is the prefix used to identify MaaS providers in LlamaStack configurations
	MaaSProviderPrefix = "maas-"

	// MaaSTokenTTLString is the time-to-live for MaaS tokens as a string (used in API requests)
	MaaSTokenTTLString = "30m"

	// MaaSTokenTTLDuration is the time-to-live for MaaS tokens as a duration (used for caching)
	MaaSTokenTTLDuration = 30 * time.Minute

	// MaaSReturnAllModelsHeader is the header name for requesting enriched model details from MaaS BFF
	MaaSReturnAllModelsHeader = "X-MaaS-Return-All-Models"

	// MaaSSubscriptionHeader is the HTTP header used to forward the MaaS subscription
	// name from OGX to the BFF proxy (via forward_headers config). The proxy uses it
	// to issue a properly-scoped ephemeral token per request.
	MaaSSubscriptionHeader = "X-MaaS-Subscription"

	// InferenceModelSourceTypeHeader identifies inference requests forwarded by
	// OGX. MaaS model IDs are unique and no longer require a maas- routing prefix,
	// so the chat proxy uses this header to select MaaS credential and endpoint
	// resolution. It is intentionally inference-specific: embeddings may use a
	// different source and do not use the passthrough inference provider.
	InferenceModelSourceTypeHeader = "X-Inference-Model-Source-Type"
)
