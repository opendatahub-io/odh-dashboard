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
)
